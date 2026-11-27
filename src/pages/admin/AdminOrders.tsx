import { useEffect, useState } from 'react';
import { Search, Eye, X, Loader2, Package } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatCurrency, formatDate, timeAgo, ORDER_STATUS_LABELS, ORDER_STATUS_COLORS, PAYMENT_STATUS_LABELS, PAYMENT_STATUS_COLORS } from '@/lib/format';
import { AdminLayout } from '@/components/admin/AdminLayout';
import type { Order, OrderItem } from '@/types';

export function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('orders')
      .select('*, customer:customers(*)')
      .order('created_at', { ascending: false });
    setOrders(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = orders.filter((o) => {
    const matchSearch = !search ||
      o.order_number.toLowerCase().includes(search.toLowerCase()) ||
      o.customer?.name?.toLowerCase().includes(search.toLowerCase()) ||
      o.shipping_name?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !statusFilter || o.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const updateStatus = async (id: string, status: string) => {
    await supabase.from('orders').update({ status, updated_at: new Date().toISOString() }).eq('id', id);
    load();
    if (selectedOrder?.id === id) {
      setSelectedOrder({ ...selectedOrder, status: status as Order['status'] });
    }
  };

  return (
    <AdminLayout activePage="orders">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-neutral-900">الطلبات</h1>
        <p className="text-sm text-neutral-500 mt-1">{orders.length} طلب إجمالي</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث برقم الطلب أو اسم العميل..."
            className="w-full h-11 pr-10 pl-4 rounded-xl border border-neutral-200 bg-white outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 text-sm" />
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 h-11 rounded-xl border border-neutral-200 bg-white text-sm outline-none focus:border-primary-400">
          <option value="">كل الحالات</option>
          <option value="pending">قيد الانتظار</option>
          <option value="processing">قيد المعالجة</option>
          <option value="shipped">تم الشحن</option>
          <option value="delivered">تم التوصيل</option>
          <option value="cancelled">ملغي</option>
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
                  <th className="text-right px-4 py-3 font-medium">رقم الطلب</th>
                  <th className="text-right px-4 py-3 font-medium">العميل</th>
                  <th className="text-right px-4 py-3 font-medium hidden md:table-cell">التاريخ</th>
                  <th className="text-right px-4 py-3 font-medium">الحالة</th>
                  <th className="text-right px-4 py-3 font-medium hidden sm:table-cell">الدفع</th>
                  <th className="text-right px-4 py-3 font-medium">الإجمالي</th>
                  <th className="text-center px-4 py-3 font-medium">إجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-50">
                {filtered.map((o) => (
                  <tr key={o.id} className="hover:bg-neutral-50 transition">
                    <td className="px-4 py-3 font-mono font-medium text-neutral-900">{o.order_number}</td>
                    <td className="px-4 py-3 text-neutral-700">{o.customer?.name || o.shipping_name || '—'}</td>
                    <td className="px-4 py-3 text-neutral-500 text-xs hidden md:table-cell">{timeAgo(o.created_at)}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${ORDER_STATUS_COLORS[o.status]}`}>
                        {ORDER_STATUS_LABELS[o.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${PAYMENT_STATUS_COLORS[o.payment_status]}`}>
                        {PAYMENT_STATUS_LABELS[o.payment_status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-bold text-primary-700">{formatCurrency(o.total)}</td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => setSelectedOrder(o)}
                        className="p-2 rounded-lg text-blue-600 hover:bg-blue-50 transition inline-flex">
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div className="p-12 text-center text-neutral-400">
                <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
                لا توجد طلبات
              </div>
            )}
          </div>
        )}
      </div>

      {selectedOrder && (
        <OrderModal order={selectedOrder} onClose={() => setSelectedOrder(null)} onUpdateStatus={updateStatus} />
      )}
    </AdminLayout>
  );
}

interface OrderModalProps {
  order: Order;
  onClose: () => void;
  onUpdateStatus: (id: string, status: string) => void;
}

function OrderModal({ order, onClose, onUpdateStatus }: OrderModalProps) {
  const [items, setItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from('order_items').select('*').eq('order_id', order.id).then(({ data }) => {
      setItems(data || []);
      setLoading(false);
    });
  }, [order.id]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-scale-in">
        <div className="flex items-center justify-between p-5 border-b border-neutral-100 sticky top-0 bg-white z-10">
          <div>
            <h3 className="font-bold text-lg">تفاصيل الطلب</h3>
            <p className="text-sm text-neutral-500 font-mono">{order.order_number}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-neutral-100"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-5 space-y-5">
          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">حالة الطلب</label>
            <div className="flex flex-wrap gap-2">
              {['pending', 'processing', 'shipped', 'delivered', 'cancelled'].map((s) => (
                <button key={s} onClick={() => onUpdateStatus(order.id, s)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                    order.status === s
                      ? 'bg-primary-700 text-white'
                      : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                  }`}>
                  {ORDER_STATUS_LABELS[s]}
                </button>
              ))}
            </div>
          </div>

          {/* Customer info */}
          <div className="grid grid-cols-2 gap-3 p-4 rounded-xl bg-neutral-50">
            <div>
              <div className="text-xs text-neutral-500">العميل</div>
              <div className="font-medium text-sm">{order.customer?.name || order.shipping_name || '—'}</div>
            </div>
            <div>
              <div className="text-xs text-neutral-500">الهاتف</div>
              <div className="font-medium text-sm">{order.shipping_phone || order.customer?.phone || '—'}</div>
            </div>
            <div className="col-span-2">
              <div className="text-xs text-neutral-500">العنوان</div>
              <div className="font-medium text-sm">{order.shipping_address || '—'}، {order.shipping_city || ''}</div>
            </div>
            <div>
              <div className="text-xs text-neutral-500">طريقة الدفع</div>
              <div className="font-medium text-sm">
                {order.payment_method === 'cod' ? 'الدفع عند الاستلام' :
                 order.payment_method === 'card' ? 'بطاقة ائتمان' :
                 order.payment_method === 'transfer' ? 'تحويل بنكي' : '—'}
              </div>
            </div>
            <div>
              <div className="text-xs text-neutral-500">التاريخ</div>
              <div className="font-medium text-sm">{formatDate(order.created_at)}</div>
            </div>
          </div>

          {/* Items */}
          <div>
            <h4 className="font-semibold text-sm mb-2">المنتجات</h4>
            {loading ? (
              <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-primary-600" /></div>
            ) : (
              <div className="border border-neutral-200 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-neutral-50">
                    <tr>
                      <th className="text-right px-3 py-2 font-medium text-xs text-neutral-600">المنتج</th>
                      <th className="text-center px-3 py-2 font-medium text-xs text-neutral-600">الكمية</th>
                      <th className="text-left px-3 py-2 font-medium text-xs text-neutral-600">السعر</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-50">
                    {items.map((item) => (
                      <tr key={item.id}>
                        <td className="px-3 py-2 font-medium">{item.product_name}</td>
                        <td className="px-3 py-2 text-center">{item.quantity}</td>
                        <td className="px-3 py-2 text-left font-semibold">{formatCurrency(item.total_price)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Totals */}
          <div className="space-y-2 p-4 rounded-xl bg-neutral-50">
            <div className="flex justify-between text-sm"><span className="text-neutral-600">المجموع الفرعي</span><span className="font-medium">{formatCurrency(order.subtotal)}</span></div>
            <div className="flex justify-between text-sm"><span className="text-neutral-600">الضريبة</span><span className="font-medium">{formatCurrency(order.tax_amount)}</span></div>
            <div className="flex justify-between text-sm"><span className="text-neutral-600">الشحن</span><span className="font-medium">{formatCurrency(order.shipping_cost)}</span></div>
            {order.discount > 0 && <div className="flex justify-between text-sm"><span className="text-neutral-600">الخصم</span><span className="font-medium text-red-600">-{formatCurrency(order.discount)}</span></div>}
            <div className="flex justify-between font-bold text-base pt-2 border-t border-neutral-200"><span>الإجمالي</span><span className="text-primary-700">{formatCurrency(order.total)}</span></div>
          </div>

          {order.notes && (
            <div className="p-3 rounded-xl bg-amber-50 text-amber-800 text-sm">
              <span className="font-medium">ملاحظات: </span>{order.notes}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
