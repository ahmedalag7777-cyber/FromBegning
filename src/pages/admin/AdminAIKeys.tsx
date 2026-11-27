import { useState, useEffect, useCallback } from 'react';
import { Key, Plus, Trash2, Power, Loader2, Shield, Eye, EyeOff } from 'lucide-react';
import { AdminLayout } from '@/components/admin/AdminLayout';

interface AIKey {
  id: string;
  provider: string;
  key_value: string;
  label: string | null;
  is_active: boolean;
  priority: number;
  created_at: string;
}

const PROVIDERS = [
  { id: 'groq', label: 'Groq', color: 'bg-orange-50 text-orange-700 border-orange-200' },
  { id: 'gemini', label: 'Google Gemini', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { id: 'openrouter', label: 'OpenRouter', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  { id: 'cloudflare', label: 'Cloudflare AI', color: 'bg-amber-50 text-amber-700 border-amber-200' },
];

const providerColor = (p: string) => PROVIDERS.find((x) => x.id === p)?.color || 'bg-neutral-50 text-neutral-700 border-neutral-200';

function endpoint() {
  const url = (import.meta.env.VITE_SUPABASE_URL as string) || '';
  return `${url}/functions/v1/ai-keys-mgmt`;
}

function authHeaders(): Record<string, string> {
  const secret = sessionStorage.getItem('admin_secret') || '';
  return { 'x-admin-secret': secret };
}

export function AdminAIKeys() {
  const [keys, setKeys] = useState<AIKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [needSecret, setNeedSecret] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const resp = await fetch(endpoint(), { headers: authHeaders() });
      if (resp.status === 401) { setNeedSecret(true); return; }
      if (!resp.ok) throw new Error('فشل تحميل المفاتيح');
      setKeys(await resp.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'خطأ غير معروف');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggleActive = async (k: AIKey) => {
    setSaving(true);
    try {
      await fetch(`${endpoint()}/${k.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ is_active: !k.is_active }),
      });
      setKeys((prev) => prev.map((x) => x.id === k.id ? { ...x, is_active: !x.is_active } : x));
    } finally {
      setSaving(false);
    }
  };

  const removeKey = async (k: AIKey) => {
    if (!confirm(`حذف مفتاح "${k.label || k.provider}"؟`)) return;
    setSaving(true);
    try {
      await fetch(`${endpoint()}/${k.id}`, { method: 'DELETE', headers: authHeaders() });
      setKeys((prev) => prev.filter((x) => x.id !== k.id));
    } finally {
      setSaving(false);
    }
  };

  const grouped = PROVIDERS.map((p) => ({
    ...p,
    keys: keys.filter((k) => k.provider === p.id).sort((a, b) => a.priority - b.priority),
  }));

  return (
    <AdminLayout activePage="ai-keys">
      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 flex items-center gap-2">
            <Key className="w-7 h-7 text-primary-700" />
            مفاتيح الذكاء الاصطناعي
          </h1>
          <p className="text-sm text-neutral-500 mt-1">
            إدارة مفاتيح المزودين — التبديل التلقائي عند استنفاد الحصة
          </p>
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary-600 text-white font-medium hover:bg-primary-700 transition shadow-lg shadow-primary-200"
        >
          <Plus className="w-5 h-5" />
          إضافة مفتاح
        </button>
      </div>

      {needSecret && (
        <SecretGate onUnlock={() => { setNeedSecret(false); load(); }} />
      )}

      {/* Security notice */}
      <div className="mb-6 p-4 rounded-2xl bg-primary-50 border border-primary-200 flex items-start gap-3">
        <Shield className="w-5 h-5 text-primary-700 shrink-0 mt-0.5" />
        <p className="text-sm text-primary-800">
          المفاتيح مخزّنة بأمان في قاعدة البيانات ولا يمكن للواجهة الوصول إليها مباشرة.
          يتم التحقق عبر دالة خادم خاصة. قيم المفاتيح مخفية جزئياً للحماية.
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-2xl bg-red-50 border border-red-200 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Add form */}
      {showAdd && (
        <AddKeyForm
          onClose={() => setShowAdd(false)}
          onAdded={() => { setShowAdd(false); load(); }}
        />
      )}

      {/* Keys by provider */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map((g) => (
            <div key={g.id} className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
              <div className="p-4 border-b border-neutral-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium border ${g.color}`}>
                    {g.label}
                  </span>
                  <span className="text-xs text-neutral-500">
                    {g.keys.length} مفتاح · {g.keys.filter((k) => k.is_active).length} نشط
                  </span>
                </div>
              </div>
              <div className="divide-y divide-neutral-50">
                {g.keys.length === 0 ? (
                  <div className="p-6 text-center text-sm text-neutral-400">
                    لا توجد مفاتيح — أضف مفتاحاً لتفعيل هذا المزود
                  </div>
                ) : (
                  g.keys.map((k) => (
                    <div key={k.id} className="p-4 flex items-center justify-between gap-4 hover:bg-neutral-50 transition">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${k.is_active ? 'bg-emerald-500' : 'bg-neutral-300'}`} />
                        <div className="min-w-0">
                          <div className="font-medium text-sm text-neutral-900 flex items-center gap-2">
                            {k.label || `مفتاح ${k.priority}`}
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-500">
                              أولوية {k.priority}
                            </span>
                          </div>
                          <code className="text-xs text-neutral-500 font-mono" dir="ltr">{k.key_value}</code>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => toggleActive(k)}
                          disabled={saving}
                          className={`p-2 rounded-lg transition ${
                            k.is_active
                              ? 'text-emerald-600 hover:bg-emerald-50'
                              : 'text-neutral-400 hover:bg-neutral-100'
                          }`}
                          title={k.is_active ? 'تعطيل' : 'تفعيل'}
                        >
                          <Power className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => removeKey(k)}
                          disabled={saving}
                          className="p-2 rounded-lg text-red-500 hover:bg-red-50 transition"
                          title="حذف"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </AdminLayout>
  );
}

function SecretGate({ onUnlock }: { onUnlock: () => void }) {
  const [value, setValue] = useState('');
  return (
    <div className="mb-6 bg-white rounded-2xl border border-neutral-200 p-6 max-w-md mx-auto">
      <div className="flex items-center gap-2 mb-3">
        <Shield className="w-5 h-5 text-primary-700" />
        <h3 className="font-bold text-neutral-900">هذه الصفحة محمية</h3>
      </div>
      <p className="text-sm text-neutral-500 mb-4">أدخل رمز المسؤول للوصول إلى إدارة المفاتيح.</p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          sessionStorage.setItem('admin_secret', value);
          onUnlock();
        }}
        className="flex gap-2"
      >
        <input
          type="password"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="رمز المسؤول"
          dir="ltr"
          className="flex-1 h-10 px-3 rounded-xl border border-neutral-200 outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 text-sm font-mono"
        />
        <button
          type="submit"
          disabled={!value}
          className="px-4 py-2.5 rounded-xl bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 transition disabled:opacity-40"
        >
          فتح
        </button>
      </form>
    </div>
  );
}

function AddKeyForm({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
  const [provider, setProvider] = useState('groq');
  const [keyValue, setKeyValue] = useState('');
  const [label, setLabel] = useState('');
  const [priority, setPriority] = useState(1);
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyValue.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const resp = await fetch(endpoint(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({
          provider,
          key_value: keyValue.trim(),
          label: label.trim() || null,
          priority,
        }),
      });
      if (!resp.ok) {
        const d = await resp.json().catch(() => ({}));
        throw new Error(d.error || 'فشل إضافة المفتاح');
      }
      onAdded();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'خطأ');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mb-6 bg-white rounded-2xl border border-neutral-200 p-5 animate-slide-up">
      <h3 className="font-bold text-neutral-900 mb-4">إضافة مفتاح جديد</h3>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1.5">المزود</label>
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              className="w-full h-10 px-3 rounded-xl border border-neutral-200 outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 text-sm bg-white"
            >
              {PROVIDERS.map((p) => (
                <option key={p.id} value={p.id}>{p.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1.5">الأولوية (1 = الأعلى)</label>
            <input
              type="number"
              min={1}
              max={99}
              value={priority}
              onChange={(e) => setPriority(Number(e.target.value))}
              className="w-full h-10 px-3 rounded-xl border border-neutral-200 outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 text-sm"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-neutral-600 mb-1.5">
            {provider === 'cloudflare' ? 'القيمة (account_id:api_token)' : 'المفتاح (API Key)'}
          </label>
          <div className="relative">
            <input
              type={showKey ? 'text' : 'password'}
              value={keyValue}
              onChange={(e) => setKeyValue(e.target.value)}
              placeholder={provider === 'cloudflare' ? 'account_id:token' : 'sk-...'}
              dir="ltr"
              className="w-full h-10 px-3 pr-10 rounded-xl border border-neutral-200 outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 text-sm font-mono text-left"
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="absolute left-2 top-1/2 -translate-y-1/2 p-1 text-neutral-400 hover:text-neutral-600"
            >
              {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-neutral-600 mb-1.5">تسمية اختيارية</label>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="مثال: حساب العمل الرئيسي"
            className="w-full h-10 px-3 rounded-xl border border-neutral-200 outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 text-sm"
          />
        </div>
        {error && <div className="text-sm text-red-600">{error}</div>}
        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={saving || !keyValue.trim()}
            className="px-5 py-2.5 rounded-xl bg-primary-600 text-white font-medium hover:bg-primary-700 transition disabled:opacity-40 flex items-center gap-2"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            حفظ المفتاح
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-neutral-200 text-neutral-600 font-medium hover:bg-neutral-50 transition"
          >
            إلغاء
          </button>
        </div>
      </form>
    </div>
  );
}
