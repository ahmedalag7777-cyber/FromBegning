import { useEffect, useState } from 'react';
import { ArrowLeft, Truck, ShieldCheck, RefreshCw, Headphones, Sparkles } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { navigate } from '@/lib/router';
import type { Product, Category } from '@/types';
import { ProductCard } from '@/components/store/ProductCard';

export function HomePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [prodRes, catRes] = await Promise.all([
        supabase.from('products').select('*, category:categories(*)').eq('is_active', true).order('created_at', { ascending: false }),
        supabase.from('categories').select('*').order('sort_order'),
      ]);
      setProducts(prodRes.data || []);
      setCategories(catRes.data || []);
      setLoading(false);
    };
    load();
  }, []);

  const featured = products.filter((p) => p.is_featured).slice(0, 8);
  const latest = products.slice(0, 8);

  return (
    <div className="animate-fade-in">
      {/* Hero */}
      <section className="relative bg-gradient-to-br from-primary-800 via-primary-700 to-primary-600 overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }} />
        <div className="relative max-w-7xl mx-auto px-4 py-16 md:py-24">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div className="text-white space-y-6 animate-slide-up">
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur text-sm font-medium">
                <Sparkles className="w-4 h-4 text-accent-300" />
                عروض حصرية لفترة محدودة
              </span>
              <h1 className="text-4xl md:text-5xl font-bold leading-tight">
                تسوق بأناقة، <br />
                عش بثقة
              </h1>
              <p className="text-lg text-primary-100 leading-relaxed max-w-md">
                اكتشف تشكيلتنا الفاخرة من المنتجات المختارة بعناية. جودة استثنائية، أسعار تنافسية، وتوصيل سريع.
              </p>
              <div className="flex gap-3 flex-wrap">
                <button
                  onClick={() => navigate('/shop')}
                  className="px-6 py-3 rounded-xl bg-white text-primary-700 font-semibold hover:bg-primary-50 transition shadow-lg flex items-center gap-2"
                >
                  تسوق الآن
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => navigate('/shop?featured=true')}
                  className="px-6 py-3 rounded-xl bg-white/10 backdrop-blur text-white font-semibold hover:bg-white/20 transition border border-white/20"
                >
                  العروض المميزة
                </button>
              </div>
            </div>
            <div className="hidden md:block relative">
              <div className="grid grid-cols-2 gap-4">
                {featured.slice(0, 4).map((p, i) => (
                  <div
                    key={p.id}
                    className={`rounded-2xl overflow-hidden shadow-2xl ${i % 2 === 1 ? 'mt-8' : ''}`}
                    style={{ animationDelay: `${i * 100}ms` }}
                  >
                    {p.image_url && (
                      <img src={p.image_url} alt={p.name} className="w-full h-48 object-cover" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features bar */}
      <section className="bg-white border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: Truck, title: 'شحن سريع', desc: 'توصيل خلال 48 ساعة' },
              { icon: ShieldCheck, title: 'دفع آمن', desc: 'حماية كاملة للبيانات' },
              { icon: RefreshCw, title: 'إرجاع مجاني', desc: 'خلال 14 يوم' },
              { icon: Headphones, title: 'دعم 24/7', desc: 'خدمة عملاء متواصلة' },
            ].map((f, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-xl hover:bg-neutral-50 transition">
                <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center shrink-0">
                  <f.icon className="w-5 h-5 text-primary-700" />
                </div>
                <div>
                  <div className="font-semibold text-sm text-neutral-900">{f.title}</div>
                  <div className="text-xs text-neutral-500">{f.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="max-w-7xl mx-auto px-4 py-12">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-neutral-900">تسوق حسب الفئة</h2>
        </div>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => navigate(`/shop?category=${cat.slug}`)}
              className="group flex flex-col items-center gap-3 p-4 rounded-2xl border border-neutral-200 hover:border-primary-300 hover:bg-primary-50 transition"
            >
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center group-hover:from-primary-600 group-hover:to-primary-800 transition">
                <span className="text-2xl font-bold text-primary-700 group-hover:text-white transition">
                  {cat.name.charAt(0)}
                </span>
              </div>
              <span className="text-sm font-medium text-neutral-700 group-hover:text-primary-700 transition">
                {cat.name}
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* Featured Products */}
      <section className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-neutral-900">المنتجات المميزة</h2>
            <p className="text-sm text-neutral-500 mt-1">أفضل منتجاتنا المختارة بعناية</p>
          </div>
          <button
            onClick={() => navigate('/shop')}
            className="text-sm font-medium text-primary-700 hover:text-primary-800 flex items-center gap-1 transition"
          >
            عرض الكل
            <ArrowLeft className="w-4 h-4" />
          </button>
        </div>
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {featured.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </section>

      {/* CTA Banner */}
      <section className="max-w-7xl mx-auto px-4 py-12">
        <div className="relative rounded-3xl bg-gradient-to-br from-neutral-900 to-neutral-800 overflow-hidden p-8 md:p-12">
          <div className="absolute inset-0 opacity-5" style={{
            backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
            backgroundSize: '30px 30px',
          }} />
          <div className="relative grid md:grid-cols-2 gap-6 items-center">
            <div className="text-white space-y-4">
              <h2 className="text-3xl font-bold">انضم لعائلة متجر النخبة</h2>
              <p className="text-neutral-300 text-lg">احصل على خصومات حصرية وعروض خاصة عند الطلب لأول مرة</p>
              <button
                onClick={() => navigate('/shop')}
                className="px-6 py-3 rounded-xl bg-accent-500 text-white font-semibold hover:bg-accent-600 transition shadow-lg"
              >
                ابدأ التسوق الآن
              </button>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {['+1000', '+50', '4.8'].map((stat, i) => (
                <div key={i} className="text-center p-4 rounded-2xl bg-white/5 backdrop-blur">
                  <div className="text-2xl font-bold text-white">{stat}</div>
                  <div className="text-xs text-neutral-400 mt-1">
                    {['منتج متنوع', 'فئة مختلفة', 'تقييم العملاء'][i]}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Latest Products */}
      <section className="max-w-7xl mx-auto px-4 py-8 pb-16">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-neutral-900">أحدث المنتجات</h2>
            <p className="text-sm text-neutral-500 mt-1">وصل حديثاً إلى متجرنا</p>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {latest.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>
    </div>
  );
}
