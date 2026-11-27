import { useEffect, useState } from 'react';
import { Search, Users, Phone, Mail, MapPin, Loader2, ShoppingBag } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatCurrency, formatDate } from '@/lib/format';
import { AdminLayout } from '@/components/admin/AdminLayout';
import type { Customer, Order } from '@/types';

export function AdminCustomers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Customer | null>(null);
  const [customerOrders, setCustomerOrders] = useState<Order[]>([]);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('customers').select('*').order('created_at', { ascending: false });
    setCustomers(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const viewCustomer = async (c: Customer) => {
    setSelected(c);
    const { data } = await supabase.from('orders').select('*').eq('customer_id', c.id).order('created_at', { ascending: false });
    setCustomerOrders(data || []);
  };

  const filtered = customers.filter((c) =>
    !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.phone?.includes(search) || c.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AdminLayout activePage="customers">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-neutral-900">العملاء</h1>
        <p className="text-sm text-neutral-500 mt-1">{customers.length} عميل</p>
      </div>

      <div className="relative mb-4">
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="ابحث بالاسم أو الهاتف أو البريد..."
          className="w-full h-11 pr-10 pl-4 rounded-xl border border-neutral-200 bg-white outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 text-sm" />
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
      </div>

      <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 text-primary-600 animate-spin" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-neutral-50 text-neutral-600 text-xs">
                  <th className="text-right px-4 py-3 font-medium">العميل</th>
                  <th className="text-right px-4 py-3 font-medium hidden sm:table-cell">الهاتف</th>
                  <th className="text-right px-4 py-3 font-medium hidden md:table-cell">المدينة</th>
                  <th className="text-right px-4 py-3 font-medium">الطلبات</th>
                  <th className="text-right px-4 py-3 font-medium">إجمالي الإنفاق</th>
                  <th className="text-right px-4 py-3 font-medium hidden lg:table-cell">تاريخ التسجيل</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-50">
                {filtered.map((c) => (
                  <tr key={c.id} onClick={() => viewCustomer(c)} className="hover:bg-neutral-50 cursor-pointer transition">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
                          {c.name.charAt(0)}
                        </div>
                        <div>
                          <div className="font-medium text-neutral-900">{c.name}</div>
                          <div className="text-xs text-neutral-400">{c.email || '—'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-neutral-600 hidden sm:table-cell">{c.phone || '—'}</td>
                    <td className="px-4 py-3 text-neutral-600 hidden md:table-cell">{c.city || '—'}</td>
                    <td className="px-4 py-3"><span className="font-medium">{c.total_orders}</span></td>
                    <td className="px-4 py-3 font-bold text-primary-700">{formatCurrency(c.total_spent)}</td>
                    <td className="px-4 py-3 text-neutral-500 text-xs hidden lg:table-cell">{formatDate(c.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div className="p-12 text-center text-neutral-400">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
                لا يوجد عملاء
              </div>
            )}
          </div>
        )}
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSelected(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-scale-in">
            <div className="p-5 border-b border-neutral-100">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-bold text-xl">
                  {selected.name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-bold text-lg">{selected.name}</h3>
                  <p className="text-sm text-neutral-500">عميل منذ {formatDate(selected.created_at)}</p>
                </div>
              </div>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <InfoItem icon={Phone} label="الهاتف" value={selected.phone || '—'} />
                <InfoItem icon={Mail} label="البريد" value={selected.email || '—'} />
                <InfoItem icon={MapPin} label="المدينة" value={selected.city || '—'} />
                <InfoItem icon={ShoppingBag} label="إجمالي الطلبات" value={String(selected.total_orders)} />
              </div>
              <div className="p-4 rounded-xl bg-primary-50">
                <div className="text-xs text-primary-600">إجمالي الإنفاق</div>
                <div className="text-2xl font-bold text-primary-700">{formatCurrency(selected.total_spent)}</div>
              </div>

              {customerOrders.length > 0 && (
                <div>
                  <h4 className="font-semibold text-sm mb-2">آخر الطلبات</h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {customerOrders.map((o) => (
                      <div key={o.id} className="flex items-center justify-between p-3 rounded-lg bg-neutral-50 text-sm">
                        <span className="font-mono text-xs">{o.order_number}</span>
                        <span className="font-semibold text-primary-700">{formatCurrency(o.total)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

function InfoItem({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="p-3 rounded-xl bg-neutral-50">
      <div className="flex items-center gap-1.5 text-xs text-neutral-500 mb-1">
        <Icon className="w-3.5 h-3.5" /> {label}
      </div>
      <div className="font-medium text-sm text-neutral-900">{value}</div>
    </div>
  );
}
