/*
# E-commerce + Accounting System Schema

## Overview
This migration creates a complete e-commerce store with an integrated double-entry accounting system.

## New Tables

### Store Tables
1. **categories** - Product categories (name, slug, description, icon)
2. **products** - Product catalog (name, price, cost, stock, SKU, image, category link)
3. **customers** - Customer records (name, email, phone, address)
4. **orders** - Order header (number, status, totals, payment status, shipping)
5. **order_items** - Order line items (product, quantity, unit price, line total)

### Accounting Tables
6. **accounts** - Chart of accounts (code, name, type: asset/liability/equity/revenue/expense, balance)
7. **journal_entries** - Journal entry header (number, date, description, reference)
8. **journal_lines** - Journal entry lines (account, debit, credit)
9. **invoices** - Sales invoices (number, order link, customer, amounts, status, due date)
10. **payments** - Payment records (invoice link, amount, method, date)
11. **transactions** - Transaction ledger (type, amount, description, reference, account)

### Settings
12. **store_settings** - Key-value store configuration (name, currency, tax rate, etc.)

## Security
- All tables have RLS enabled
- All policies use TO anon, authenticated (single-tenant, no auth screen)
- CRUD grants on all tables to anon, authenticated
*/

-- ============================================
-- CATEGORIES
-- ============================================
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  description text,
  icon text,
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON categories TO anon, authenticated;

DROP POLICY IF EXISTS "cat_select" ON categories;
CREATE POLICY "cat_select" ON categories FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "cat_insert" ON categories;
CREATE POLICY "cat_insert" ON categories FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "cat_update" ON categories;
CREATE POLICY "cat_update" ON categories FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "cat_delete" ON categories;
CREATE POLICY "cat_delete" ON categories FOR DELETE TO anon, authenticated USING (true);

-- ============================================
-- PRODUCTS
-- ============================================
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  description text,
  price numeric(12,2) NOT NULL DEFAULT 0,
  cost numeric(12,2) NOT NULL DEFAULT 0,
  stock int NOT NULL DEFAULT 0,
  sku text UNIQUE,
  image_url text,
  is_active boolean DEFAULT true,
  is_featured boolean DEFAULT false,
  rating numeric(2,1) DEFAULT 0,
  tags text[],
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON products TO anon, authenticated;

DROP POLICY IF EXISTS "prod_select" ON products;
CREATE POLICY "prod_select" ON products FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "prod_insert" ON products;
CREATE POLICY "prod_insert" ON products FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "prod_update" ON products;
CREATE POLICY "prod_update" ON products FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "prod_delete" ON products;
CREATE POLICY "prod_delete" ON products FOR DELETE TO anon, authenticated USING (true);

-- ============================================
-- CUSTOMERS
-- ============================================
CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text,
  phone text,
  address text,
  city text,
  country text DEFAULT 'السعودية',
  total_orders int DEFAULT 0,
  total_spent numeric(12,2) DEFAULT 0,
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON customers TO anon, authenticated;

DROP POLICY IF EXISTS "cust_select" ON customers;
CREATE POLICY "cust_select" ON customers FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "cust_insert" ON customers;
CREATE POLICY "cust_insert" ON customers FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "cust_update" ON customers;
CREATE POLICY "cust_update" ON customers FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "cust_delete" ON customers;
CREATE POLICY "cust_delete" ON customers FOR DELETE TO anon, authenticated USING (true);

-- ============================================
-- ORDERS
-- ============================================
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  order_number text UNIQUE NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  payment_status text NOT NULL DEFAULT 'unpaid',
  payment_method text,
  subtotal numeric(12,2) NOT NULL DEFAULT 0,
  tax_rate numeric(5,2) DEFAULT 0,
  tax_amount numeric(12,2) DEFAULT 0,
  shipping_cost numeric(12,2) DEFAULT 0,
  discount numeric(12,2) DEFAULT 0,
  total numeric(12,2) NOT NULL DEFAULT 0,
  shipping_name text,
  shipping_phone text,
  shipping_address text,
  shipping_city text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON orders TO anon, authenticated;

