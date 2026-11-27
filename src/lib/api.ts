import { supabase } from './supabase';
import type {
  Product, Order, Customer, Invoice, JournalEntry,
  Account, StoreSettings, Category,
} from '@/types';

// Generic query helpers
export const queries = {
  products: () => supabase
    .from('products')
    .select('*, category:categories(*)')
    .order('created_at', { ascending: false })
    .then(r => r.data as Product[] || []),

  product: (slug: string) => supabase
    .from('products')
    .select('*, category:categories(*)')
    .eq('slug', slug)
    .maybeSingle()
    .then(r => r.data as Product | null),

  orders: () => supabase
    .from('orders')
    .select('*, customer:customers(*), order_items(*)')
    .order('created_at', { ascending: false })
    .then(r => r.data as Order[] || []),

  customers: () => supabase
    .from('customers')
    .select('*')
    .order('created_at', { ascending: false })
    .then(r => r.data as Customer[] || []),

  invoices: () => supabase
    .from('invoices')
    .select('*, customer:customers(*), order:orders(*)')
    .order('created_at', { ascending: false })
    .then(r => r.data as Invoice[] || []),

  accounts: () => supabase
    .from('accounts')
    .select('*')
    .order('code')
    .then(r => r.data as Account[] || []),

  journal: () => supabase
    .from('journal_entries')
    .select('*, journal_lines(*, account:accounts(*))')
    .order('entry_date', { ascending: false })
    .then(r => r.data as JournalEntry[] || []),

  categories: () => supabase
    .from('categories')
    .order('sort_order')
    .then(r => r.data as Category[] || []),

  settings: () => supabase
    .from('store_settings')
    .select('*')
    .maybeSingle()
    .then(r => r.data as StoreSettings | null),

  lowStockProducts: () => supabase
    .from('products')
    .select('*')
    .lt('stock', 5)
    .order('stock', { ascending: true })
    .then(r => r.data as Product[] || []),

  pendingOrders: () => supabase
    .from('orders')
    .select('*')
    .eq('status', 'pending')
    .then(r => r.data as Order[] || []),

  overdueInvoices: () => supabase
    .from('invoices')
    .select('*, customer:customers(*)')
    .in('status', ['sent', 'overdue'])
    .lt('due_date', new Date().toISOString().split('T')[0])
    .then(r => r.data as Invoice[] || []),
};

// Mutations
export const mutations = {
  createProduct: async (data: Partial<Product>) => {
    const slug = (data.name || '').toLowerCase().replace(/\s+/g, '-') + '-' + Date.now().toString().slice(-4);
    return supabase.from('products').insert({ ...data, slug }).select('id').single();
  },

  updateProduct: async (id: string, data: Partial<Product>) => {
    return supabase.from('products').update({ ...data, updated_at: new Date().toISOString() }).eq('id', id);
  },

  deleteProduct: async (id: string) => {
    return supabase.from('products').delete().eq('id', id);
  },

  updateOrderStatus: async (id: string, status: string) => {
    return supabase.from('orders').update({ status, updated_at: new Date().toISOString() }).eq('id', id);
  },

  markInvoicePaid: async (id: string, amount: number) => {
    return supabase.from('invoices').update({ status: 'paid', paid_amount: amount }).eq('id', id);
  },

  updateSettings: async (id: string, data: Partial<StoreSettings>) => {
    return supabase.from('store_settings').update({ ...data, updated_at: new Date().toISOString() }).eq('id', id);
  },
};
