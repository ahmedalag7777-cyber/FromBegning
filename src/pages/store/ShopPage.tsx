import { useEffect, useState, useMemo } from 'react';
import { SlidersHorizontal, X, Search } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useRoute } from '@/lib/router';
import type { Product, Category } from '@/types';
import { ProductCard } from '@/components/store/ProductCard';

export function ShopPage() {
  const route = useRoute();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  const selectedCategory = route.params.category || '';
  const searchQuery = route.params.q || '';
  const onlyFeatured = route.params.featured === 'true';

  const [sortBy, setSortBy] = useState('newest');
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 1000]);
  const [localSearch, setLocalSearch] = useState(searchQuery);

  useEffect(() => {
    setLocalSearch(searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      let query = supabase.from('products').select('*, category:categories(*)').eq('is_active', true);

      if (selectedCategory) {
        const cat = categories.find((c) => c.slug === selectedCategory);
        if (cat) query = query.eq('category_id', cat.id);
      }

      const [prodRes, catRes] = await Promise.all([
        query.order('created_at', { ascending: false }),
        supabase.from('categories').order('sort_order'),
      ]);
      setProducts(prodRes.data || []);
      setCategories(catRes.data || []);
      setLoading(false);
    };
    load();
  }, [selectedCategory]);

  const filtered = useMemo(() => {
    let result = [...products];

    if (onlyFeatured) result = result.filter((p) => p.is_featured);
    if (localSearch) {
      const q = localSearch.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.description?.toLowerCase().includes(q) ||
          p.tags?.some((t) => t.toLowerCase().includes(q))
      );
    }
    result = result.filter((p) => p.price >= priceRange[0] && p.price <= priceRange[1]);

    switch (sortBy) {
      case 'price-low': result.sort((a, b) => a.price - b.price); break;
      case 'price-high': result.sort((a, b) => b.price - a.price); break;
      case 'rating': result.sort((a, b) => b.rating - a.rating); break;
      case 'name': result.sort((a, b) => a.name.localeCompare(b.name, 'ar')); break;
    }
    return result;
  }, [products, localSearch, priceRange, sortBy, onlyFeatured]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 animate-fade-in">
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-neutral-900">
          {selectedCategory
            ? categories.find((c) => c.slug === selectedCategory)?.name || 'المتجر'
            : onlyFeatured
            ? 'المنتجات المميزة'
            : 'كل المنتجات'}
        </h1>
        <p className="text-sm text-neutral-500 mt-1">
          {filtered.length} منتج متاح
        </p>
      </div>

      {/* Search bar */}
      <div className="relative mb-6">
        <input
          type="text"
          value={localSearch}
          onChange={(e) => setLocalSearch(e.target.value)}
          placeholder="ابحث في النتائج..."
          className="w-full h-12 pr-12 pl-4 rounded-xl border border-neutral-200 bg-white focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none transition"
        />
        <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
      </div>

      <div className="flex gap-6">
        {/* Sidebar (desktop) */}
        <aside className="hidden md:block w-64 shrink-0">
          <FilterPanel
            categories={categories}
            selectedCategory={selectedCategory}
            sortBy={sortBy}
            setSortBy={setSortBy}
            priceRange={priceRange}
            setPriceRange={setPriceRange}
          />
        </aside>

        {/* Mobile filter toggle */}
        <div className="flex-1">
          <div className="flex items-center justify-between mb-4 md:hidden">
            <button
              onClick={() => setShowFilters(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-neutral-200 bg-white text-sm font-medium"
            >
              <SlidersHorizontal className="w-4 h-4" />
              تصفية
            </button>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-2 rounded-xl border border-neutral-200 bg-white text-sm"
            >
              <option value="newest">الأحدث</option>
              <option value="price-low">السعر: الأقل</option>
              <option value="price-high">السعر: الأعلى</option>
              <option value="rating">الأعلى تقييماً</option>
            </select>
          </div>

          {/* Products grid */}
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="rounded-2xl border border-neutral-200 overflow-hidden">
                  <div className="aspect-square shimmer" />
                  <div className="p-4 space-y-2">
                    <div className="h-4 rounded shimmer" />
                    <div className="h-4 w-2/3 rounded shimmer" />
                  </div>
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-16 h-16 rounded-full bg-neutral-100 flex items-center justify-center mx-auto mb-4">
                <Search className="w-8 h-8 text-neutral-300" />
              </div>
              <h3 className="text-lg font-semibold text-neutral-700">لا توجد منتجات مطابقة</h3>
              <p className="text-sm text-neutral-500 mt-1">جرّب تعديل معايير البحث أو التصفية</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {filtered.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Mobile filter drawer */}
      {showFilters && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowFilters(false)} />
          <div className="absolute right-0 top-0 bottom-0 w-80 bg-white p-6 overflow-y-auto animate-slide-in-right">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg">التصفية</h3>
              <button onClick={() => setShowFilters(false)} className="p-2 rounded-lg hover:bg-neutral-100">
                <X className="w-5 h-5" />
              </button>
            </div>
            <FilterPanel
              categories={categories}
              selectedCategory={selectedCategory}
              sortBy={sortBy}
              setSortBy={setSortBy}
              priceRange={priceRange}
              setPriceRange={setPriceRange}
            />
          </div>
        </div>
      )}
    </div>
  );
}

