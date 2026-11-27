import { useEffect, useState } from 'react';
import {
  TrendingUp, ShoppingBag, Users, Package, DollarSign,
  ArrowUpRight, ArrowDownRight, Clock, AlertTriangle
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatCurrency, formatNumber, timeAgo, ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from '@/lib/format';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { navigate } from '@/lib/router';
import type { Order } from '@/types';

export function AdminDashboard() {
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalOrders: 0,
    totalCustomers: 0,
    totalProducts: 0,
    lowStock: 0,
    pendingOrders: 0,
    todayRevenue: 0,
    monthRevenue: 0,
  });
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [topProducts, setTopProducts] = useState<{ product_name: string; total_qty: number; total_rev: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [orders, products, customers, lowStockProd, pendingOrd, todayOrd, monthOrd, recentOrd, topItems] = await Promise.all([
        supabase.from('orders').select('total').neq('status', 'cancelled'),
        supabase.from('products').select('id', { count: 'exact', head: true }),
        supabase.from('customers').select('id', { count: 'exact', head: true }),
        supabase.from('products').select('id', { count: 'exact', head: true }).lt('stock', 5),
        supabase.from('orders').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('orders').select('total').neq('status', 'cancelled').gte('created_at', new Date().toISOString().split('T')[0]),
        supabase.from('orders').select('total').neq('status', 'cancelled').gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
        supabase.from('orders').select('*, customer:customers(*)').order('created_at', { ascending: false }).limit(5),
        supabase.from('order_items').select('product_name, quantity, total_price').order('quantity', { ascending: false }).limit(5),
      ]);

      const totalRev = (orders.data || []).reduce((s, o) => s + Number(o.total), 0);
      const todayRev = (todayOrd.data || []).reduce((s, o) => s + Number(o.total), 0);
      const monthRev = (monthOrd.data || []).reduce((s, o) => s + Number(o.total), 0);

      setStats({
        totalRevenue: totalRev,
        totalOrders: orders.data?.length || 0,
        totalCustomers: customers.count || 0,
        totalProducts: products.count || 0,
        lowStock: lowStockProd.count || 0,
        pendingOrders: pendingOrd.count || 0,
        todayRevenue: todayRev,
        monthRevenue: monthRev,
      });
      setRecentOrders(recentOrd.data || []);
      setTopProducts((topItems.data || []).map((i: { product_name: string; quantity: number; total_price: number }) => ({
        product_name: i.product_name,
        total_qty: i.quantity,
        total_rev: Number(i.total_price),
      })));
      setLoading(false);
    };
    load();
  }, []);

  if (loading) {
    return (
      <AdminLayout activePage="dashboard">
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin w-8 h-8 border-3 border-primary-200 border-t-primary-700 rounded-full" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout activePage="dashboard">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-neutral-900">لوحة المعلومات</h1>
        <p className="text-sm text-neutral-500 mt-1">نظرة عامة على أداء متجرك</p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="إجمالي الإيرادات"
          value={formatCurrency(stats.totalRevenue)}
          icon={DollarSign}
          color="primary"
          trend={stats.monthRevenue > 0 ? `+${formatCurrency(stats.monthRevenue)} هذا الشهر` : undefined}
        />
        <StatCard
          title="إجمالي الطلبات"
          value={formatNumber(stats.totalOrders)}
          icon={ShoppingBag}
          color="blue"
          trend={`${stats.pendingOrders} قيد الانتظار`}
          trendDown={stats.pendingOrders > 0}
        />
        <StatCard
          title="العملاء"
          value={formatNumber(stats.totalCustomers)}
          icon={Users}
          color="emerald"
        />
        <StatCard
          title="المنتجات"
          value={formatNumber(stats.totalProducts)}
          icon={Package}
          color="amber"
          trend={stats.lowStock > 0 ? `${stats.lowStock} مخزون منخفض` : undefined}
          trendDown={stats.lowStock > 0}
        />
      </div>

      {/* Today + Month revenue */}
      <div className="grid md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-2xl border border-neutral-200 p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-primary-700" />
            </div>
            <div>
              <div className="text-xs text-neutral-500">إيرادات اليوم</div>
              <div className="font-bold text-lg text-neutral-900">{formatCurrency(stats.todayRevenue)}</div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-neutral-200 p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-blue-700" />
            </div>
            <div>
              <div className="text-xs text-neutral-500">إيرادات الشهر</div>
              <div className="font-bold text-lg text-neutral-900">{formatCurrency(stats.monthRevenue)}</div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-neutral-200 p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <div className="text-xs text-neutral-500">تنبيهات المخزون</div>
              <div className="font-bold text-lg text-neutral-900">{stats.lowStock} منتج</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent orders */}
        <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
          <div className="flex items-center justify-between p-5 border-b border-neutral-100">
            <h3 className="font-bold text-neutral-900">أحدث الطلبات</h3>
            <button onClick={() => navigate('/admin/orders')} className="text-sm text-primary-700 hover:text-primary-800">
              عرض الكل
            </button>
          </div>
          <div className="divide-y divide-neutral-50">
            {recentOrders.length === 0 ? (
              <div className="p-8 text-center text-sm text-neutral-400">لا توجد طلبات بعد</div>
            ) : (
              recentOrders.map((order) => (
                <div
                  key={order.id}
                  onClick={() => navigate('/admin/orders')}
                  className="flex items-center justify-between p-4 hover:bg-neutral-50 cursor-pointer transition"
                >
                  <div className="min-w-0">
                    <div className="font-medium text-sm text-neutral-900 font-mono">{order.order_number}</div>
                    <div className="text-xs text-neutral-500 mt-0.5">
                      {order.customer?.name || order.shipping_name || 'عميل'} • {timeAgo(order.created_at)}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${ORDER_STATUS_COLORS[order.status]}`}>
                      {ORDER_STATUS_LABELS[order.status]}
                    </span>
                    <span className="font-bold text-sm text-primary-700">{formatCurrency(order.total)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Top products */}
        <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
          <div className="flex items-center justify-between p-5 border-b border-neutral-100">
            <h3 className="font-bold text-neutral-900">الأكثر مبيعاً</h3>
            <Clock className="w-4 h-4 text-neutral-400" />
          </div>
          <div className="divide-y divide-neutral-50">
            {topProducts.length === 0 ? (
              <div className="p-8 text-center text-sm text-neutral-400">لا توجد مبيعات بعد</div>
            ) : (
              topProducts.map((p, i) => (
                <div key={i} className="flex items-center justify-between p-4 hover:bg-neutral-50 transition">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-neutral-100 flex items-center justify-center text-xs font-bold text-neutral-600">
                      {i + 1}
                    </div>
                    <div>
                      <div className="font-medium text-sm text-neutral-900 line-clamp-1">{p.product_name}</div>
                      <div className="text-xs text-neutral-500">{p.total_qty} مبيع</div>
                    </div>
                  </div>
                  <span className="font-bold text-sm text-primary-700">{formatCurrency(p.total_rev)}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

interface StatCardProps {
  title: string;
  value: string;
  icon: React.ElementType;
  color: 'primary' | 'blue' | 'emerald' | 'amber';
  trend?: string;
  trendDown?: boolean;
}

function StatCard({ title, value, icon: Icon, color, trend, trendDown }: StatCardProps) {
  const colors = {
    primary: 'bg-primary-50 text-primary-700',
    blue: 'bg-blue-50 text-blue-700',
    emerald: 'bg-emerald-50 text-emerald-700',
    amber: 'bg-amber-50 text-amber-700',
  };

  return (
    <div className="bg-white rounded-2xl border border-neutral-200 p-5 card-hover">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${colors[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <div className="text-xs text-neutral-500 mb-1">{title}</div>
      <div className="text-2xl font-bold text-neutral-900">{value}</div>
      {trend && (
        <div className={`flex items-center gap-1 text-xs mt-2 ${trendDown ? 'text-amber-600' : 'text-emerald-600'}`}>
          {trendDown ? <ArrowDownRight className="w-3.5 h-3.5" /> : <ArrowUpRight className="w-3.5 h-3.5" />}
          {trend}
        </div>
      )}
    </div>
  );
}
