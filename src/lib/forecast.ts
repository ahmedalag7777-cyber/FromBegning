import { useMemo } from 'react';

// Simple moving average forecast — no external deps needed
// Uses historical order data to predict future demand

export interface ForecastResult {
  product_name: string;
  current_stock: number;
  avg_daily_sales: number;
  days_until_stockout: number;
  recommended_reorder_qty: number;
  trend: 'up' | 'down' | 'stable';
  confidence: number;
}

export function useForecast(
  orderItems: { product_name: string; quantity: number; created_at: string }[],
  products: { id: string; name: string; stock: number; cost: number; price: number }[]
) {
  return useMemo(() => {
    // Group sales by product
    const salesByProduct: Record<string, { totalQty: number; dates: string[] }> = {};

    orderItems.forEach((item) => {
      if (!salesByProduct[item.product_name]) {
        salesByProduct[item.product_name] = { totalQty: 0, dates: [] };
      }
      salesByProduct[item.product_name].totalQty += item.quantity;
      salesByProduct[item.product_name].dates.push(item.created_at);
    });

    const results: ForecastResult[] = products.map((product) => {
      const sales = salesByProduct[product.name];
      const totalQty = sales?.totalQty || 0;
      const dates = sales?.dates || [];

      // Calculate date range
      let dateRange = 30; // default 30 days
      if (dates.length > 0) {
        const sorted = dates.sort();
        const first = new Date(sorted[0]);
        const last = new Date(sorted[sorted.length - 1]);
        const diffDays = Math.max(1, Math.ceil((last.getTime() - first.getTime()) / 86400000));
        dateRange = Math.max(diffDays, 7);
      }

      const avgDailySales = totalQty / dateRange;
      const daysUntilStockout = avgDailySales > 0 ? Math.ceil(product.stock / avgDailySales) : 999;

      // Reorder when stock covers < 14 days of sales
      const reorderPoint = Math.ceil(avgDailySales * 14);
      const recommendedReorderQty = Math.max(0, reorderPoint - product.stock);

      // Trend: compare first half vs second half of sales
      let trend: 'up' | 'down' | 'stable' = 'stable';
      if (dates.length >= 4) {
        const mid = Math.floor(dates.length / 2);
        const firstHalf = dates.slice(0, mid).length;
        const secondHalf = dates.slice(mid).length;
        if (secondHalf > firstHalf * 1.2) trend = 'up';
        else if (secondHalf < firstHalf * 0.8) trend = 'down';
      }

      const confidence = Math.min(95, Math.round((Math.min(dates.length, 30) / 30) * 100));

      return {
        product_name: product.name,
        current_stock: product.stock,
        avg_daily_sales: Math.round(avgDailySales * 10) / 10,
        days_until_stockout: daysUntilStockout,
        recommended_reorder_qty: recommendedReorderQty,
        trend,
        confidence,
      };
    });

    // Sort by most urgent (lowest days until stockout)
    return results.sort((a, b) => a.days_until_stockout - b.days_until_stockout);
  }, [orderItems, products]);
}
