import { useEffect, useState } from 'react';
import { Search, Eye, X, Receipt, Loader2, Printer, FileDown } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatCurrency, formatDate, INVOICE_STATUS_LABELS, INVOICE_STATUS_COLORS } from '@/lib/format';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { generateInvoicePDF } from '@/lib/pdf';
import { exporters } from '@/lib/exporters';
import type { Invoice, OrderItem, StoreSettings } from '@/types';

export function AdminInvoices() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selected, setSelected] = useState<Invoice | null>(null);
  const [invoiceItems, setInvoiceItems] = useState<OrderItem[]>([]);
  const [settings, setSettings] = useState<StoreSettings | null>(null);

  const load = async () => {
    setLoading(true);
    const [invRes, setRes] = await Promise.all([
      supabase.from('invoices').select('*, customer:customers(*), order:orders(*)').order('created_at', { ascending: false }),
      supabase.from('store_settings').select('*').maybeSingle(),
    ]);
    setInvoices(invRes.data || []);
    setSettings(setRes.data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const viewInvoice = async (inv: Invoice) => {
    setSelected(inv);
    if (inv.order_id) {
      const { data } = await supabase.from('order_items').select('*').eq('order_id', inv.order_id);
      setInvoiceItems(data || []);
    } else {
      setInvoiceItems([]);
    }
  };

  const markAsPaid = async (id: string) => {
    await supabase.from('invoices').update({ status: 'paid', paid_amount: selected?.total || 0 }).eq('id', id);
    load();
    setSelected(null);
  };

  const filtered = invoices.filter((i) => {
    const matchSearch = !search || i.invoice_number.toLowerCase().includes(search.toLowerCase()) || i.customer?.name?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !statusFilter || i.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <AdminLayout activePage="invoices">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">الفواتير</h1>
          <p className="text-sm text-neutral-500 mt-1">{invoices.length} فاتورة</p>
        </div>
        <button onClick={() => exporters.invoicesExcel(filtered)} disabled={filtered.length === 0}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-neutral-200 text-sm font-medium text-neutral-600 hover:bg-neutral-50 transition disabled:opacity-40">
          <FileDown className="w-4 h-4" /> تصدير Excel
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث برقم الفاتورة أو العميل..."
            className="w-full h-11 pr-10 pl-4 rounded-xl border border-neutral-200 bg-white outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 text-sm" />
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 h-11 rounded-xl border border-neutral-200 bg-white text-sm outline-none focus:border-primary-400">
          <option value="">كل الحالات</option>
          <option value="draft">مسودة</option>
          <option value="sent">مرسلة</option>
          <option value="paid">مدفوعة</option>
          <option value="overdue">متأخرة</option>
        </select>
      </div>

      <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 text-primary-600 animate-spin" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-neutral-50 text-neutral-600 text-xs">
                  <th className="text-right px-4 py-3 font-medium">رقم الفاتورة</th>
                  <th className="text-right px-4 py-3 font-medium">العميل</th>
                  <th className="text-right px-4 py-3 font-medium hidden md:table-cell">التاريخ</th>
                  <th className="text-right px-4 py-3 font-medium hidden sm:table-cell">الاستحقاق</th>
                  <th className="text-right px-4 py-3 font-medium">الحالة</th>
                  <th className="text-right px-4 py-3 font-medium">المبلغ</th>
                  <th className="text-center px-4 py-3 font-medium">إجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-50">
                {filtered.map((inv) => (
                  <tr key={inv.id} className="hover:bg-neutral-50 transition">
                    <td className="px-4 py-3 font-mono font-medium">{inv.invoice_number}</td>
                    <td className="px-4 py-3 text-neutral-700">{inv.customer?.name || '—'}</td>
                    <td className="px-4 py-3 text-neutral-500 text-xs hidden md:table-cell">{formatDate(inv.invoice_date)}</td>
                    <td className="px-4 py-3 text-neutral-500 text-xs hidden sm:table-cell">{inv.due_date ? formatDate(inv.due_date) : '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${INVOICE_STATUS_COLORS[inv.status]}`}>
                        {INVOICE_STATUS_LABELS[inv.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-bold text-primary-700">{formatCurrency(inv.total)}</td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => viewInvoice(inv)} className="p-2 rounded-lg text-blue-600 hover:bg-blue-50 transition inline-flex">
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div className="p-12 text-center text-neutral-400">
                <Receipt className="w-12 h-12 mx-auto mb-3 opacity-30" />
                لا توجد فواتير
              </div>
            )}
          </div>
        )}
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSelected(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-scale-in">
            <div className="flex items-center justify-between p-5 border-b border-neutral-100 sticky top-0 bg-white z-10">
              <div>
                <h3 className="font-bold text-lg">فاتورة</h3>
                <p className="text-sm text-neutral-500 font-mono">{selected.invoice_number}</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => generateInvoicePDF(selected, invoiceItems, settings)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 transition">
                  <FileDown className="w-4 h-4" /> PDF
                </button>
                <button onClick={() => window.print()} className="p-2 rounded-lg text-neutral-600 hover:bg-neutral-100 transition">
                  <Printer className="w-5 h-5" />
                </button>
                <button onClick={() => setSelected(null)} className="p-2 rounded-lg hover:bg-neutral-100"><X className="w-5 h-5" /></button>
              </div>
            </div>

            <div className="p-5 space-y-5">
              {/* Invoice header */}
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-xs text-neutral-500">فاتورة إلى</div>
                  <div className="font-bold text-neutral-900">{selected.customer?.name || 'عميل'}</div>
                  {selected.customer?.phone && <div className="text-sm text-neutral-600">{selected.customer.phone}</div>}
                  {selected.customer?.address && <div className="text-sm text-neutral-600">{selected.customer.address}</div>}
                </div>
                <div className="text-left">
                  <div className="text-xs text-neutral-500">تاريخ الإصدار</div>
                  <div className="font-medium text-sm">{formatDate(selected.invoice_date)}</div>
                  {selected.due_date && (
                    <>
                      <div className="text-xs text-neutral-500 mt-2">تاريخ الاستحقاق</div>
                      <div className="font-medium text-sm">{formatDate(selected.due_date)}</div>
                    </>
                  )}
                </div>
              </div>

              {/* Items */}
              <div className="border border-neutral-200 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-neutral-50">
                    <tr>
                      <th className="text-right px-3 py-2 font-medium text-xs text-neutral-600">الصنف</th>
                      <th className="text-center px-3 py-2 font-medium text-xs text-neutral-600">الكمية</th>
                      <th className="text-left px-3 py-2 font-medium text-xs text-neutral-600">السعر</th>
                      <th className="text-left px-3 py-2 font-medium text-xs text-neutral-600">الإجمالي</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-50">
                    {invoiceItems.map((item) => (
                      <tr key={item.id}>
                        <td className="px-3 py-2 font-medium">{item.product_name}</td>
                        <td className="px-3 py-2 text-center">{item.quantity}</td>
                        <td className="px-3 py-2 text-left">{formatCurrency(item.unit_price)}</td>
                        <td className="px-3 py-2 text-left font-semibold">{formatCurrency(item.total_price)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals */}
              <div className="ml-auto w-full max-w-xs space-y-2">
                <div className="flex justify-between text-sm"><span className="text-neutral-600">المجموع الفرعي</span><span className="font-medium">{formatCurrency(selected.subtotal)}</span></div>
                <div className="flex justify-between text-sm"><span className="text-neutral-600">الضريبة</span><span className="font-medium">{formatCurrency(selected.tax_amount)}</span></div>
                <div className="flex justify-between font-bold text-base pt-2 border-t border-neutral-200"><span>الإجمالي</span><span className="text-primary-700">{formatCurrency(selected.total)}</span></div>
                {selected.paid_amount > 0 && selected.paid_amount < selected.total && (
                  <div className="flex justify-between text-sm text-amber-600"><span>المتبقي</span><span className="font-medium">{formatCurrency(selected.total - selected.paid_amount)}</span></div>
                )}
              </div>

              {/* Status + action */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-neutral-50">
                <span className={`px-3 py-1 rounded-full text-xs font-medium border ${INVOICE_STATUS_COLORS[selected.status]}`}>
                  {INVOICE_STATUS_LABELS[selected.status]}
                </span>
                {selected.status !== 'paid' && selected.status !== 'cancelled' && (
                  <button onClick={() => markAsPaid(selected.id)}
                    className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition">
                    تحديد كمدفوعة
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