interface FilterPanelProps {
  categories: Category[];
  selectedCategory: string;
  sortBy: string;
  setSortBy: (v: string) => void;
  priceRange: [number, number];
  setPriceRange: (v: [number, number]) => void;
}

function FilterPanel({ categories, selectedCategory, sortBy, setSortBy, priceRange, setPriceRange }: FilterPanelProps) {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-neutral-200 p-5">
        <h3 className="font-semibold text-sm text-neutral-900 mb-3">ترتيب حسب</h3>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="w-full px-3 py-2 rounded-xl border border-neutral-200 bg-neutral-50 text-sm outline-none focus:border-primary-400"
        >
          <option value="newest">الأحدث</option>
          <option value="price-low">السعر: الأقل أولاً</option>
          <option value="price-high">السعر: الأعلى أولاً</option>
          <option value="rating">الأعلى تقييماً</option>
          <option value="name">الاسم</option>
        </select>
      </div>

      <div className="bg-white rounded-2xl border border-neutral-200 p-5">
        <h3 className="font-semibold text-sm text-neutral-900 mb-3">الفئات</h3>
        <div className="space-y-1.5">
          <a
            href="#/shop"
            className={`block px-3 py-2 rounded-lg text-sm transition ${
              !selectedCategory ? 'bg-primary-50 text-primary-700 font-medium' : 'text-neutral-600 hover:bg-neutral-50'
            }`}
          >
            كل الفئات
          </a>
          {categories.map((cat) => (
            <a
              key={cat.id}
              href={`#/shop?category=${cat.slug}`}
              className={`block px-3 py-2 rounded-lg text-sm transition ${
                selectedCategory === cat.slug
                  ? 'bg-primary-50 text-primary-700 font-medium'
                  : 'text-neutral-600 hover:bg-neutral-50'
              }`}
            >
              {cat.name}
            </a>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-neutral-200 p-5">
        <h3 className="font-semibold text-sm text-neutral-900 mb-3">نطاق السعر</h3>
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm">
            <input
              type="number"
              value={priceRange[0]}
              onChange={(e) => setPriceRange([Number(e.target.value), priceRange[1]])}
              className="w-full px-3 py-2 rounded-lg border border-neutral-200 text-sm outline-none focus:border-primary-400"
              placeholder="من"
            />
            <span className="text-neutral-400">—</span>
            <input
              type="number"
              value={priceRange[1]}
              onChange={(e) => setPriceRange([priceRange[0], Number(e.target.value)])}
              className="w-full px-3 py-2 rounded-lg border border-neutral-200 text-sm outline-none focus:border-primary-400"
              placeholder="إلى"
            />
          </div>
          <input
            type="range"
            min="0"
            max="1000"
            value={priceRange[1]}
            onChange={(e) => setPriceRange([priceRange[0], Number(e.target.value)])}
            className="w-full accent-primary-600"
          />
        </div>
      </div>
    </div>
  );
}
