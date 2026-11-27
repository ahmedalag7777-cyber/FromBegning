import { useEffect, useState, useMemo } from 'react';
import {
  TrendingUp, TrendingDown, DollarSign, ShoppingBag, Package,
  AlertTriangle, Clock, ArrowUpRight, Activity, Target,
  Zap, Brain, Loader2, FileBarChart, Receipt
} from 'lucide-react';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement,
  LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler
} from 'chart.js';
import { Line, Doughnut } from 'react-chartjs-2';
import Decimal from 'decimal.js';
import { supabase } from '@/lib/supabase';
import { formatCurrency, formatNumber } from '@/lib/format';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { navigate } from '@/lib/router';
import type { Order, JournalEntry, Account, Invoice, Product } from '@/types';

ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, ArcElement, Title, Tooltip, Legend, Filler
);

interface ExecData {
  orders: Order[];
  entries: JournalEntry[];
  accounts: Account[];
  invoices: Invoice[];
  products: Product[];
  todayRevenue: number;
  monthRevenue: number;
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  pendingOrders: number;
  lowStockCount: number;
  overdueInvoices: number;
  totalCustomers: number;
  avgOrderValue: number;
}

export function AdminExecutive() {
  const [data, setData] = useState<ExecData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [ordersRes, jeRes, accRes, invRes, prodRes, custRes] = await Promise.all([
        supabase.from('orders').select('*, customer:customers(*)').order('created_at', { ascending: false }),
        supabase.from('journal_entries').select('*, journal_lines!inner(account_id, debit, credit, account:accounts!inner(type, code, name))').order('entry_date'),
        supabase.from('accounts').select('*').order('code'),
        supabase.from('invoices').select('*, customer:customers(*)').order('created_at', { ascending: false }),
        supabase.from('products').select('*').order('created_at', { ascending: false }),
        supabase.from('customers').select('id', { count: 'exact', head: true }),
      ]);

      const orders = (ordersRes.data || []) as Order[];
      const entries = (jeRes.data || []) as JournalEntry[];
      const accounts = (accRes.data || []) as Account[];
      const invoices = (invRes.data || []) as Invoice[];
      const products = (prodRes.data || []) as Product[];

      const todayStr = new Date().toISOString().split('T')[0];
      const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

      const activeOrders = orders.filter((o) => o.status !== 'cancelled');
      const totalRev = activeOrders.reduce((s, o) => s + Number(o.total), 0);
      const todayRev = activeOrders.filter((o) => o.created_at >= todayStr).reduce((s, o) => s + Number(o.total), 0);
      const monthRev = activeOrders.filter((o) => o.created_at >= monthStart).reduce((s, o) => s + Number(o.total), 0);

      let totalExpenses = new Decimal(0);
      let totalRevenue = new Decimal(0);
      entries.forEach((je) => {
        (je.journal_lines || []).forEach((line) => {
          if (line.account?.type === 'revenue') {
            if (line.credit) totalRevenue = totalRevenue.plus(line.credit);
            if (line.debit) totalRevenue = totalRevenue.minus(line.debit);
          }
          if (line.account?.type === 'expense') {
            if (line.debit) totalExpenses = totalExpenses.plus(line.debit);
            if (line.credit) totalExpenses = totalExpenses.minus(line.credit);
          }
        });
      });

      const pendingOrders = orders.filter((o) => o.status === 'pending').length;
      const lowStockCount = products.filter((p) => p.stock < 5).length;
      const todayDate = todayStr;
      const overdueInvoices = invoices.filter(
        (inv) => (inv.status === 'sent' || inv.status === 'overdue') && inv.due_date && inv.due_date < todayDate
      ).length;

      const avgOrder = activeOrders.length > 0 ? totalRev / activeOrders.length : 0;

      setData({
        orders,
        entries,
        accounts,
        invoices,
        products,
        todayRevenue: todayRev,
        monthRevenue: monthRev,
        totalRevenue: totalRev,
        totalExpenses: totalExpenses.toNumber(),
        netProfit: totalRevenue.minus(totalExpenses).toNumber(),
        pendingOrders,
        lowStockCount,
        overdueInvoices,
        totalCustomers: custRes.count || 0,
        avgOrderValue: avgOrder,
      });
      setLoading(false);
    };
    load();
  }, []);

  // 7-day sales trend
  const salesTrend = useMemo(() => {
    if (!data) return { labels: [], values: [] };
    const days: Record<string, number> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days[d.toISOString().split('T')[0]] = 0;
    }
    data.orders.filter((o) => o.status !== 'cancelled').forEach((o) => {
      const day = (o.created_at || '').slice(0, 10);
      if (day in days) days[day] += Number(o.total);
    });
    const labels = Object.keys(days).map((d) => {
      const dt = new Date(d);
      return `${dt.getDate()}/${dt.getMonth() + 1}`;
    });
    return { labels, values: Object.values(days) };
  }, [data]);

  // Order status distribution
  const statusDist = useMemo(() => {
    if (!data) return { labels: [], values: [] };
    const counts: Record<string, number> = {};
    data.orders.forEach((o) => {
      counts[o.status] = (counts[o.status] || 0) + 1;
    });
    const labelMap: Record<string, string> = {
      pending: 'قيد الانتظار', processing: 'قيد المعالجة',
      shipped: 'تم الشحن', delivered: 'تم التسليم', cancelled: 'ملغي',
    };
    return {
      labels: Object.keys(counts).map((k) => labelMap[k] || k),
      values: Object.values(counts),
    };
  }, [data]);

  if (loading || !data) {
    return (
      <AdminLayout activePage="executive">
        <div className="flex items-center justify-center h-96">
          <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
        </div>
      </AdminLayout>
    );
  }

  const profitMargin = data.totalRevenue > 0 ? (data.netProfit / data.totalRevenue) * 100 : 0;
  const healthScore = Math.max(0, Math.min(100,
    50 +
    (data.netProfit > 0 ? 20 : -10) +
    (data.lowStockCount < 5 ? 15 : -10) +
    (data.pendingOrders < 5 ? 15 : -10)
  ));

  return (
    <AdminLayout activePage="executive">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-neutral-900 flex items-center gap-2">
          <Activity className="w-7 h-7 text-primary-700" />
          اللوحة التنفيذية
        </h1>
        <p className="text-sm text-neutral-500 mt-1">نظرة شاملة 360° على أداء المتجر والوضع المالي</p>
      </div>

      {/* Top KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KPICard
          title="إيرادات الشهر"
          value={formatCurrency(data.monthRevenue)}
          icon={DollarSign}
          color="primary"
          subtitle={`${formatCurrency(data.todayRevenue)} اليوم`}
        />
        <KPICard
          title="صافي الربح"
          value={formatCurrency(data.netProfit)}
          icon={data.netProfit >= 0 ? TrendingUp : TrendingDown}
          color={data.netProfit >= 0 ? 'emerald' : 'red'}
          subtitle={`هامش ${profitMargin.toFixed(1)}%`}
        />
        <KPICard
          title="إجمالي الطلبات"
          value={formatNumber(data.orders.length)}
          icon={ShoppingBag}
          color="blue"
          subtitle={`${data.pendingOrders} قيد الانتظار`}
        />
        <KPICard
          title="متوسط قيمة الطلب"
          value={formatCurrency(data.avgOrderValue)}
          icon={Target}
          color="amber"
          subtitle={`${data.totalCustomers} عميل`}
        />
      </div>

      {/* Health score + alerts */}
      <div className="grid lg:grid-cols-3 gap-6 mb-6">
        {/* Health score gauge */}
        <div className="bg-white rounded-2xl border border-neutral-200 p-5">
          <h3 className="font-bold text-neutral-900 mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-500" />
            مؤشر الصحة العامة
          </h3>
          <div className="flex flex-col items-center">
            <div className="relative w-32 h-32 mb-3">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="52" fill="none" stroke="#f3f4f6" strokeWidth="10" />
                <circle
                  cx="60" cy="60" r="52" fill="none"
                  stroke={healthScore >= 70 ? '#10b981' : healthScore >= 40 ? '#f59e0b' : '#ef4444'}
                  strokeWidth="10" strokeLinecap="round"
                  strokeDasharray={`${(healthScore / 100) * 327} 327`}
                  className="transition-all duration-1000"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-3xl font-bold text-neutral-900">{healthScore}</span>
              </div>
            </div>
            <span className={`text-sm font-medium ${healthScore >= 70 ? 'text-emerald-600' : healthScore >= 40 ? 'text-amber-600' : 'text-red-600'}`}>
              {healthScore >= 70 ? 'أداء ممتاز' : healthScore >= 40 ? 'أداء مقبول' : 'يحتاج تحسين'}
            </span>
          </div>
        </div>

        {/* Alerts */}
        <div className="bg-white rounded-2xl border border-neutral-200 p-5 lg:col-span-2">
          <h3 className="font-bold text-neutral-900 mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            تنبيهات تتطلب إجراء
          </h3>
          <div className="space-y-3">
            {data.lowStockCount > 0 && (
              <AlertRow
                icon={Package}
                color="amber"
                title="مخزون منخفض"
                message={`${data.lowStockCount} منتج بحاجة إلى إعادة طلب`}
                action={() => navigate('/admin/products')}
                actionLabel="عرض المنتجات"
              />
            )}
            {data.pendingOrders > 0 && (
              <AlertRow
                icon={Clock}
                color="blue"
                title="طلبات قيد الانتظار"
                message={`${data.pendingOrders} طلب بانتظار المعالجة`}
                action={() => navigate('/admin/orders')}
                actionLabel="معالجة الطلبات"
              />
            )}
            {data.overdueInvoices > 0 && (
              <AlertRow
                icon={Receipt}
                color="red"
                title="فواتير متأخرة"
                message={`${data.overdueInvoices} فاتورة تجاوزت تاريخ الاستحقاق`}
                action={() => navigate('/admin/invoices')}
                actionLabel="عرض الفواتير"
              />
            )}
            {data.lowStockCount === 0 && data.pendingOrders === 0 && data.overdueInvoices === 0 && (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-50">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                </div>
                <span className="text-sm text-emerald-700">كل المؤشرات سليمة — لا توجد تنبيهات</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-3 gap-6 mb-6">
        {/* 7-day sales trend */}
        <div className="bg-white rounded-2xl border border-neutral-200 p-5 lg:col-span-2">
          <h3 className="font-bold text-neutral-900 mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary-700" />
            مبيعات آخر 7 أيام
          </h3>
          {salesTrend.values.some((v) => v > 0) ? (
            <Line
              data={{
                labels: salesTrend.labels,
                datasets: [{
                  label: 'الإيرادات اليومية',
                  data: salesTrend.values,
                  borderColor: '#0d9488',
                  backgroundColor: 'rgba(13, 148, 136, 0.1)',
                  fill: true,
                  tension: 0.4,
                  pointRadius: 4,
                  pointBackgroundColor: '#0d9488',
                }],
              }}
              options={{
                responsive: true,
                plugins: { legend: { display: false } },
                scales: { y: { beginAtZero: true, ticks: { font: { family: 'Tajawal' } } } },
              }}
            />
          ) : (
            <div className="h-48 flex items-center justify-center text-neutral-400 text-sm">لا توجد مبيعات هذا الأسبوع</div>
          )}
        </div>

        {/* Order status distribution */}
        <div className="bg-white rounded-2xl border border-neutral-200 p-5">
          <h3 className="font-bold text-neutral-900 mb-4">توزيع حالات الطلبات</h3>
          {statusDist.values.length > 0 ? (
            <Doughnut
              data={{
                labels: statusDist.labels,
                datasets: [{
                  data: statusDist.values,
                  backgroundColor: ['#f59e0b', '#3b82f6', '#8b5cf6', '#10b981', '#ef4444'],
                  borderWidth: 2,
                  borderColor: '#fff',
                }],
              }}
              options={{
                responsive: true,
                plugins: { legend: { position: 'bottom', labels: { font: { family: 'Tajawal', size: 11 } } } },
              }}
            />
          ) : (
            <div className="h-48 flex items-center justify-center text-neutral-400 text-sm">لا توجد طلبات</div>
          )}
        </div>
      </div>

      {/* Financial summary + quick links */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Financial snapshot */}
        <div className="bg-white rounded-2xl border border-neutral-200 p-5">
          <h3 className="font-bold text-neutral-900 mb-4 flex items-center gap-2">
            <FileBarChart className="w-5 h-5 text-primary-700" />
            الملخص المالي
          </h3>
          <div className="space-y-3">
            <FinRow label="إجمالي الإيرادات" value={formatCurrency(data.totalRevenue)} color="text-emerald-600" />
            <FinRow label="إجمالي المصروفات" value={formatCurrency(data.totalExpenses)} color="text-amber-600" />
            <div className="border-t-2 border-neutral-100 pt-3">
              <FinRow label="صافي الربح" value={formatCurrency(data.netProfit)} color={data.netProfit >= 0 ? 'text-primary-700' : 'text-red-600'} bold />
            </div>
            <FinRow label="هامش الربح" value={`${profitMargin.toFixed(1)}%`} color="text-blue-600" />
          </div>
          <button
            onClick={() => navigate('/admin/reports')}
            className="w-full mt-4 py-2.5 rounded-xl bg-primary-50 text-primary-700 text-sm font-medium hover:bg-primary-100 transition"
          >
            التقارير المالية التفصيلية
          </button>
        </div>

        {/* Quick actions */}
        <div className="bg-white rounded-2xl border border-neutral-200 p-5">
          <h3 className="font-bold text-neutral-900 mb-4 flex items-center gap-2">
            <Brain className="w-5 h-5 text-primary-700" />
            إجراءات سريعة
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <QuickAction icon={ShoppingBag} label="الطلبات" path="/admin/orders" color="bg-blue-50 text-blue-700" />
            <QuickAction icon={Package} label="المنتجات" path="/admin/products" color="bg-amber-50 text-amber-700" />
            <QuickAction icon={Receipt} label="الفواتير" path="/admin/invoices" color="bg-primary-50 text-primary-700" />
            <QuickAction icon={TrendingUp} label="التنبؤ" path="/admin/forecast" color="bg-emerald-50 text-emerald-700" />
            <QuickAction icon={FileBarChart} label="التقارير" path="/admin/reports" color="bg-purple-50 text-purple-700" />
            <QuickAction icon={DollarSign} label="المحاسبة" path="/admin/journal" color="bg-red-50 text-red-700" />
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

function KPICard({
  title, value, icon: Icon, color, subtitle,
}: { title: string; value: string; icon: React.ElementType; color: string; subtitle: string }) {
  const colors: Record<string, string> = {
    primary: 'bg-primary-50 text-primary-700',
    emerald: 'bg-emerald-50 text-emerald-700',
    blue: 'bg-blue-50 text-blue-700',
    amber: 'bg-amber-50 text-amber-700',
    red: 'bg-red-50 text-red-700',
  };
  return (
    <div className="bg-white rounded-2xl border border-neutral-200 p-5 card-hover">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-3 ${colors[color]}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="text-xs text-neutral-500 mb-1">{title}</div>
      <div className="text-2xl font-bold text-neutral-900">{value}</div>
      <div className="text-xs text-neutral-400 mt-1 flex items-center gap-1">
        <ArrowUpRight className="w-3 h-3" />
        {subtitle}
      </div>
    </div>
  );
}

function AlertRow({
  icon: Icon, color, title, message, action, actionLabel,
}: {
  icon: React.ElementType; color: string; title: string; message: string;
  action: () => void; actionLabel: string;
}) {
  const colors: Record<string, string> = {
    amber: 'bg-amber-50 text-amber-600',
    blue: 'bg-blue-50 text-blue-600',
    red: 'bg-red-50 text-red-600',
  };
  return (
    <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-neutral-50 hover:bg-neutral-100 transition">
      <div className="flex items-center gap-3 min-w-0">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${colors[color]}`}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <div className="font-medium text-sm text-neutral-900">{title}</div>
          <div className="text-xs text-neutral-500">{message}</div>
        </div>
      </div>
      <button
        onClick={action}
        className="text-xs font-medium text-primary-700 hover:text-primary-800 shrink-0"
      >
        {actionLabel}
      </button>
    </div>
  );
}

function FinRow({ label, value, color, bold }: { label: string; value: string; color: string; bold?: boolean }) {
  return (
    <div className="flex justify-between items-center text-sm">
      <span className={bold ? 'font-bold text-neutral-900' : 'text-neutral-600'}>{label}</span>
      <span className={`${bold ? 'font-bold' : 'font-medium'} ${color}`}>{value}</span>
    </div>
  );
}

function QuickAction({
  icon: Icon, label, path, color,
}: { icon: React.ElementType; label: string; path: string; color: string }) {
  return (
    <button
      onClick={() => navigate(path)}
      className="flex flex-col items-center gap-2 p-4 rounded-xl border border-neutral-100 hover:border-neutral-200 hover:shadow-md transition"
    >
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <span className="text-xs font-medium text-neutral-700">{label}</span>
    </button>
  );
}
