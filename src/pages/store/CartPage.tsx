import { Minus, Plus, Trash2, ShoppingBag, ArrowLeft, Tag } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { formatCurrency } from '@/lib/format';
import { navigate } from '@/lib/router';
import { supabase } from '@/lib/supabase';
import { useEffect, useState } from 'react';

export function CartPage() {
  const { items, updateQuantity, removeFromCart, clearCart, subtotal } = useCart();
  const [taxRate, setTaxRate] = useState(15);
  const [shippingRate, setShippingRate] = useState(25);
  const [freeThreshold, setFreeThreshold] = useState(200);

  useEffect(() => {
    supabase.from('store_settings').select('*').maybeSingle().then(({ data }) => {
      if (data) {
        setTaxRate(data.tax_enabled ? data.tax_rate : 0);
        setShippingRate(Number(data.shipping_flat_rate));
        setFreeThreshold(Number(data.free_shipping_threshold));
      }
    });
  }, []);

  const taxAmount = (subtotal * taxRate) / 100;
  const shippingCost = subtotal >= freeThreshold || subtotal === 0 ? 0 : shippingRate;
  const total = subtotal + taxAmount + shippingCost;

  if (items.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center animate-fade-in">
        <div className="w-20 h-20 rounded-full bg-neutral-100 flex items-center justify-center mx-auto mb-6">
          <ShoppingBag className="w-10 h-10 text-neutral-300" />
        </div>
        <h2 className="text-2xl font-bold text-neutral-900 mb-2">سلتك فارغة</h2>
        <p className="text-neutral-500 mb-6">لم تقم بإضافة أي منتجات بعد. ابدأ التسوق الآن!</p>
        <button
          onClick={() => navigate('/shop')}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary-700 text-white font-semibold hover:bg-primary-800 transition shadow-lg"
        >
          تصفح المنتجات
          <ArrowLeft className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 animate-fade-in">
      <h1 className="text-3xl font-bold text-neutral-900 mb-6">سلة التسوق</h1>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Items */}
        <div className="lg:col-span-2 space-y-3">
          {items.map((item) => (
            <div
              key={item.product.id}
              className="flex gap-4 bg-white rounded-2xl border border-neutral-200 p-4"
            >
              {/* Image */}
              <div className="w-24 h-24 rounded-xl overflow-hidden bg-neutral-100 shrink-0">
                {item.product.image_url ? (
                  <img src={item.product.image_url} alt={item.product.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ShoppingBag className="w-8 h-8 text-neutral-300" />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <button
                  onClick={() => navigate(`/product/${item.product.slug}`)}
                  className="font-medium text-neutral-900 hover:text-primary-700 transition text-right line-clamp-1"
                >
                  {item.product.name}
                </button>
                <div className="text-sm text-primary-700 font-semibold mt-1">
                  {formatCurrency(item.product.price)}
                </div>
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center border border-neutral-200 rounded-lg overflow-hidden">
                    <button
                      onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                      className="px-2 py-1.5 hover:bg-neutral-50 transition"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="px-4 text-sm font-semibold">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                      className="px-2 py-1.5 hover:bg-neutral-50 transition"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-neutral-900">
                      {formatCurrency(item.product.price * item.quantity)}
                    </span>
                    <button
                      onClick={() => removeFromCart(item.product.id)}
                      className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}

          <div className="flex justify-between pt-2">
            <button
              onClick={clearCart}
              className="text-sm text-red-500 hover:text-red-600 transition flex items-center gap-1"
            >
              <Trash2 className="w-4 h-4" />
              إفراغ السلة
            </button>
            <button
              onClick={() => navigate('/shop')}
              className="text-sm text-primary-700 hover:text-primary-800 transition flex items-center gap-1"
            >
              متابعة التسوق
              <ArrowLeft className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Summary */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl border border-neutral-200 p-6 sticky top-24">
            <h3 className="font-bold text-lg text-neutral-900 mb-4">ملخص الطلب</h3>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between text-neutral-600">
                <span>المجموع الفرعي</span>
                <span className="font-medium text-neutral-900">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-neutral-600">
                <span>الضريبة ({taxRate}%)</span>
                <span className="font-medium text-neutral-900">{formatCurrency(taxAmount)}</span>
              </div>
              <div className="flex justify-between text-neutral-600">
                <span>الشحن</span>
                <span className="font-medium text-neutral-900">
                  {shippingCost === 0 ? (
                    <span className="text-emerald-600">مجاني</span>
                  ) : (
                    formatCurrency(shippingCost)
                  )}
                </span>
              </div>

              {shippingCost > 0 && (
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-accent-50 text-accent-700 text-xs">
                  <Tag className="w-3.5 h-3.5 shrink-0" />
                  أضف {formatCurrency(freeThreshold - subtotal)} للحصول على شحن مجاني
                </div>
              )}

              <div className="border-t border-neutral-100 pt-3 flex justify-between items-baseline">
                <span className="font-bold text-neutral-900">الإجمالي</span>
                <span className="text-2xl font-bold text-primary-700">{formatCurrency(total)}</span>
              </div>
            </div>

            <button
              onClick={() => navigate('/checkout')}
              className="w-full mt-5 px-6 py-3.5 rounded-xl bg-primary-700 text-white font-semibold hover:bg-primary-800 transition shadow-lg shadow-primary-200"
            >
              إتمام الطلب
            </button>

            <div className="mt-4 flex items-center justify-center gap-2 text-xs text-neutral-400">
              <span>دفع آمن ومشفّر</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
