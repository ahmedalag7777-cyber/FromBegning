import { ShoppingBag, Star, Eye } from 'lucide-react';
import { useState } from 'react';
import type { Product } from '@/types';
import { useCart } from '@/context/CartContext';
import { formatCurrency } from '@/lib/format';
import { navigate } from '@/lib/router';

export function ProductCard({ product }: { product: Product }) {
  const { addToCart } = useCart();
  const [added, setAdded] = useState(false);

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (product.stock <= 0) return;
    addToCart(product);
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  const outOfStock = product.stock <= 0;

  return (
    <div
      onClick={() => navigate(`/product/${product.slug}`)}
      className="group bg-white rounded-2xl border border-neutral-200 overflow-hidden card-hover cursor-pointer flex flex-col"
    >
      {/* Image */}
      <div className="relative aspect-square overflow-hidden bg-neutral-100">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ShoppingBag className="w-12 h-12 text-neutral-300" />
          </div>
        )}
        {product.is_featured && (
          <span className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-accent-500 text-white text-[10px] font-bold shadow-lg">
            مميز
          </span>
        )}
        {outOfStock && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <span className="px-4 py-2 bg-white rounded-lg text-sm font-semibold text-red-600">نفد المخزون</span>
          </div>
        )}
        <div className="absolute top-3 left-3 w-8 h-8 rounded-full bg-white/90 backdrop-blur flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
          <Eye className="w-4 h-4 text-neutral-700" />
        </div>
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col flex-1">
        <div className="flex items-center gap-1 mb-1.5">
          <Star className="w-3.5 h-3.5 fill-accent-400 text-accent-400" />
          <span className="text-xs text-neutral-500">{product.rating.toFixed(1)}</span>
        </div>
        <h3 className="font-medium text-sm text-neutral-900 line-clamp-2 leading-relaxed mb-2 group-hover:text-primary-700 transition">
          {product.name}
        </h3>
        <div className="mt-auto flex items-center justify-between gap-2">
          <div className="flex flex-col">
            <span className="font-bold text-base text-primary-700">{formatCurrency(product.price)}</span>
          </div>
          <button
            onClick={handleAdd}
            disabled={outOfStock}
            className={`p-2.5 rounded-xl transition shrink-0 ${
              added
                ? 'bg-emerald-500 text-white'
                : outOfStock
                ? 'bg-neutral-100 text-neutral-300 cursor-not-allowed'
                : 'bg-primary-50 text-primary-700 hover:bg-primary-600 hover:text-white'
            }`}
            aria-label="أضف للسلة"
          >
            {added ? (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <ShoppingBag className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
