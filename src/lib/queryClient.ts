import { QueryClient, type UseQueryOptions } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

export const queryKeys = {
  products: ['products'] as const,
  orders: ['orders'] as const,
  customers: ['customers'] as const,
  invoices: ['invoices'] as const,
  accounts: ['accounts'] as const,
  journal: ['journal'] as const,
  settings: ['settings'] as const,
  dashboard: ['dashboard'] as const,
  notifications: ['notifications'] as const,
  forecasts: ['forecasts'] as const,
};

export type QueryKey = typeof queryKeys;
export type { UseQueryOptions };
