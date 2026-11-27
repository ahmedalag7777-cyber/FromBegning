import { supabase } from './supabase';
import type {
  Product, Order, Customer, Invoice, JournalEntry,
  Account, StoreSettings, Category,
} from '@/types';

export const queries = {
  products: async (): Promise<Product[]> => {
    const { data, error } = await supabase
      .from('products')
      .select('*, category:categories(*)')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []) as Product[];
  },

  product: async (slug: string): Promise<Product | null> => {
    const { data, error } = await supabase
      .from('products')
      .select('*, category:categories(*)')
      .eq('slug', slug)
      .maybeSingle();
    if (error) throw error;
    return data as Product | null;
  },

  orders: async (): Promise<Order[]> => {
    const { data, error } = await supabase
      .from('orders')
      .select('*, customer:customers(*), order_items(*)')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []) as Order[];
  },

  customers: async (): Promise<Customer[]> => {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []) as Customer[];
  },

  invoices: async (): Promise<Invoice[]> => {
    const { data, error } = await supabase
      .from('invoices')
      .select('*, customer:customers(*), order:orders(*)')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []) as Invoice[];
  },

  accounts: async (): Promise<Account[]> => {
    const { data, error } = await supabase
      .from('accounts')
      .select('*')
      .order('code');
    if (error) throw error;
    return (data || []) as Account[];
  },

  journal: async (): Promise<JournalEntry[]> => {
    const { data, error } = await supabase
      .from('journal_entries')
      .select('*, journal_lines(*, account:accounts(*))')
      .order('entry_date', { ascending: false });
    if (error) throw error;
    return (data || []) as JournalEntry[];
  },

  categories: async (): Promise<Category[]> => {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('sort_order');
    if (error) throw error;
    return (data || []) as Category[];
  },

  settings: async (): Promise<StoreSettings | null> => {
    const { data, error } = await supabase
      .from('store_settings')
      .select('*')
      .maybeSingle();
    if (error) throw error;
    return data as StoreSettings | null;
  },

  lowStockProducts: async (): Promise<Product[]> => {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .lt('stock', 5)
      .order('stock', { ascending: true });
    if (error) throw error;
    return (data || []) as Product[];
  },

  pendingOrders: async (): Promise<Order[]> => {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('status', 'pending');
    if (error) throw error;
    return (data || []) as Order[];
  },

  overdueInvoices: async (): Promise<Invoice[]> => {
    const { data, error } = await supabase
      .from('invoices')
      .select('*, customer:customers(*)')
      .in('status', ['sent', 'overdue'])
      .lt('due_date', new Date().toISOString().split('T')[0]);
    if (error) throw error;
    return (data || []) as Invoice[];
  },
};

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
