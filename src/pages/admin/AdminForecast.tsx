import { useQuery } from '@tanstack/react-query';
import { Brain, TrendingUp, TrendingDown, Minus, Package, Loader2, AlertTriangle } from 'lucide-react';
import { queries } from '@/lib/api';
import { queryKeys } from '@/lib/queryClient';
import { useForecast, type ForecastResult } from '@/lib/forecast';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { formatCurrency, formatNumber } from '@/lib/format';

export function AdminForecast() {
  const { data: products = [], isLoading: prodLoading } = useQuery({
    queryKey: queryKeys.products,
    queryFn: queries.products,
  });

  const { data: orders = [], isLoading: ordLoading } = useQuery({
    queryKey: queryKeys.orders,
    queryFn: queries.orders,
  });

  // Flatten order items from all orders
  const allOrderItems = orders.flatMap((o) =>
    (o.order_items || []).map((item) => ({
      product_name: item.product_name,
      quantity: item.quantity,
      created_at: o.created_at,
    }))
  );

  const forecasts = useForecast(allOrderItems, products);

  const urgent = forecasts.filter((f) => f.days_until_stockout <= 14 && f.avg_daily_sales > 0);
  const recommendedReorderQty = urgent.reduce((s, f) => s + f.recommended_reorder_qty, 0);

  const loading = prodLoading || ordLoading;

  return (
    <AdminLayout activePage="forecast">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-neutral-900">التنبؤ بالمبيعات والمخزون</h1>
        <p className="text-sm text-neutral-500 mt-1">تحليل ذكي للطلب المتوقع وإعادة التموين</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 text-primary-600 animate-spin" /></div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <SummaryCard
              title="منتجات تنفيذ عاجل"
              value={formatNumber(urgent.length)}
              icon={AlertTriangle}
              color="amber"
              subtitle="تحتاج إعادة طلب خلال 14 يوم"
            />
            <SummaryCard
              title="إجمالي الكمية المقترحة"
              value={formatNumber(recommendedReorderQty)}
              icon={Package}
              color="primary"
              subtitle="لإعادة تموين المخزون"
            />
            <SummaryCard
              title="منتجات ذات اتجاه صاعد"
              value={formatNumber(forecasts.filter((f) => f.trend === 'up').length)}
              icon={TrendingUp}
              color="emerald"
              subtitle="مبيعات في تصاعد"
            />
            <SummaryCard
              title="منتجات ذات اتجاه هابط"
              value={formatNumber(forecasts.filter((f) => f.trend === 'down').length)}
              icon={TrendingDown}
              color="red"
              subtitle="مبيعات في تراجع"
            />
          </div>

          {/* Forecast table */}
          <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
            <div className="p-5 border-b border-neutral-100">
              <h3 className="font-bold text-neutral-900 flex items-center gap-2">
                <Brain className="w-5 h-5 text-primary-700" />
                تنبؤات الطلب حسب المنتج
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-neutral-50 text-neutral-600 text-xs">
                    <th className="text-right px-4 py-3 font-medium">المنتج</th>
                    <th className="text-right px-4 py-3 font-medium">المخزون الحالي</th>
                    <th className="text-right px-4 py-3 font-medium">متوسط البيع اليومي</th>
                    <th className="text-right px-4 py-3 font-medium">أيام حتى النفاد</th>
                    <th className="text-right px-4 py-3 font-medium">الكمية المقترحة</th>
                    <th className="text-right px-4 py-3 font-medium">الاتجاه</th>
                    <th className="text-right px-4 py-3 font-medium">الثقة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-50">
                  {forecasts.map((f: ForecastResult, i: number) => {
                    const product = products.find((p) => p.name === f.product_name);
                    return (
                      <tr key={i} className={`hover:bg-neutral-50 transition ${f.days_until_stockout <= 7 && f.avg_daily_sales > 0 ? 'bg-red-50/50' : ''}`}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg overflow-hidden bg-neutral-100 shrink-0">
                              {product?.image_url && <img src={product.image_url} alt="" className="w-full h-full object-cover" />}
                            </div>
                            <span className="font-medium text-neutral-900 line-clamp-1">{f.product_name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`font-medium ${f.current_stock <= 5 ? 'text-red-600' : 'text-neutral-700'}`}>
                            {f.current_stock}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-neutral-600">{f.avg_daily_sales > 0 ? f.avg_daily_sales : '—'}</td>
                        <td className="px-4 py-3">
                          {f.avg_daily_sales > 0 ? (
                            <span className={`font-medium ${f.days_until_stockout <= 7 ? 'text-red-600' : f.days_until_stockout <= 14 ? 'text-amber-600' : 'text-emerald-600'}`}>
                              {f.days_until_stockout} يوم
                            </span>
                          ) : (
                            <span className="text-neutral-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {f.recommended_reorder_qty > 0 ? (
                            <span className="px-2 py-0.5 rounded-full bg-primary-50 text-primary-700 text-xs font-medium">
                              {f.recommended_reorder_qty} وحدة
                            </span>
                          ) : (
                            <span className="text-neutral-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <TrendBadge trend={f.trend} />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-1.5 rounded-full bg-neutral-100 overflow-hidden">
                              <div
                                className={`h-full rounded-full ${f.confidence >= 70 ? 'bg-emerald-500' : f.confidence >= 40 ? 'bg-amber-500' : 'bg-neutral-300'}`}
                                style={{ width: `${f.confidence}%` }}
                              />
                            </div>
                            <span className="text-xs text-neutral-500">{f.confidence}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {forecasts.length === 0 && (
                <div className="p-12 text-center text-neutral-400">
                  <Brain className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  لا توجد بيانات كافية للتنبؤ
                </div>
              )}
            </div>
          </div>

          {/* Insight panel */}
          {urgent.length > 0 && (
            <div className="mt-6 p-5 rounded-2xl bg-amber-50 border border-amber-200">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-amber-900 text-sm">تنبيه: منتجات تحتاج إعادة طلب عاجلة</h4>
                  <p className="text-sm text-amber-700 mt-1">
                    لديك {urgent.length} منتج سيُنفد مخزونها خلال 14 يوم. يُنصح بطلب {formatNumber(recommendedReorderQty)} وحدة إجمالاً.
                  </p>
                  <div className="mt-2 text-xs text-amber-600">
                    {urgent.slice(0, 5).map((f) => f.product_name).join('، ')}
                    {urgent.length > 5 && ` و${urgent.length - 5} منتج آخر`}
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </AdminLayout>
  );
}

function TrendBadge({ trend }: { trend: 'up' | 'down' | 'stable' }) {
  const config = {
    up: { icon: TrendingUp, color: 'text-emerald-600 bg-emerald-50', label: 'صاعد' },
    down: { icon: TrendingDown, color: 'text-red-600 bg-red-50', label: 'هابط' },
    stable: { icon: Minus, color: 'text-neutral-500 bg-neutral-100', label: 'مستقر' },
  };
  const c = config[trend];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${c.color}`}>
      <c.icon className="w-3 h-3" />
      {c.label}
    </span>
  );
}

function SummaryCard({
  title, value, icon: Icon, color, subtitle,
}: { title: string; value: string; icon: React.ElementType; color: string; subtitle: string }) {
  const colors: Record<string, string> = {
    primary: 'bg-primary-50 text-primary-700',
    emerald: 'bg-emerald-50 text-emerald-700',
    amber: 'bg-amber-50 text-amber-700',
    red: 'bg-red-50 text-red-700',
  };
  return (
    <div className="bg-white rounded-2xl border border-neutral-200 p-5 card-hover">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-3 ${colors[color]}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="text-xs text-neutral-500 mb-1">{title}</div>
      <div className="text-2xl font-bold text-neutral-900">{value}</div>
      <div className="text-xs text-neutral-400 mt-1">{subtitle}</div>
    </div>
  );
}
