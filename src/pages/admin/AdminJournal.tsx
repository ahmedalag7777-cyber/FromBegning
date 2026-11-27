import { useEffect, useState } from 'react';
import { BookOpen, Loader2, Plus, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatCurrency, formatDate } from '@/lib/format';
import { AdminLayout } from '@/components/admin/AdminLayout';
import type { JournalEntry, JournalLine, Account } from '@/types';

export function AdminJournal() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selected, setSelected] = useState<JournalEntry | null>(null);
  const [lines, setLines] = useState<JournalLine[]>([]);

  const load = async () => {
    setLoading(true);
    const [jeRes, accRes] = await Promise.all([
      supabase.from('journal_entries').select('*').order('entry_date', { ascending: false }),
      supabase.from('accounts').select('*').eq('is_active', true).order('code'),
    ]);
    setEntries(jeRes.data || []);
    setAccounts(accRes.data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const viewEntry = async (je: JournalEntry) => {
    setSelected(je);
    const { data } = await supabase
      .from('journal_lines')
      .select('*, account:accounts(*)')
      .eq('entry_id', je.id)
      .order('line_order');
    setLines(data || []);
  };

  return (
    <AdminLayout activePage="journal">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">القيود المحاسبية</h1>
          <p className="text-sm text-neutral-500 mt-1">{entries.length} قيد</p>
        </div>
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary-700 text-white font-medium hover:bg-primary-800 transition shadow-lg shadow-primary-200">
          <Plus className="w-4 h-4" />
          قيد جديد
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 text-primary-600 animate-spin" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-neutral-50 text-neutral-600 text-xs">
                  <th className="text-right px-4 py-3 font-medium">رقم القيد</th>
                  <th className="text-right px-4 py-3 font-medium">التاريخ</th>
                  <th className="text-right px-4 py-3 font-medium">الوصف</th>
                  <th className="text-right px-4 py-3 font-medium hidden sm:table-cell">المرجع</th>
                  <th className="text-right px-4 py-3 font-medium">مدين</th>
                  <th className="text-right px-4 py-3 font-medium">دائن</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-50">
                {entries.map((je) => (
                  <tr key={je.id} onClick={() => viewEntry(je)} className="hover:bg-neutral-50 cursor-pointer transition">
                    <td className="px-4 py-3 font-mono font-medium">{je.entry_number}</td>
                    <td className="px-4 py-3 text-neutral-600 text-xs">{formatDate(je.entry_date)}</td>
                    <td className="px-4 py-3 text-neutral-700 max-w-xs truncate">{je.description}</td>
                    <td className="px-4 py-3 text-neutral-500 text-xs hidden sm:table-cell">{je.reference || '—'}</td>
                    <td className="px-4 py-3 font-semibold text-blue-600">{formatCurrency(je.total_debit)}</td>
                    <td className="px-4 py-3 font-semibold text-emerald-600">{formatCurrency(je.total_credit)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {entries.length === 0 && (
              <div className="p-12 text-center text-neutral-400">
                <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
                لا توجد قيود
              </div>
            )}
          </div>
        )}
      </div>

      {/* View modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSelected(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-scale-in">
            <div className="flex items-center justify-between p-5 border-b border-neutral-100 sticky top-0 bg-white">
              <div>
                <h3 className="font-bold text-lg">قيد محاسبي</h3>
                <p className="text-sm text-neutral-500 font-mono">{selected.entry_number}</p>
              </div>
              <button onClick={() => setSelected(null)} className="p-2 rounded-lg hover:bg-neutral-100"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3 p-4 rounded-xl bg-neutral-50 text-sm">
                <div><span className="text-neutral-500">التاريخ: </span><span className="font-medium">{formatDate(selected.entry_date)}</span></div>
                <div><span className="text-neutral-500">المرجع: </span><span className="font-medium">{selected.reference || '—'}</span></div>
                <div className="col-span-2"><span className="text-neutral-500">الوصف: </span><span className="font-medium">{selected.description}</span></div>
              </div>
              <div className="border border-neutral-200 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-neutral-50">
                    <tr>
                      <th className="text-right px-3 py-2 font-medium text-xs text-neutral-600">الحساب</th>
                      <th className="text-left px-3 py-2 font-medium text-xs text-neutral-600">مدين</th>
                      <th className="text-left px-3 py-2 font-medium text-xs text-neutral-600">دائن</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-50">
                    {lines.map((l) => (
                      <tr key={l.id}>
                        <td className="px-3 py-2">
                          <div className="font-medium">{l.account?.name || '—'}</div>
                          <div className="text-xs text-neutral-400 font-mono">{l.account?.code}</div>
                        </td>
                        <td className="px-3 py-2 text-left font-semibold text-blue-600">{l.debit > 0 ? formatCurrency(l.debit) : '—'}</td>
                        <td className="px-3 py-2 text-left font-semibold text-emerald-600">{l.credit > 0 ? formatCurrency(l.credit) : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-neutral-50 font-bold">
                    <tr>
                      <td className="px-3 py-2">الإجمالي</td>
                      <td className="px-3 py-2 text-left text-blue-600">{formatCurrency(selected.total_debit)}</td>
                      <td className="px-3 py-2 text-left text-emerald-600">{formatCurrency(selected.total_credit)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New entry modal */}
      {showModal && (
        <JournalModal accounts={accounts} onClose={() => setShowModal(false)} onSaved={load} />
      )}
    </AdminLayout>
  );
}

interface JournalModalProps {
  accounts: Account[];
  onClose: () => void;
  onSaved: () => void;
}

function JournalModal({ accounts, onClose, onSaved }: JournalModalProps) {
  const [description, setDescription] = useState('');
  const [reference, setReference] = useState('');
  const [entryLines, setEntryLines] = useState<{ account_id: string; debit: number; credit: number }[]>([
    { account_id: '', debit: 0, credit: 0 },
    { account_id: '', debit: 0, credit: 0 },
  ]);
  const [saving, setSaving] = useState(false);

  const totalDebit = entryLines.reduce((s, l) => s + Number(l.debit || 0), 0);
  const totalCredit = entryLines.reduce((s, l) => s + Number(l.credit || 0), 0);
  const isBalanced = totalDebit > 0 && totalDebit === totalCredit;

  const updateLine = (idx: number, field: string, value: string | number) => {
    setEntryLines(prev => prev.map((l, i) => i === idx ? { ...l, [field]: value } : l));
  };

  const addLine = () => setEntryLines(prev => [...prev, { account_id: '', debit: 0, credit: 0 }]);
  const removeLine = (idx: number) => setEntryLines(prev => prev.filter((_, i) => i !== idx));

  const save = async () => {
    if (!isBalanced || !description) return;
    setSaving(true);
    try {
      const entryNum = `JE-${Date.now().toString().slice(-8)}`;
      const { data: je, error } = await supabase.from('journal_entries').insert({
        entry_number: entryNum,
        entry_date: new Date().toISOString().split('T')[0],
        description,
        reference: reference || null,
        reference_type: 'manual',
        total_debit: totalDebit,
        total_credit: totalCredit,
      }).select('id').single();

      if (error || !je) throw error;

      const linesToInsert = entryLines
        .filter((l) => l.account_id && (l.debit > 0 || l.credit > 0))
        .map((l, i) => ({
          entry_id: je.id,
          account_id: l.account_id,
          debit: Number(l.debit),
          credit: Number(l.credit),
          line_order: i + 1,
        }));

      await supabase.from('journal_lines').insert(linesToInsert);
      onSaved();
      onClose();
    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء حفظ القيد');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-scale-in">
        <div className="flex items-center justify-between p-5 border-b border-neutral-100 sticky top-0 bg-white z-10">
          <h3 className="font-bold text-lg">قيد محاسبي جديد</h3>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-neutral-100"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1.5">الوصف *</label>
              <input value={description} onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1.5">المرجع</label>
              <input value={reference} onChange={(e) => setReference(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 text-sm" />
            </div>
          </div>

          <div className="border border-neutral-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-neutral-50">
                <tr>
                  <th className="text-right px-3 py-2 font-medium text-xs text-neutral-600">الحساب</th>
                  <th className="text-left px-3 py-2 font-medium text-xs text-neutral-600 w-28">مدين</th>
                  <th className="text-left px-3 py-2 font-medium text-xs text-neutral-600 w-28">دائن</th>
                  <th className="w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-50">
                {entryLines.map((l, i) => (
                  <tr key={i}>
                    <td className="px-3 py-2">
                      <select value={l.account_id} onChange={(e) => updateLine(i, 'account_id', e.target.value)}
                        className="w-full px-2 py-1.5 rounded-lg border border-neutral-200 text-xs outline-none focus:border-primary-400">
                        <option value="">اختر حساب...</option>
                        {accounts.map((a) => <option key={a.id} value={a.id}>{a.code} - {a.name}</option>)}
                      </select>
                    </td>
                    <td className="px-3 py-2">
                      <input type="number" step="0.01" value={l.debit || ''} onChange={(e) => updateLine(i, 'debit', Number(e.target.value))}
                        className="w-full px-2 py-1.5 rounded-lg border border-neutral-200 text-xs text-left outline-none focus:border-primary-400" />
                    </td>
                    <td className="px-3 py-2">
                      <input type="number" step="0.01" value={l.credit || ''} onChange={(e) => updateLine(i, 'credit', Number(e.target.value))}
                        className="w-full px-2 py-1.5 rounded-lg border border-neutral-200 text-xs text-left outline-none focus:border-primary-400" />
                    </td>
                    <td className="px-3 py-2 text-center">
                      {entryLines.length > 2 && (
                        <button onClick={() => removeLine(i)} className="text-red-400 hover:text-red-600"><X className="w-4 h-4" /></button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-neutral-50 font-bold">
                <tr>
                  <td className="px-3 py-2 text-xs">الإجمالي</td>
                  <td className="px-3 py-2 text-left text-blue-600 text-xs">{formatCurrency(totalDebit)}</td>
                  <td className="px-3 py-2 text-left text-emerald-600 text-xs">{formatCurrency(totalCredit)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="flex items-center justify-between">
            <button onClick={addLine} className="text-sm text-primary-700 hover:text-primary-800 flex items-center gap-1">
              <Plus className="w-4 h-4" /> إضافة سطر
            </button>
            <div className={`text-sm font-medium ${isBalanced ? 'text-emerald-600' : 'text-red-500'}`}>
              {isBalanced ? '✓ القيد متوازن' : 'القيد غير متوازن'}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button onClick={save} disabled={!isBalanced || !description || saving}
              className="flex-1 px-4 py-2.5 rounded-xl bg-primary-700 text-white font-medium hover:bg-primary-800 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              حفظ القيد
            </button>
            <button onClick={onClose} className="px-4 py-2.5 rounded-xl border border-neutral-200 text-neutral-700 font-medium hover:bg-neutral-50 transition">
              إلغاء
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
