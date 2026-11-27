import { useEffect, useState } from 'react';
import { Wallet, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatCurrency, ACCOUNT_TYPE_LABELS } from '@/lib/format';
import { AdminLayout } from '@/components/admin/AdminLayout';
import type { Account, AccountType } from '@/types';

const TYPE_COLORS: Record<AccountType, string> = {
  asset: 'text-blue-600 bg-blue-50 border-blue-200',
  liability: 'text-red-600 bg-red-50 border-red-200',
  equity: 'text-purple-600 bg-purple-50 border-purple-200',
  revenue: 'text-emerald-600 bg-emerald-50 border-emerald-200',
  expense: 'text-amber-600 bg-amber-50 border-amber-200',
};

export function AdminAccounts() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('');

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('accounts').select('*').order('code');
    setAccounts(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = filterType ? accounts.filter((a) => a.type === filterType) : accounts;

  // Group by type
  const grouped = filtered.reduce((acc, a) => {
    if (!acc[a.type]) acc[a.type] = [];
    acc[a.type].push(a);
    return acc;
  }, {} as Record<string, Account[]>);

  const typeOrder: AccountType[] = ['asset', 'liability', 'equity', 'revenue', 'expense'];

  // Calculate totals per type
  const totalsByType = accounts.reduce((acc, a) => {
    acc[a.type] = (acc[a.type] || 0) + a.balance;
    return acc;
  }, {} as Record<string, number>);

  return (
    <AdminLayout activePage="accounts">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-neutral-900">دليل الحسابات</h1>
        <p className="text-sm text-neutral-500 mt-1">{accounts.length} حساب</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        {typeOrder.map((t) => (
          <div key={t} className="bg-white rounded-xl border border-neutral-200 p-4">
            <div className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium border mb-2 ${TYPE_COLORS[t]}`}>
              {ACCOUNT_TYPE_LABELS[t]}
            </div>
            <div className="font-bold text-lg text-neutral-900">{formatCurrency(totalsByType[t] || 0)}</div>
            <div className="text-xs text-neutral-400 mt-0.5">{grouped[t]?.length || 0} حساب</div>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <button onClick={() => setFilterType('')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${!filterType ? 'bg-primary-700 text-white' : 'bg-white border border-neutral-200 text-neutral-600 hover:bg-neutral-50'}`}>
          الكل
        </button>
        {typeOrder.map((t) => (
          <button key={t} onClick={() => setFilterType(t)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${filterType === t ? 'bg-primary-700 text-white' : 'bg-white border border-neutral-200 text-neutral-600 hover:bg-neutral-50'}`}>
            {ACCOUNT_TYPE_LABELS[t]}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 text-primary-600 animate-spin" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-neutral-50 text-neutral-600 text-xs">
                  <th className="text-right px-4 py-3 font-medium">الرمز</th>
                  <th className="text-right px-4 py-3 font-medium">اسم الحساب</th>
                  <th className="text-right px-4 py-3 font-medium">النوع</th>
                  <th className="text-right px-4 py-3 font-medium">الرصيد</th>
                  <th className="text-center px-4 py-3 font-medium">الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-50">
                {typeOrder.map((type) => 
                  (grouped[type] || []).map((a) => (
                    <tr key={a.id} className="hover:bg-neutral-50 transition">
                      <td className="px-4 py-3 font-mono font-medium text-neutral-700">{a.code}</td>
                      <td className="px-4 py-3 font-medium text-neutral-900">{a.name}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${TYPE_COLORS[a.type]}`}>
                          {ACCOUNT_TYPE_LABELS[a.type]}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-semibold text-neutral-700">{formatCurrency(a.balance)}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-block w-2 h-2 rounded-full ${a.is_active ? 'bg-emerald-500' : 'bg-neutral-300'}`} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div className="p-12 text-center text-neutral-400">
                <Wallet className="w-12 h-12 mx-auto mb-3 opacity-30" />
                لا توجد حسابات
              </div>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
