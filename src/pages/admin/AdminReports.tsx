import { useEffect, useState, useMemo } from 'react';
import { TrendingUp, TrendingDown, Wallet, Loader2, FileBarChart, Download } from 'lucide-react';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, ArcElement, Title, Tooltip, Legend, Filler
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import Decimal from 'decimal.js';
import { supabase } from '@/lib/supabase';
import { formatCurrency, ACCOUNT_TYPE_LABELS } from '@/lib/format';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { exporters } from '@/lib/exporters';
import type { JournalEntry, Account } from '@/types';

ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, ArcElement, Title, Tooltip, Legend, Filler
);

export function AdminReports() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [jeRes, accRes] = await Promise.all([
        supabase.from('journal_entries').select('*, journal_lines!inner(account_id, debit, credit, account:accounts!inner(type, code, name))').order('entry_date'),
        supabase.from('accounts').select('*').order('code'),
      ]);
      setEntries(jeRes.data || []);
      setAccounts(accRes.data || []);
      setLoading(false);
    };
    load();
  }, []);

  // Calculate financial summary using Decimal.js for precision
  const summary = useMemo(() => {
    let totalRevenue = new Decimal(0);
    let totalExpenses = new Decimal(0);
    let totalAssets = new Decimal(0);
    let totalLiabilities = new Decimal(0);
    let totalEquity = new Decimal(0);

    const accountBalances: Record<string, Decimal> = {};

    entries.forEach((je) => {
      (je.journal_lines || []).forEach((line) => {
        const acc = line.account;
        if (!acc) return;
        const accId = acc.id || acc.code;
        if (!accountBalances[accId]) accountBalances[accId] = new Decimal(0);
        
        if (line.debit) accountBalances[accId] = accountBalances[accId].plus(line.debit);
        if (line.credit) accountBalances[accId] = accountBalances[accId].minus(line.credit);

        if (acc.type === 'revenue') {
          if (line.credit) totalRevenue = totalRevenue.plus(line.credit);
          if (line.debit) totalRevenue = totalRevenue.minus(line.debit);
        } else if (acc.type === 'expense') {
          if (line.debit) totalExpenses = totalExpenses.plus(line.debit);
          if (line.credit) totalExpenses = totalExpenses.minus(line.credit);
        }
      });
    });

    // Calculate from accounts directly
    accounts.forEach((a) => {
      const balance = new Decimal(a.balance);
      if (a.type === 'asset') totalAssets = totalAssets.plus(balance);
      if (a.type === 'liability') totalLiabilities = totalLiabilities.plus(balance);
      if (a.type === 'equity') totalEquity = totalEquity.plus(balance);
    });

    const netProfit = totalRevenue.minus(totalExpenses);

    return {
      totalRevenue: totalRevenue.toNumber(),
      totalExpenses: totalExpenses.toNumber(),
      netProfit: netProfit.toNumber(),
      totalAssets: totalAssets.toNumber(),
      totalLiabilities: totalLiabilities.toNumber(),
      totalEquity: totalEquity.plus(netProfit).toNumber(),
      profitMargin: totalRevenue.gt(0) ? netProfit.div(totalRevenue).times(100).toNumber() : 0,
    };
  }, [entries, accounts]);

  // Monthly revenue chart data
  const monthlyData = useMemo(() => {
    const months: Record<string, { revenue: Decimal; expenses: Decimal }> = {};
    entries.forEach((je) => {
      const monthKey = je.entry_date?.slice(0, 7) || '2026-11';
      if (!months[monthKey]) months[monthKey] = { revenue: new Decimal(0), expenses: new Decimal(0) };
      (je.journal_lines || []).forEach((line) => {
        if (line.account?.type === 'revenue' && line.credit) {
          months[monthKey].revenue = months[monthKey].revenue.plus(line.credit);
        }
        if (line.account?.type === 'expense' && line.debit) {
          months[monthKey].expenses = months[monthKey].expenses.plus(line.debit);
        }
      });
    });

    const sortedMonths = Object.keys(months).sort();
    return {
      labels: sortedMonths.map((m) => {
        const [y, mo] = m.split('-');
        return `${mo}/${y.slice(2)}`;
      }),
      revenue: sortedMonths.map((m) => months[m].revenue.toNumber()),
      expenses: sortedMonths.map((m) => months[m].expenses.toNumber()),
    };
  }, [entries]);

  // Expense breakdown by account
  const expenseBreakdown = useMemo(() => {
    const byAccount: Record<string, number> = {};
    entries.forEach((je) => {
      (je.journal_lines || []).forEach((line) => {
        if (line.account?.type === 'expense' && line.debit) {
          const name = line.account.name;
          byAccount[name] = (byAccount[name] || 0) + Number(line.debit);
        }
      });
    });
    return {
      labels: Object.keys(byAccount),
      data: Object.values(byAccount),
    };
  }, [entries]);

  if (loading) {
    return (
      <AdminLayout activePage="reports">
        <div className="flex items-center justify-center h-96"><Loader2 className="w-8 h-8 text-primary-600 animate-spin" /></div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout activePage="reports">
      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">التقارير المالية</h1>
          <p className="text-sm text-neutral-500 mt-1">تحليل شامل للأداء المالي</p>
        </div>
        <button
          onClick={() => exporters.financialReportExcel(accounts, {
            totalRevenue: summary.totalRevenue,
            totalExpenses: summary.totalExpenses,
            netProfit: summary.netProfit,
          })}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white font-medium hover:bg-emerald-700 transition shadow-lg shadow-emerald-200"
        >
          <Download className="w-5 h-5" />
          تصدير Excel
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <ReportCard title="إجمالي الإيرادات" value={formatCurrency(summary.totalRevenue)} icon={TrendingUp} color="emerald" />
        <ReportCard title="إجمالي المصروفات" value={formatCurrency(summary.totalExpenses)} icon={TrendingDown} color="amber" />
        <ReportCard title="صافي الربح" value={formatCurrency(summary.netProfit)} icon={Wallet} color={summary.netProfit >= 0 ? 'primary' : 'red'} />
        <ReportCard title="هامش الربح" value={`${summary.profitMargin.toFixed(1)}%`} icon={FileBarChart} color="blue" />
      </div>

      {/* Balance sheet summary */}
      <div className="grid md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-2xl border border-neutral-200 p-5">
          <div className="text-xs text-neutral-500 mb-1">إجمالي الأصول</div>
          <div className="text-2xl font-bold text-blue-700">{formatCurrency(summary.totalAssets)}</div>
        </div>
        <div className="bg-white rounded-2xl border border-neutral-200 p-5">
          <div className="text-xs text-neutral-500 mb-1">إجمالي الخصوم</div>
          <div className="text-2xl font-bold text-red-700">{formatCurrency(summary.totalLiabilities)}</div>
        </div>
        <div className="bg-white rounded-2xl border border-neutral-200 p-5">
          <div className="text-xs text-neutral-500 mb-1">حقوق الملكية</div>
          <div className="text-2xl font-bold text-purple-700">{formatCurrency(summary.totalEquity)}</div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        {/* Revenue vs Expenses */}
        <div className="bg-white rounded-2xl border border-neutral-200 p-5">
          <h3 className="font-bold text-neutral-900 mb-4">الإيرادات مقابل المصروفات</h3>
          {monthlyData.labels.length > 0 ? (
            <Line
              data={{
                labels: monthlyData.labels,
                datasets: [
                  {
                    label: 'الإيرادات',
                    data: monthlyData.revenue,
                    borderColor: '#0d9488',
                    backgroundColor: 'rgba(13, 148, 136, 0.1)',
                    fill: true,
                    tension: 0.4,
                  },
                  {
                    label: 'المصروفات',
                    data: monthlyData.expenses,
                    borderColor: '#f59e0b',
                    backgroundColor: 'rgba(245, 158, 11, 0.1)',
                    fill: true,
                    tension: 0.4,
                  },
                ],
              }}
              options={{
                responsive: true,
                plugins: { legend: { position: 'bottom', labels: { font: { family: 'Tajawal' } } } },
                scales: { y: { beginAtZero: true, ticks: { font: { family: 'Tajawal' } } } },
              }}
            />
          ) : (
            <div className="h-48 flex items-center justify-center text-neutral-400 text-sm">لا توجد بيانات</div>
          )}
        </div>

        {/* Expense breakdown */}
        <div className="bg-white rounded-2xl border border-neutral-200 p-5">
          <h3 className="font-bold text-neutral-900 mb-4">توزيع المصروفات</h3>
          {expenseBreakdown.labels.length > 0 ? (
            <Doughnut
              data={{
                labels: expenseBreakdown.labels,
                datasets: [{
                  data: expenseBreakdown.data,
                  backgroundColor: ['#f59e0b', '#0d9488', '#3b82f6', '#8b5cf6', '#ec4899', '#ef4444', '#10b981', '#6366f1'],
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
            <div className="h-48 flex items-center justify-center text-neutral-400 text-sm">لا توجد مصروفات</div>
          )}
        </div>
      </div>

      {/* Income Statement */}
      <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden mb-6">
        <div className="p-5 border-b border-neutral-100">
          <h3 className="font-bold text-neutral-900">قائمة الدخل</h3>
        </div>
        <div className="p-5 space-y-3">
          <div className="flex justify-between text-sm pb-3 border-b border-neutral-100">
            <span className="font-medium text-neutral-700">الإيرادات</span>
            <span className="font-bold text-emerald-600">{formatCurrency(summary.totalRevenue)}</span>
          </div>

          {/* Revenue accounts detail */}
          {accounts.filter((a) => a.type === 'revenue').map((a) => (
            <div key={a.id} className="flex justify-between text-sm pl-6">
              <span className="text-neutral-600">{a.code} - {a.name}</span>
              <span className="text-neutral-700">{formatCurrency(a.balance)}</span>
            </div>
          ))}

          <div className="flex justify-between text-sm pt-3 pb-3 border-t border-neutral-100">
            <span className="font-medium text-neutral-700">المصروفات</span>
            <span className="font-bold text-amber-600">{formatCurrency(summary.totalExpenses)}</span>
          </div>

          {/* Expense accounts detail */}
          {accounts.filter((a) => a.type === 'expense').map((a) => (
            <div key={a.id} className="flex justify-between text-sm pl-6">
              <span className="text-neutral-600">{a.code} - {a.name}</span>
              <span className="text-neutral-700">{formatCurrency(a.balance)}</span>
            </div>
          ))}

          <div className="flex justify-between font-bold text-lg pt-3 border-t-2 border-neutral-200">
            <span>صافي الربح / الخسارة</span>
            <span className={summary.netProfit >= 0 ? 'text-primary-700' : 'text-red-600'}>
              {formatCurrency(summary.netProfit)}
            </span>
          </div>
        </div>
      </div>

      {/* Balance Sheet */}
      <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
        <div className="p-5 border-b border-neutral-100">
          <h3 className="font-bold text-neutral-900">الميزانية العمومية</h3>
        </div>
        <div className="grid md:grid-cols-2 divide-x divide-neutral-100" dir="rtl">
          {/* Assets */}
          <div className="p-5 space-y-2">
            <h4 className="font-semibold text-blue-700 mb-2">الأصول</h4>
            {accounts.filter((a) => a.type === 'asset').map((a) => (
              <div key={a.id} className="flex justify-between text-sm">
                <span className="text-neutral-600">{a.code} - {a.name}</span>
                <span className="text-neutral-700">{formatCurrency(a.balance)}</span>
              </div>
            ))}
            <div className="flex justify-between font-bold pt-2 border-t border-neutral-100">
              <span>الإجمالي</span>
              <span className="text-blue-700">{formatCurrency(summary.totalAssets)}</span>
            </div>
          </div>

          {/* Liabilities + Equity */}
          <div className="p-5 space-y-2">
            <h4 className="font-semibold text-red-700 mb-2">الخصوم وحقوق الملكية</h4>
            {accounts.filter((a) => a.type === 'liability').map((a) => (
              <div key={a.id} className="flex justify-between text-sm">
                <span className="text-neutral-600">{a.code} - {a.name}</span>
                <span className="text-neutral-700">{formatCurrency(a.balance)}</span>
              </div>
            ))}
            {accounts.filter((a) => a.type === 'equity').map((a) => (
              <div key={a.id} className="flex justify-between text-sm">
                <span className="text-neutral-600">{a.code} - {a.name}</span>
                <span className="text-neutral-700">{formatCurrency(a.balance + (a.code === '3000' ? summary.netProfit : 0))}</span>
              </div>
            ))}
            <div className="flex justify-between font-bold pt-2 border-t border-neutral-100">
              <span>الإجمالي</span>
              <span className="text-red-700">{formatCurrency(summary.totalLiabilities + summary.totalEquity)}</span>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

function ReportCard({ title, value, icon: Icon, color }: { title: string; value: string; icon: React.ElementType; color: string }) {
  const colors: Record<string, string> = {
    primary: 'bg-primary-50 text-primary-700',
    emerald: 'bg-emerald-50 text-emerald-700',
    amber: 'bg-amber-50 text-amber-700',
    blue: 'bg-blue-50 text-blue-700',
    red: 'bg-red-50 text-red-700',
  };
  return (
    <div className="bg-white rounded-2xl border border-neutral-200 p-5 card-hover">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-3 ${colors[color]}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="text-xs text-neutral-500 mb-1">{title}</div>
      <div className="text-2xl font-bold text-neutral-900">{value}</div>
    </div>
  );
}
