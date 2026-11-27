export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  sort_order: number;
  created_at: string;
}

export interface Product {
  id: string;
  category_id: string | null;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  cost: number;
  stock: number;
  sku: string | null;
  image_url: string | null;
  is_active: boolean;
  is_featured: boolean;
  rating: number;
  tags: string[] | null;
  created_at: string;
  updated_at: string;
  category?: Category | null;
}

export interface Customer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  country: string;
  total_orders: number;
  total_spent: number;
  notes: string | null;
  created_at: string;
}

export type OrderStatus = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
export type PaymentStatus = 'unpaid' | 'partial' | 'paid';

export interface Order {
  id: string;
  customer_id: string | null;
  order_number: string;
  status: OrderStatus;
  payment_status: PaymentStatus;
  payment_method: string | null;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  shipping_cost: number;
  discount: number;
  total: number;
  shipping_name: string | null;
  shipping_phone: string | null;
  shipping_address: string | null;
  shipping_city: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  customer?: Customer | null;
  order_items?: OrderItem[];
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string | null;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  created_at: string;
}

export type AccountType = 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';

export interface Account {
  id: string;
  code: string;
  name: string;
  type: AccountType;
  parent_id: string | null;
  balance: number;
  is_active: boolean;
  description: string | null;
  created_at: string;
}

export interface JournalEntry {
  id: string;
  entry_number: string;
  entry_date: string;
  description: string;
  reference: string | null;
  reference_type: string | null;
  status: string;
  total_debit: number;
  total_credit: number;
  created_at: string;
  journal_lines?: JournalLine[];
}

export interface JournalLine {
  id: string;
  entry_id: string;
  account_id: string;
  account?: Account | null;
  debit: number;
  credit: number;
  description: string | null;
  line_order: number;
  created_at: string;
}

export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';

export interface Invoice {
  id: string;
  invoice_number: string;
  order_id: string | null;
  customer_id: string | null;
  invoice_date: string;
  due_date: string | null;
  subtotal: number;
  tax_amount: number;
  total: number;
  paid_amount: number;
  status: InvoiceStatus;
  notes: string | null;
  created_at: string;
  customer?: Customer | null;
  order?: Order | null;
}

export interface Payment {
  id: string;
  invoice_id: string | null;
  order_id: string | null;
  amount: number;
  method: string;
  reference: string | null;
  payment_date: string;
  notes: string | null;
  created_at: string;
}

export interface StoreSettings {
  id: string;
  store_name: string;
  store_email: string | null;
  store_phone: string | null;
  store_address: string | null;
  currency: string;
  currency_symbol: string;
  tax_rate: number;
  tax_enabled: boolean;
  shipping_flat_rate: number;
  free_shipping_threshold: number;
  low_stock_threshold: number;
  invoice_prefix: string;
  order_prefix: string;
  logo_url: string | null;
  primary_color: string;
  created_at: string;
  updated_at: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}
