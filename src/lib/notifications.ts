import { useQuery } from '@tanstack/react-query';
import { queries } from './api';
import { queryKeys } from './queryClient';

export interface Notification {
  id: string;
  type: 'low_stock' | 'new_order' | 'overdue_invoice' | 'pending_order';
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'danger';
  link?: string;
  data?: unknown;
}

export function useNotifications() {
  const { data: lowStock = [] } = useQuery({
    queryKey: queryKeys.products,
    queryFn: queries.lowStockProducts,
    refetchInterval: 60_000,
  });

  const { data: pendingOrders = [] } = useQuery({
    queryKey: ['pending-orders'],
    queryFn: queries.pendingOrders,
    refetchInterval: 60_000,
  });

  const { data: overdueInvoices = [] } = useQuery({
    queryKey: ['overdue-invoices'],
    queryFn: queries.overdueInvoices,
    refetchInterval: 120_000,
  });

  const notifications: Notification[] = [
    ...lowStock.map((p) => ({
      id: `low-${p.id}`,
      type: 'low_stock' as const,
      title: 'مخزون منخفض',
      message: `المنتج "${p.name}" لديه ${p.stock} قطع فقط متبقية`,
      severity: p.stock === 0 ? 'danger' as const : 'warning' as const,
      link: '/admin/products',
      data: p,
    })),
    ...pendingOrders.map((o) => ({
      id: `pending-${o.id}`,
      type: 'pending_order' as const,
      title: 'طلب بانتظار المعالجة',
      message: `الطلب ${o.order_number} بانتظار المعالجة`,
      severity: 'info' as const,
      link: '/admin/orders',
      data: o,
    })),
    ...overdueInvoices.map((inv) => ({
      id: `overdue-${inv.id}`,
      type: 'overdue_invoice' as const,
      title: 'فاتورة متأخرة',
      message: `الفاتورة ${inv.invoice_number} قد تجاوزت تاريخ الاستحقاق`,
      severity: 'danger' as const,
      link: '/admin/invoices',
      data: inv,
    })),
  ];

  return { notifications, count: notifications.length };
}
