import { useState, useEffect } from 'react';
import { Check, CreditCard, Banknote, Wallet, MapPin, User, Phone, Mail, ShoppingBag, Loader2 } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { formatCurrency } from '@/lib/format';
import { navigate } from '@/lib/router';
import { supabase } from '@/lib/supabase';
import type { StoreSettings } from '@/types';

export function CheckoutPage() {
  const { items, subtotal, clearCart } = useCart();
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    notes: '',
    paymentMethod: 'cod',
  });

  useEffect(() => {
    supabase.from('store_settings').select('*').maybeSingle().then(({ data }) => {
      if (data) setSettings(data);
    });
  }, []);

  const taxRate = settings?.tax_enabled ? (settings?.tax_rate || 0) : 0;
  const taxAmount = (subtotal * taxRate) / 100;
  const shippingCost = subtotal >= (settings?.free_shipping_threshold || 200) ? 0 : (settings?.shipping_flat_rate || 25);
  const total = subtotal + taxAmount + shippingCost;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) return;

    setLoading(true);

    try {
      // Create or find customer
      let customerId: string | null = null;
      if (form.phone) {
        const { data: existing } = await supabase
          .from('customers')
          .select('id')
          .eq('phone', form.phone)
          .maybeSingle();

        if (existing) {
          customerId = existing.id;
          await supabase.from('customers').update({
            name: form.name,
            email: form.email,
            address: form.address,
            city: form.city,
          }).eq('id', customerId);
        } else {
          const { data: newCust } = await supabase.from('customers').insert({
            name: form.name,
            phone: form.phone,
            email: form.email,
            address: form.address,
            city: form.city,
          }).select('id').single();
          customerId = newCust?.id || null;
        }
      }

      // Generate order number
      const orderNum = `${settings?.order_prefix || 'ORD-'}${Date.now().toString().slice(-8)}`;

      // Create order
      const { data: order, error: orderError } = await supabase.from('orders').insert({
        customer_id: customerId,
        order_number: orderNum,
        status: 'pending',
        payment_status: form.paymentMethod === 'cod' ? 'unpaid' : 'paid',
        payment_method: form.paymentMethod,
        subtotal,
        tax_rate: taxRate,
        tax_amount: taxAmount,
        shipping_cost: shippingCost,
        total,
        shipping_name: form.name,
        shipping_phone: form.phone,
        shipping_address: form.address,
        shipping_city: form.city,
        notes: form.notes,
      }).select('id').single();

      if (orderError) throw orderError;

      // Create order items
      const orderItems = items.map((item) => ({
        order_id: order.id,
        product_id: item.product.id,
        product_name: item.product.name,
        quantity: item.quantity,
        unit_price: item.product.price,
        total_price: item.product.price * item.quantity,
      }));

      await supabase.from('order_items').insert(orderItems);

      // Update stock
      for (const item of items) {
        await supabase.rpc('decrement_stock', { p_product_id: item.product.id, p_quantity: item.quantity });
      }

      // Create invoice
      const invoiceNum = `${settings?.invoice_prefix || 'INV-'}${Date.now().toString().slice(-8)}`;
      await supabase.from('invoices').insert({
        invoice_number: invoiceNum,
        order_id: order.id,
        customer_id: customerId,
        invoice_date: new Date().toISOString().split('T')[0],
        due_date: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
        subtotal,
        tax_amount: taxAmount,
        total,
        paid_amount: form.paymentMethod === 'cod' ? 0 : total,
        status: form.paymentMethod === 'cod' ? 'sent' : 'paid',
      });

      // Create journal entry for the sale
      const revenueAcc = await supabase.from('accounts').select('id').eq('code', '4000').maybeSingle();
      const cashAcc = await supabase.from('accounts').select('id').eq('code', form.paymentMethod === 'cod' ? '1100' : '1020').maybeSingle();
      const taxAcc = await supabase.from('accounts').select('id').eq('code', '2100').maybeSingle();

      if (revenueAcc.data && cashAcc.data) {
        const entryNum = `JE-${Date.now().toString().slice(-8)}`;
        const { data: je } = await supabase.from('journal_entries').insert({
          entry_number: entryNum,
          entry_date: new Date().toISOString().split('T')[0],
          description: `إيراد بيع - طلب ${orderNum}`,
          reference: orderNum,
          reference_type: 'order',
          total_debit: total,
          total_credit: total,
        }).select('id').single();

        if (je) {
          const lines: { entry_id: string; account_id: string; debit: number; credit: number; description: string; line_order: number }[] = [];
          lines.push({
            entry_id: je.id,
            account_id: cashAcc.data.id,
            debit: total,
            credit: 0,
            description: `حاصل من بيع - ${orderNum}`,
            line_order: 1,
          });
          lines.push({
            entry_id: je.id,
            account_id: revenueAcc.data.id,
            debit: 0,
            credit: subtotal + taxAmount,
            description: `إيراد مبيعات - ${orderNum}`,
            line_order: 2,
          });
          if (taxAcc.data && taxAmount > 0) {
            // Split revenue and tax
            lines[1].credit = subtotal;
            lines.push({
              entry_id: je.id,
              account_id: taxAcc.data.id,
              debit: 0,
              credit: taxAmount,
              description: `ضريبة القيمة المضافة - ${orderNum}`,
              line_order: 3,
            });
          }
          await supabase.from('journal_lines').insert(lines);
        }
      }

      // Record payment if not COD
      if (form.paymentMethod !== 'cod') {
        const inv = await supabase.from('invoices').select('id').eq('invoice_number', invoiceNum).maybeSingle();
        if (inv.data) {
          await supabase.from('payments').insert({
            invoice_id: inv.data.id,
            order_id: order.id,
            amount: total,
            method: form.paymentMethod,
            reference: `PAY-${Date.now().toString().slice(-8)}`,
            payment_date: new Date().toISOString().split('T')[0],
          });
        }
      }

      // Update customer stats
      if (customerId) {
        await supabase.rpc('update_customer_stats', { p_customer_id: customerId });
      }

      setSuccess(orderNum);
      clearCart();
    } catch (err) {
      console.error('Checkout error:', err);
      alert('حدث خطأ أثناء معالجة الطلب. يرجى المحاولة مرة أخرى.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center animate-fade-in">
        <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-6">
          <Check className="w-10 h-10 text-emerald-600" />
        </div>
        <h2 className="text-2xl font-bold text-neutral-900 mb-2">تم استلام طلبك بنجاح!</h2>
        <p className="text-neutral-500 mb-2">رقم الطلب: <span className="font-mono font-semibold text-primary-700">{success}</span></p>
        <p className="text-neutral-500 mb-6">سنتواصل معك قريباً لتأكيد التوصيل</p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 rounded-xl bg-primary-700 text-white font-semibold hover:bg-primary-800 transition"
          >
            العودة للرئيسية
          </button>
          <button
            onClick={() => navigate('/shop')}
            className="px-6 py-3 rounded-xl border border-neutral-200 text-neutral-700 font-semibold hover:bg-neutral-50 transition"
          >
            متابعة التسوق
          </button>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    navigate('/cart');
    return null;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 animate-fade-in">
      <h1 className="text-3xl font-bold text-neutral-900 mb-6">إتمام الطلب</h1>

      <form onSubmit={handleSubmit} className="grid lg:grid-cols-3 gap-6">
        {/* Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Shipping info */}
          <div className="bg-white rounded-2xl border border-neutral-200 p-6">
            <h3 className="font-bold text-lg text-neutral-900 mb-4 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-primary-700" />
              معلومات التوصيل
            </h3>
            <div className="grid md:grid-cols-2 gap-4">
              <Field
                icon={<User className="w-4 h-4" />}
                label="الاسم الكامل *"
                value={form.name}
                onChange={(v) => setForm({ ...form, name: v })}
                required
              />
              <Field
                icon={<Phone className="w-4 h-4" />}
                label="رقم الجوال *"
                value={form.phone}
                onChange={(v) => setForm({ ...form, phone: v })}
                required
                type="tel"
              />
              <Field
                icon={<Mail className="w-4 h-4" />}
                label="البريد الإلكتروني"
                value={form.email}
                onChange={(v) => setForm({ ...form, email: v })}
                type="email"
              />
              <Field
                icon={<MapPin className="w-4 h-4" />}
                label="المدينة *"
                value={form.city}
                onChange={(v) => setForm({ ...form, city: v })}
                required
              />
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-neutral-700 mb-1.5">العنوان التفصيلي *</label>
                <input
                  required
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition text-sm"
                  placeholder="الحي، الشارع، رقم المبنى..."
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-neutral-700 mb-1.5">ملاحظات (اختياري)</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition text-sm"
                  placeholder="أي تعليمات خاصة بالتوصيل..."
                />
              </div>
            </div>
          </div>

          {/* Payment method */}
          <div className="bg-white rounded-2xl border border-neutral-200 p-6">
            <h3 className="font-bold text-lg text-neutral-900 mb-4">طريقة الدفع</h3>
            <div className="grid md:grid-cols-3 gap-3">
              {[
                { id: 'cod', label: 'الدفع عند الاستلام', icon: Banknote },
                { id: 'card', label: 'بطاقة ائتمان', icon: CreditCard },
                { id: 'transfer', label: 'تحويل بنكي', icon: Wallet },
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setForm({ ...form, paymentMethod: m.id })}
                  className={`p-4 rounded-xl border-2 text-center transition ${
                    form.paymentMethod === m.id
                      ? 'border-primary-500 bg-primary-50 text-primary-700'
                      : 'border-neutral-200 hover:border-neutral-300 text-neutral-600'
                  }`}
                >
                  <m.icon className="w-6 h-6 mx-auto mb-2" />
                  <span className="text-sm font-medium">{m.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl border border-neutral-200 p-6 sticky top-24">
            <h3 className="font-bold text-lg text-neutral-900 mb-4 flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-primary-700" />
              طلبك
            </h3>

            <div className="space-y-2 max-h-60 overflow-y-auto mb-4">
              {items.map((item) => (
                <div key={item.product.id} className="flex items-center gap-3 text-sm">
                  <div className="w-12 h-12 rounded-lg overflow-hidden bg-neutral-100 shrink-0">
                    {item.product.image_url && (
                      <img src={item.product.image_url} alt="" className="w-full h-full object-cover" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-neutral-900 line-clamp-1">{item.product.name}</div>
                    <div className="text-xs text-neutral-500">{item.quantity} × {formatCurrency(item.product.price)}</div>
                  </div>
                  <div className="font-medium text-neutral-900 text-sm">
                    {formatCurrency(item.product.price * item.quantity)}
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-2 text-sm border-t border-neutral-100 pt-3">
              <div className="flex justify-between text-neutral-600">
                <span>المجموع الفرعي</span>
                <span className="font-medium">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-neutral-600">
                <span>الضريبة ({taxRate}%)</span>
                <span className="font-medium">{formatCurrency(taxAmount)}</span>
              </div>
              <div className="flex justify-between text-neutral-600">
                <span>الشحن</span>
                <span className="font-medium">
                  {shippingCost === 0 ? <span className="text-emerald-600">مجاني</span> : formatCurrency(shippingCost)}
                </span>
              </div>
              <div className="border-t border-neutral-100 pt-2 flex justify-between items-baseline">
                <span className="font-bold text-neutral-900">الإجمالي</span>
                <span className="text-xl font-bold text-primary-700">{formatCurrency(total)}</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-5 px-6 py-3.5 rounded-xl bg-primary-700 text-white font-semibold hover:bg-primary-800 transition shadow-lg shadow-primary-200 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> جاري المعالجة...</>
              ) : (
                <><Check className="w-5 h-5" /> تأكيد الطلب</>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

interface FieldProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
}

function Field({ icon, label, value, onChange, type = 'text', required }: FieldProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-neutral-700 mb-1.5">{label}</label>
      <div className="relative">
        <input
          type={type}
          required={required}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full h-11 pr-10 pl-4 rounded-xl border border-neutral-200 outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition text-sm"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400">{icon}</span>
      </div>
    </div>
  );
}
