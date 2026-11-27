import { useEffect, useState } from 'react';
import { Settings as SettingsIcon, Save, Loader2, Check } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { AdminLayout } from '@/components/admin/AdminLayout';
import type { StoreSettings } from '@/types';

export function AdminSettings() {
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    supabase.from('store_settings').select('*').maybeSingle().then(({ data }) => {
      if (data) setSettings(data);
      setLoading(false);
    });
  }, []);

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    await supabase.from('store_settings').update({
      store_name: settings.store_name,
      store_email: settings.store_email,
      store_phone: settings.store_phone,
      store_address: settings.store_address,
      currency: settings.currency,
      currency_symbol: settings.currency_symbol,
      tax_rate: settings.tax_rate,
      tax_enabled: settings.tax_enabled,
      shipping_flat_rate: settings.shipping_flat_rate,
      free_shipping_threshold: settings.free_shipping_threshold,
      low_stock_threshold: settings.low_stock_threshold,
      updated_at: new Date().toISOString(),
    }).eq('id', settings.id);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  if (loading) {
    return (
      <AdminLayout activePage="settings">
        <div className="flex items-center justify-center h-96"><Loader2 className="w-8 h-8 text-primary-600 animate-spin" /></div>
      </AdminLayout>
    );
  }

  if (!settings) {
    return (
      <AdminLayout activePage="settings">
        <div className="text-center py-20 text-neutral-400">لا توجد إعدادات</div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout activePage="settings">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-neutral-900">إعدادات المتجر</h1>
        <p className="text-sm text-neutral-500 mt-1">تعديل معلومات وإعدادات المتجر</p>
      </div>

      <div className="max-w-2xl space-y-6">
        {/* Store info */}
        <div className="bg-white rounded-2xl border border-neutral-200 p-6">
          <h3 className="font-bold text-neutral-900 mb-4 flex items-center gap-2">
            <SettingsIcon className="w-5 h-5 text-primary-700" />
            معلومات المتجر
          </h3>
          <div className="space-y-4">
            <Field label="اسم المتجر" value={settings.store_name} onChange={(v) => setSettings({ ...settings, store_name: v })} />
            <div className="grid grid-cols-2 gap-4">
              <Field label="البريد الإلكتروني" value={settings.store_email || ''} onChange={(v) => setSettings({ ...settings, store_email: v })} />
              <Field label="رقم الهاتف" value={settings.store_phone || ''} onChange={(v) => setSettings({ ...settings, store_phone: v })} />
            </div>
            <Field label="العنوان" value={settings.store_address || ''} onChange={(v) => setSettings({ ...settings, store_address: v })} />
          </div>
        </div>

        {/* Tax & currency */}
        <div className="bg-white rounded-2xl border border-neutral-200 p-6">
          <h3 className="font-bold text-neutral-900 mb-4">الضريبة والعملة</h3>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Field label="العملة" value={settings.currency} onChange={(v) => setSettings({ ...settings, currency: v })} />
              <Field label="رمز العملة" value={settings.currency_symbol} onChange={(v) => setSettings({ ...settings, currency_symbol: v })} />
            </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={settings.tax_enabled} onChange={(e) => setSettings({ ...settings, tax_enabled: e.target.checked })}
                  className="w-4 h-4 accent-primary-600" />
                تفعيل الضريبة
              </label>
              <div className="flex-1">
                <label className="block text-sm font-medium text-neutral-700 mb-1.5">نسبة الضريبة (%)</label>
                <input type="number" step="0.01" value={settings.tax_rate} onChange={(e) => setSettings({ ...settings, tax_rate: Number(e.target.value) })}
                  className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 text-sm" />
              </div>
            </div>
          </div>
        </div>

        {/* Shipping */}
        <div className="bg-white rounded-2xl border border-neutral-200 p-6">
          <h3 className="font-bold text-neutral-900 mb-4">الشحن</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1.5">رسوم الشحن</label>
              <input type="number" step="0.01" value={settings.shipping_flat_rate} onChange={(e) => setSettings({ ...settings, shipping_flat_rate: Number(e.target.value) })}
                className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1.5">حد الشحن المجاني</label>
              <input type="number" step="0.01" value={settings.free_shipping_threshold} onChange={(e) => setSettings({ ...settings, free_shipping_threshold: Number(e.target.value) })}
                className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 text-sm" />
            </div>
          </div>
        </div>

        {/* Inventory */}
        <div className="bg-white rounded-2xl border border-neutral-200 p-6">
          <h3 className="font-bold text-neutral-900 mb-4">المخزون</h3>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">حد تنبيه المخزون المنخفض</label>
            <input type="number" value={settings.low_stock_threshold} onChange={(e) => setSettings({ ...settings, low_stock_threshold: Number(e.target.value) })}
              className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 text-sm" />
          </div>
        </div>

        {/* Save button */}
        <div className="flex justify-end">
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-primary-700 text-white font-semibold hover:bg-primary-800 transition shadow-lg shadow-primary-200 disabled:opacity-50">
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : saved ? <Check className="w-5 h-5" /> : <Save className="w-5 h-5" />}
            {saved ? 'تم الحفظ' : 'حفظ التغييرات'}
          </button>
        </div>
      </div>
    </AdminLayout>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-sm font-medium text-neutral-700 mb-1.5">{label}</label>
      <input value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 text-sm" />
    </div>
  );
}
