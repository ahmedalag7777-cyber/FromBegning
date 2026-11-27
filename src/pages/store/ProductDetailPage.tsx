import { useEffect, useState } from 'react';
import { ShoppingBag, Star, Minus, Plus, ChevronLeft, Truck, ShieldCheck, RefreshCw, Check } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useParams, navigate } from '@/lib/router';
import { useCart } from '@/context/CartContext';
import { formatCurrency } from '@/lib/format';
import type { Product } from '@/types';
import { ProductCard } from '@/components/store/ProductCard';

export function ProductDetailPage() {
  const { slug } = useParams();
  const { addToCart } = useCart();
  const [product, setProduct] = useState<Product | null>(null);
  const [related, setRelated] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('products')
        .select('*, category:categories(*)')
        .eq('slug', slug)
        .maybeSingle();

      if (data) {
        setProduct(data);
        if (data.category_id) {
          const { data: rel } = await supabase
            .from('products')
            .select('*, category:categories(*)')
            .eq('category_id', data.category_id)
            .neq('id', data.id)
            .eq('is_active', true)
            .limit(4);
          setRelated(rel || []);
        }
      }
      setLoading(false);
    };
    load();
  }, [slug]);

  const handleAdd = () => {
    if (!product || product.stock <= 0) return;
    addToCart(product, quantity);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid md:grid-cols-2 gap-8">
          <div className="aspect-square rounded-2xl shimmer" />
          <div className="space-y-4">
            <div className="h-8 rounded shimmer" />
            <div className="h-6 w-2/3 rounded shimmer" />
            <div className="h-24 rounded shimmer" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <h2 className="text-2xl font-bold text-neutral-700">المنتج غير موجود</h2>
        <button onClick={() => navigate('/shop')} className="mt-4 text-primary-700 font-medium">
          العودة للمتجر
        </button>
      </div>
    );
  }

  const outOfStock = product.stock <= 0;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 animate-fade-in">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-neutral-500 mb-6">
        <button onClick={() => navigate('/')} className="hover:text-primary-700">الرئيسية</button>
        <ChevronLeft className="w-4 h-4" />
        <button onClick={() => navigate('/shop')} className="hover:text-primary-700">المتجر</button>
        {product.category && (
          <>
            <ChevronLeft className="w-4 h-4" />
            <button onClick={() => navigate(`/shop?category=${product.category?.slug}`)} className="hover:text-primary-700">
              {product.category.name}
            </button>
          </>
        )}
        <ChevronLeft className="w-4 h-4" />
        <span className="text-neutral-900 font-medium">{product.name}</span>
      </nav>

      <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
        {/* Image */}
        <div className="relative rounded-3xl overflow-hidden bg-neutral-100 border border-neutral-200">
          {product.image_url ? (
            <img src={product.image_url} alt={product.name} className="w-full aspect-square object-cover" />
          ) : (
            <div className="w-full aspect-square flex items-center justify-center">
              <ShoppingBag className="w-20 h-20 text-neutral-300" />
            </div>
          )}
          {product.is_featured && (
            <span className="absolute top-4 right-4 px-3 py-1.5 rounded-full bg-accent-500 text-white text-xs font-bold shadow-lg">
              منتج مميز
            </span>
          )}
        </div>

        {/* Details */}
        <div className="space-y-5">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="flex items-center gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`w-4 h-4 ${
                      i < Math.floor(product.rating)
                        ? 'fill-accent-400 text-accent-400'
                        : 'fill-neutral-200 text-neutral-200'
                    }`}
                  />
                ))}
              </div>
              <span className="text-sm text-neutral-500">{product.rating.toFixed(1)} تقييم</span>
            </div>
            <h1 className="text-3xl font-bold text-neutral-900 leading-tight">{product.name}</h1>
          </div>

          <div className="flex items-baseline gap-3">
            <span className="text-3xl font-bold text-primary-700">{formatCurrency(product.price)}</span>
            {product.cost > 0 && product.price > product.cost * 1.5 && (
              <span className="text-sm text-neutral-400 line-through">
                {formatCurrency(Math.round(product.cost * 1.8))}
              </span>
            )}
          </div>

          <p className="text-neutral-600 leading-relaxed">{product.description}</p>

          {product.tags && product.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {product.tags.map((tag) => (
                <span key={tag} className="px-3 py-1 rounded-full bg-neutral-100 text-neutral-600 text-xs">
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Stock */}
          <div className="flex items-center gap-2 text-sm">
            {outOfStock ? (
              <span className="text-red-600 font-medium">نفد من المخزون</span>
            ) : product.stock <= 5 ? (
              <span className="text-amber-600 font-medium">باقي {product.stock} قطع فقط</span>
            ) : (
              <span className="text-emerald-600 font-medium flex items-center gap-1">
                <Check className="w-4 h-4" /> متوفر في المخزون
              </span>
            )}
          </div>

          {/* Quantity + Add to cart */}
          {!outOfStock && (
            <div className="flex items-center gap-3 pt-2">
              <div className="flex items-center border border-neutral-200 rounded-xl overflow-hidden">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="px-3 py-3 hover:bg-neutral-50 transition"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="px-6 font-semibold text-neutral-900">{quantity}</span>
                <button
                  onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                  className="px-3 py-3 hover:bg-neutral-50 transition"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <button
                onClick={handleAdd}
                className={`flex-1 px-6 py-3 rounded-xl font-semibold transition flex items-center justify-center gap-2 ${
                  added
                    ? 'bg-emerald-500 text-white'
                    : 'bg-primary-700 text-white hover:bg-primary-800 shadow-lg shadow-primary-200'
                }`}
              >
                {added ? (
                  <><Check className="w-5 h-5" /> تمت الإضافة</>
                ) : (
                  <><ShoppingBag className="w-5 h-5" /> أضف للسلة</>
                )}
              </button>
            </div>
          )}

          {/* Trust badges */}
          <div className="grid grid-cols-3 gap-3 pt-4 border-t border-neutral-100">
            {[
              { icon: Truck, label: 'شحن سريع' },
              { icon: ShieldCheck, label: 'دفع آمن' },
              { icon: RefreshCw, label: 'إرجاع مجاني' },
            ].map((b, i) => (
              <div key={i} className="flex flex-col items-center gap-2 text-center p-3 rounded-xl bg-neutral-50">
                <b.icon className="w-5 h-5 text-primary-700" />
                <span className="text-xs text-neutral-600 font-medium">{b.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Related */}
      {related.length > 0 && (
        <section className="mt-16">
          <h2 className="text-2xl font-bold text-neutral-900 mb-6">منتجات ذات صلة</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