DROP POLICY IF EXISTS "ord_select" ON orders;
CREATE POLICY "ord_select" ON orders FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "ord_insert" ON orders;
CREATE POLICY "ord_insert" ON orders FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "ord_update" ON orders;
CREATE POLICY "ord_update" ON orders FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "ord_delete" ON orders;
CREATE POLICY "ord_delete" ON orders FOR DELETE TO anon, authenticated USING (true);

-- ============================================
-- ORDER ITEMS
-- ============================================
CREATE TABLE IF NOT EXISTS order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id) ON DELETE SET NULL,
  product_name text NOT NULL,
  quantity int NOT NULL DEFAULT 1,
  unit_price numeric(12,2) NOT NULL DEFAULT 0,
  total_price numeric(12,2) NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON order_items TO anon, authenticated;

DROP POLICY IF EXISTS "oi_select" ON order_items;
CREATE POLICY "oi_select" ON order_items FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "oi_insert" ON order_items;
CREATE POLICY "oi_insert" ON order_items FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "oi_update" ON order_items;
CREATE POLICY "oi_update" ON order_items FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "oi_delete" ON order_items;
CREATE POLICY "oi_delete" ON order_items FOR DELETE TO anon, authenticated USING (true);

-- ============================================
-- CHART OF ACCOUNTS
-- ============================================
CREATE TABLE IF NOT EXISTS accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('asset','liability','equity','revenue','expense')),
  parent_id uuid REFERENCES accounts(id) ON DELETE SET NULL,
  balance numeric(14,2) DEFAULT 0,
  is_active boolean DEFAULT true,
  description text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON accounts TO anon, authenticated;

DROP POLICY IF EXISTS "acc_select" ON accounts;
CREATE POLICY "acc_select" ON accounts FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "acc_insert" ON accounts;
CREATE POLICY "acc_insert" ON accounts FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "acc_update" ON accounts;
CREATE POLICY "acc_update" ON accounts FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "acc_delete" ON accounts;
CREATE POLICY "acc_delete" ON accounts FOR DELETE TO anon, authenticated USING (true);

-- ============================================
-- JOURNAL ENTRIES
-- ============================================
CREATE TABLE IF NOT EXISTS journal_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_number text UNIQUE NOT NULL,
  entry_date date NOT NULL DEFAULT CURRENT_DATE,
  description text NOT NULL,
  reference text,
  reference_type text,
  status text DEFAULT 'posted',
  total_debit numeric(14,2) DEFAULT 0,
  total_credit numeric(14,2) DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON journal_entries TO anon, authenticated;

DROP POLICY IF EXISTS "je_select" ON journal_entries;
CREATE POLICY "je_select" ON journal_entries FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "je_insert" ON journal_entries;
CREATE POLICY "je_insert" ON journal_entries FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "je_update" ON journal_entries;
CREATE POLICY "je_update" ON journal_entries FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "je_delete" ON journal_entries;
CREATE POLICY "je_delete" ON journal_entries FOR DELETE TO anon, authenticated USING (true);

-- ============================================
-- JOURNAL LINES
-- ============================================
CREATE TABLE IF NOT EXISTS journal_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id uuid NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
  debit numeric(14,2) DEFAULT 0,
  credit numeric(14,2) DEFAULT 0,
  description text,
  line_order int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE journal_lines ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON journal_lines TO anon, authenticated;

DROP POLICY IF EXISTS "jl_select" ON journal_lines;
CREATE POLICY "jl_select" ON journal_lines FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "jl_insert" ON journal_lines;
CREATE POLICY "jl_insert" ON journal_lines FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "jl_update" ON journal_lines;
CREATE POLICY "jl_update" ON journal_lines FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "jl_delete" ON journal_lines;
CREATE POLICY "jl_delete" ON journal_lines FOR DELETE TO anon, authenticated USING (true);

