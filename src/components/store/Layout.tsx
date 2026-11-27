import { ShoppingBag, Search, Menu, X, Store, Heart } from 'lucide-react';
import { useState } from 'react';
import { useCart } from '@/context/CartContext';
import { navigate } from '@/lib/router';
import type { Category } from '@/types';

interface HeaderProps {
  categories: Category[];
  onSearch?: (query: string) => void;
}

export function Header({ categories, onSearch }: HeaderProps) {
  const { totalItems } = useCart();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSearch) onSearch(searchQuery);
    else navigate(`/shop?q=${encodeURIComponent(searchQuery)}`);
    setMobileOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-neutral-200 shadow-sm">
      {/* Top bar */}
      <div className="bg-primary-700 text-white text-xs py-2 px-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <span>شحن مجاني للطلبات فوق 200 ر.س</span>
          <div className="hidden sm:flex items-center gap-4">
            <button onClick={() => navigate('/admin')} className="hover:text-primary-100 transition">
              لوحة التحكم
            </button>
            <span className="opacity-50">|</span>
            <span>+966 50 123 4567</span>
          </div>
        </div>
      </div>

      {/* Main header */}
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Logo */}
          <button onClick={() => navigate('/')} className="flex items-center gap-2 shrink-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-600 to-primary-800 flex items-center justify-center text-white">
              <Store className="w-5 h-5" />
            </div>
            <div className="text-right">
              <div className="font-bold text-lg text-neutral-900 leading-tight">متجر النخبة</div>
              <div className="text-[10px] text-neutral-500 leading-tight">ELITE STORE</div>
            </div>
          </button>

          {/* Search (desktop) */}
          <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-xl">
            <div className="relative w-full">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث عن المنتجات..."
                className="w-full h-11 pr-12 pl-4 rounded-xl border border-neutral-200 bg-neutral-50 focus:bg-white focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none transition text-sm"
              />
              <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
            </div>
          </form>

          {/* Actions */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => navigate('/cart')}
              className="relative p-2.5 rounded-xl hover:bg-neutral-100 transition"
              aria-label="السلة"
            >
              <ShoppingBag className="w-5 h-5 text-neutral-700" />
              {totalItems > 0 && (
                <span className="absolute -top-1 -left-1 w-5 h-5 rounded-full bg-accent-500 text-white text-[10px] font-bold flex items-center justify-center animate-scale-in">
                  {totalItems}
                </span>
              )}
            </button>
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden p-2.5 rounded-xl hover:bg-neutral-100 transition"
              aria-label="القائمة"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Nav (desktop) */}
        <nav className="hidden md:flex items-center gap-1 h-12 border-t border-neutral-100">
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 text-sm font-medium text-neutral-700 hover:text-primary-700 hover:bg-primary-50 rounded-lg transition"
          >
            الرئيسية
          </button>
          <button
            onClick={() => navigate('/shop')}
            className="px-4 py-2 text-sm font-medium text-neutral-700 hover:text-primary-700 hover:bg-primary-50 rounded-lg transition"
          >
            كل المنتجات
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => navigate(`/shop?category=${cat.slug}`)}
              className="px-4 py-2 text-sm font-medium text-neutral-700 hover:text-primary-700 hover:bg-primary-50 rounded-lg transition"
            >
              {cat.name}
            </button>
          ))}
        </nav>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-neutral-200 bg-white animate-slide-up">
          <div className="px-4 py-4 space-y-3">
            <form onSubmit={handleSearch} className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث عن المنتجات..."
                className="w-full h-11 pr-12 pl-4 rounded-xl border border-neutral-200 bg-neutral-50 outline-none text-sm"
              />
              <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
            </form>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => { navigate('/'); setMobileOpen(false); }} className="px-4 py-2 text-sm bg-neutral-100 rounded-lg">
                الرئيسية
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => { navigate(`/shop?category=${cat.slug}`); setMobileOpen(false); }}
                  className="px-4 py-2 text-sm bg-neutral-100 rounded-lg"
                >
                  {cat.name}
                </button>
              ))}
            </div>
            <button
              onClick={() => { navigate('/admin'); setMobileOpen(false); }}
              className="w-full px-4 py-2.5 text-sm bg-primary-700 text-white rounded-lg font-medium"
            >
              لوحة التحكم
            </button>
          </div>
        </div>
      )}
    </header>
  );
}

export function Footer() {
  return (
    <footer className="bg-neutral-900 text-neutral-300 mt-20">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white">
                <Store className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold text-white text-lg">متجر النخبة</div>
                <div className="text-[10px] text-neutral-400">ELITE STORE</div>
              </div>
            </div>
            <p className="text-sm text-neutral-400 leading-relaxed">
              وجهتك للتسوق الإلكتروني الفاخر. منتجات أصلية بأفضل الأسعار مع خدمة شحن سريعة.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-white mb-4 text-sm">روابط سريعة</h3>
            <ul className="space-y-2 text-sm">
              <li><button onClick={() => navigate('/')} className="hover:text-primary-300 transition">الرئيسية</button></li>
              <li><button onClick={() => navigate('/shop')} className="hover:text-primary-300 transition">المنتجات</button></li>
              <li><button onClick={() => navigate('/cart')} className="hover:text-primary-300 transition">السلة</button></li>
              <li><button onClick={() => navigate('/admin')} className="hover:text-primary-300 transition">لوحة التحكم</button></li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold text-white mb-4 text-sm">خدمة العملاء</h3>
            <ul className="space-y-2 text-sm text-neutral-400">
              <li>سياسة الإرجاع والاستبدال</li>
              <li>الشحن والتوصيل</li>
              <li>الأسئلة الشائعة</li>
              <li>تتبع الطلب</li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold text-white mb-4 text-sm">تواصل معنا</h3>
            <ul className="space-y-2 text-sm text-neutral-400">
              <li>الرياض، المملكة العربية السعودية</li>
              <li>+966 50 123 4567</li>
              <li>info@elite-store.sa</li>
            </ul>
            <div className="flex gap-2 mt-4">
              {[Heart, ShoppingBag].map((Icon, i) => (
                <div key={i} className="w-9 h-9 rounded-lg bg-neutral-800 flex items-center justify-center">
                  <Icon className="w-4 h-4 text-neutral-400" />
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="border-t border-neutral-800 mt-10 pt-6 text-center text-sm text-neutral-500">
          © 2026 متجر النخبة. جميع الحقوق محفوظة.
        </div>
      </div>
    </footer>
  );
}
