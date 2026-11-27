import { useEffect, useState } from 'react';
import { Plus, Search, Pencil, Trash2, Package, X, AlertTriangle, Loader2, Download, FileSpreadsheet, QrCode } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatCurrency, formatNumber } from '@/lib/format';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { exporters } from '@/lib/exporters';
import { generateProductQR } from '@/lib/pdf';
import type { Product, Category } from '@/types';

export function AdminProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('products')
      .select('*, category:categories(*)')
      .order('created_at', { ascending: false });
    setProducts(data || []);
    const { data: cats } = await supabase.from('categories').select('*').order('sort_order');
    setCategories(cats || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.sku?.toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا المنتج؟')) return;
    await supabase.from('products').delete().eq('id', id);
    load();
  };

  const handleSave = async (data: Partial<Product>) => {
    if (editing) {
      await supabase.from('products').update({
        ...data,
        updated_at: new Date().toISOString(),
      }).eq('id', editing.id);
    } else {
      const slug = (data.name || '').toLowerCase().replace(/\s+/g, '-') + '-' + Date.now().toString().slice(-4);
      await supabase.from('products').insert({ ...data, slug });
    }
    setShowModal(false);
    setEditing(null);
    load();
  };

  return (
    <AdminLayout activePage="products">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">المنتجات</h1>
          <p className="text-sm text-neutral-500 mt-1">{formatNumber(products.length)} منتج</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => exporters.productsCSV(filtered)} disabled={filtered.length === 0}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-neutral-200 text-sm font-medium text-neutral-600 hover:bg-neutral-50 transition disabled:opacity-40">
            <Download className="w-4 h-4" /> CSV
          </button>
          <button onClick={() => exporters.productsExcel(filtered)} disabled={filtered.length === 0}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-neutral-200 text-sm font-medium text-neutral-600 hover:bg-neutral-50 transition disabled:opacity-40">
            <FileSpreadsheet className="w-4 h-4" /> Excel
          </button>
          <button
            onClick={() => { setEditing(null); setShowModal(true); }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary-700 text-white font-medium hover:bg-primary-800 transition shadow-lg shadow-primary-200"
          >
            <Plus className="w-4 h-4" />
            منتج جديد
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="ابحث باسم المنتج أو SKU..."
          className="w-full h-11 pr-10 pl-4 rounded-xl border border-neutral-200 bg-white outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 text-sm"
        />
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-6 h-6 text-primary-600 animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-neutral-50 text-neutral-600 text-xs">
                  <th className="text-right px-4 py-3 font-medium">المنتج</th>
                  <th className="text-right px-4 py-3 font-medium hidden md:table-cell">الفئة</th>
                  <th className="text-right px-4 py-3 font-medium">السعر</th>
                  <th className="text-right px-4 py-3 font-medium hidden sm:table-cell">التكلفة</th>
                  <th className="text-right px-4 py-3 font-medium">المخزون</th>
                  <th className="text-center px-4 py-3 font-medium">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-50">
                {filtered.map((p) => (
                  <tr key={p.id} className="hover:bg-neutral-50 transition">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg overflow-hidden bg-neutral-100 shrink-0">
                          {p.image_url && <img src={p.image_url} alt="" className="w-full h-full object-cover" />}
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium text-neutral-900 line-clamp-1">{p.name}</div>
                          <div className="text-xs text-neutral-400">{p.sku}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="px-2 py-1 rounded-lg bg-neutral-100 text-neutral-600 text-xs">
                        {p.category?.name || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-primary-700">{formatCurrency(p.price)}</td>
                    <td className="px-4 py-3 text-neutral-600 hidden sm:table-cell">{formatCurrency(p.cost)}</td>
                    <td className="px-4 py-3">
                      <span className={`font-medium ${p.stock <= 5 ? 'text-red-600' : 'text-neutral-700'}`}>
                        {p.stock}
                      </span>
                      {p.stock <= 5 && p.stock > 0 && (
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-500 inline mr-1" />
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={async () => {
                            const qr = await generateProductQR(p);
                            const w = window.open();
                            if (w) { w.document.write(`<img src="${qr}" style="width:300px"/>`); w.document.title = p.name; }
                          }}
                          className="p-2 rounded-lg text-neutral-600 hover:bg-neutral-100 transition"
                          title="رمز QR"
                        >
                          <QrCode className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => { setEditing(p); setShowModal(true); }}
                          className="p-2 rounded-lg text-blue-600 hover:bg-blue-50 transition"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(p.id)}
                          className="p-2 rounded-lg text-red-500 hover:bg-red-50 transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div className="p-12 text-center text-neutral-400">
                <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
                لا توجد منتجات
              </div>
            )}
          </div>
        )}
      </div>

      {showModal && (
        <ProductModal
          product={editing}
          categories={categories}
          onClose={() => { setShowModal(false); setEditing(null); }}
          onSave={handleSave}
        />
      )}
    </AdminLayout>
  );
}

interface ModalProps {
  product: Product | null;
  categories: Category[];
  onClose: () => void;
  onSave: (data: Partial<Product>) => void;
}

function ProductModal({ product, categories, onClose, onSave }: ModalProps) {
  const [form, setForm] = useState({
    name: product?.name || '',
    description: product?.description || '',
    price: product?.price || 0,
    cost: product?.cost || 0,
    stock: product?.stock || 0,
    sku: product?.sku || '',
    image_url: product?.image_url || '',
    category_id: product?.category_id || '',
    is_active: product?.is_active ?? true,
    is_featured: product?.is_featured ?? false,
  });
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await onSave({
      ...form,
      category_id: form.category_id || null,
      price: Number(form.price),
      cost: Number(form.cost),
      stock: Number(form.stock),
    });
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-scale-in">
        <div className="flex items-center justify-between p-5 border-b border-neutral-100 sticky top-0 bg-white z-10">
          <h3 className="font-bold text-lg">{product ? 'تعديل منتج' : 'منتج جديد'}</h3>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-neutral-100"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={submit} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">اسم المنتج *</label>
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">الوصف</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3}
              className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1.5">السعر *</label>
              <input required type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
                className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1.5">التكلفة</label>
              <input type="number" step="0.01" value={form.cost} onChange={(e) => setForm({ ...form, cost: Number(e.target.value) })}
                className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1.5">المخزون *</label>
              <input required type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: Number(e.target.value) })}
                className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1.5">SKU</label>
              <input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">الفئة</label>
            <select value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 text-sm">
              <option value="">بدون فئة</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">رابط الصورة</label>
            <input value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 text-sm" />
          </div>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                className="w-4 h-4 accent-primary-600" />
              نشط
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={form.is_featured} onChange={(e) => setForm({ ...form, is_featured: e.target.checked })}
                className="w-4 h-4 accent-primary-600" />
              مميز
            </label>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={saving}
              className="flex-1 px-4 py-2.5 rounded-xl bg-primary-700 text-white font-medium hover:bg-primary-800 transition disabled:opacity-50 flex items-center justify-center gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {product ? 'حفظ التعديلات' : 'إضافة المنتج'}
            </button>
            <button type="button" onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-neutral-200 text-neutral-700 font-medium hover:bg-neutral-50 transition">
              إلغاء
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