-- ============================================
-- INVOICES
-- ============================================
CREATE TABLE IF NOT EXISTS invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number text UNIQUE NOT NULL,
  order_id uuid REFERENCES orders(id) ON DELETE SET NULL,
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  invoice_date date NOT NULL DEFAULT CURRENT_DATE,
  due_date date,
  subtotal numeric(12,2) NOT NULL DEFAULT 0,
  tax_amount numeric(12,2) DEFAULT 0,
  total numeric(12,2) NOT NULL DEFAULT 0,
  paid_amount numeric(12,2) DEFAULT 0,
  status text NOT NULL DEFAULT 'draft',
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON invoices TO anon, authenticated;

DROP POLICY IF EXISTS "inv_select" ON invoices;
CREATE POLICY "inv_select" ON invoices FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "inv_insert" ON invoices;
CREATE POLICY "inv_insert" ON invoices FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "inv_update" ON invoices;
CREATE POLICY "inv_update" ON invoices FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "inv_delete" ON invoices;
CREATE POLICY "inv_delete" ON invoices FOR DELETE TO anon, authenticated USING (true);

-- ============================================
-- PAYMENTS
-- ============================================
CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid REFERENCES invoices(id) ON DELETE SET NULL,
  order_id uuid REFERENCES orders(id) ON DELETE SET NULL,
  amount numeric(12,2) NOT NULL DEFAULT 0,
  method text NOT NULL DEFAULT 'cash',
  reference text,
  payment_date date NOT NULL DEFAULT CURRENT_DATE,
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON payments TO anon, authenticated;

DROP POLICY IF EXISTS "pay_select" ON payments;
CREATE POLICY "pay_select" ON payments FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "pay_insert" ON payments;
CREATE POLICY "pay_insert" ON payments FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "pay_update" ON payments;
CREATE POLICY "pay_update" ON payments FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "pay_delete" ON payments;
CREATE POLICY "pay_delete" ON payments FOR DELETE TO anon, authenticated USING (true);

-- ============================================
-- STORE SETTINGS
-- ============================================
CREATE TABLE IF NOT EXISTS store_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_name text DEFAULT 'متجر النخبة',
  store_email text,
  store_phone text,
  store_address text,
  currency text DEFAULT 'ر.س',
  currency_symbol text DEFAULT '﷼',
  tax_rate numeric(5,2) DEFAULT 15.00,
  tax_enabled boolean DEFAULT true,
  shipping_flat_rate numeric(12,2) DEFAULT 25,
  free_shipping_threshold numeric(12,2) DEFAULT 200,
  low_stock_threshold int DEFAULT 5,
  invoice_prefix text DEFAULT 'INV-',
  order_prefix text DEFAULT 'ORD-',
  logo_url text,
  primary_color text DEFAULT '#0F766E',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE store_settings ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON store_settings TO anon, authenticated;

DROP POLICY IF EXISTS "ss_select" ON store_settings;
CREATE POLICY "ss_select" ON store_settings FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "ss_insert" ON store_settings;
CREATE POLICY "ss_insert" ON store_settings FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "ss_update" ON store_settings;
CREATE POLICY "ss_update" ON store_settings FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "ss_delete" ON store_settings;
CREATE POLICY "ss_delete" ON store_settings FOR DELETE TO anon, authenticated USING (true);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_journal_lines_entry ON journal_lines(entry_id);
CREATE INDEX IF NOT EXISTS idx_journal_lines_account ON journal_lines(account_id);
CREATE INDEX IF NOT EXISTS idx_invoices_customer ON invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_order ON invoices(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_invoice ON payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_accounts_type ON accounts(type);
CREATE INDEX IF NOT EXISTS idx_journal_entries_date ON journal_entries(entry_date);
