/*
# P0 security boundary and atomic checkout

1. New Tables
- `admin_users`: maps authenticated Supabase users to an active admin or manager role.
- `audit_logs`: records sensitive server-side business actions without exposing secrets.

2. New Views and Functions
- `is_admin()`: server-side role check used by protected policies.
- `bootstrap_admin(text)`: one-time authenticated bootstrap using the existing server-held setup secret.
- `checkout_order(text, jsonb, jsonb, text, text)`: atomic public checkout that validates prices, quantities, stock, totals, invoice creation, inventory movement, and balanced journal lines.
- `store_products`: public product projection that excludes product cost.

3. Security Changes
- Public clients can read only active product projections, categories, and public store settings.
- Customers, orders, invoices, payments, accounting, product costs, AI keys, and secrets are restricted to active admins or server-side functions.
- Direct stock mutation is removed from public roles.
- Administrative writes require an authenticated active admin.
- Checkout is the only public write path for orders and performs server-side validation.

4. Data Integrity
- Adds an idempotency key to orders with a unique index.
- Rejects invalid or unavailable quantities instead of clamping stock to zero.
- Non-cash payment methods remain unpaid until a verified payment integration exists.
- Journal entries created by checkout include balanced sales, tax, shipping, cost-of-goods, and inventory lines.
*/

CREATE TABLE IF NOT EXISTS admin_users (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'manager')),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

ALTER TABLE orders ADD COLUMN IF NOT EXISTS idempotency_key text;
CREATE UNIQUE INDEX IF NOT EXISTS orders_idempotency_key_uidx
  ON orders (idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE OR REPLACE VIEW store_products AS
SELECT
  p.id,
  p.category_id,
  p.name,
  p.slug,
  p.description,
  p.price,
  p.stock,
  p.sku,
  p.image_url,
  p.is_active,
  p.is_featured,
  p.rating,
  p.tags,
  p.created_at,
  p.updated_at,
  CASE WHEN c.id IS NULL THEN NULL ELSE jsonb_build_object(
    'id', c.id,
    'name', c.name,
    'slug', c.slug,
    'description', c.description,
    'icon', c.icon,
    'sort_order', c.sort_order,
    'created_at', c.created_at
  ) END AS category
FROM products p
LEFT JOIN categories c ON c.id = p.category_id
WHERE p.is_active = true;

CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM admin_users
    WHERE user_id = auth.uid()
      AND is_active = true
  );
$$;

CREATE OR REPLACE FUNCTION bootstrap_admin(p_bootstrap_secret text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_expected text;
  v_email text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF EXISTS (SELECT 1 FROM admin_users WHERE is_active = true) THEN
    RAISE EXCEPTION 'Administrator already configured';
  END IF;

  SELECT value INTO v_expected FROM app_secrets WHERE name = 'admin_api_secret';
  IF v_expected IS NULL OR p_bootstrap_secret IS NULL OR p_bootstrap_secret <> v_expected THEN
    RAISE EXCEPTION 'Invalid setup secret';
  END IF;

  SELECT email INTO v_email FROM auth.users WHERE id = auth.uid();
  INSERT INTO admin_users (user_id, email, role, is_active)
  VALUES (auth.uid(), COALESCE(v_email, ''), 'admin', true)
  ON CONFLICT (user_id) DO UPDATE
    SET email = EXCLUDED.email, is_active = true, updated_at = now();

  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION checkout_order(
  p_idempotency_key text,
  p_customer jsonb,
  p_items jsonb,
  p_payment_method text,
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing_id uuid;
  v_existing_number text;
  v_customer_id uuid;
  v_name text;
  v_phone text;
  v_email text;
  v_address text;
  v_city text;
  v_subtotal numeric := 0;
  v_tax_rate numeric := 0;
  v_tax_amount numeric := 0;
  v_shipping_cost numeric := 0;
  v_total numeric := 0;
  v_shipping_flat numeric := 25;
  v_free_shipping numeric := 200;
  v_order_prefix text := 'ORD-';
  v_invoice_prefix text := 'INV-';
  v_order_id uuid;
  v_order_number text;
  v_invoice_number text;
  v_invoice_id uuid;
  v_entry_id uuid;
  v_product_id uuid;
  v_product_name text;
  v_product_price numeric;
  v_product_cost numeric;
  v_product_stock integer;
  v_quantity integer;
  v_total_cost numeric := 0;
  v_item jsonb;
  v_entry_number text;
  v_today date := current_date;
BEGIN
  IF p_idempotency_key IS NULL OR length(trim(p_idempotency_key)) < 16 OR length(p_idempotency_key) > 128 THEN
    RAISE EXCEPTION 'Invalid order reference';
  END IF;

  SELECT id, order_number INTO v_existing_id, v_existing_number
  FROM orders WHERE idempotency_key = p_idempotency_key;
  IF v_existing_id IS NOT NULL THEN
    RETURN jsonb_build_object('order_id', v_existing_id, 'order_number', v_existing_number, 'replayed', true);
  END IF;

  IF p_payment_method IS DISTINCT FROM 'cod' THEN
    RAISE EXCEPTION 'Payment verification required';
  END IF;

  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 OR jsonb_array_length(p_items) > 100 THEN
    RAISE EXCEPTION 'Invalid order items';
  END IF;

  v_name := nullif(trim(p_customer->>'name'), '');
  v_phone := nullif(trim(p_customer->>'phone'), '');
  v_email := nullif(trim(p_customer->>'email'), '');
  v_address := nullif(trim(p_customer->>'address'), '');
  v_city := nullif(trim(p_customer->>'city'), '');

  IF v_name IS NULL OR v_phone IS NULL OR v_address IS NULL OR v_city IS NULL THEN
    RAISE EXCEPTION 'Required customer details are missing';
  END IF;

  SELECT tax_rate, shipping_flat_rate, free_shipping_threshold, order_prefix, invoice_prefix
  INTO v_tax_rate, v_shipping_flat, v_free_shipping, v_order_prefix, v_invoice_prefix
  FROM store_settings
  ORDER BY created_at
  LIMIT 1;

  v_tax_rate := COALESCE(v_tax_rate, 0);
  v_shipping_flat := COALESCE(v_shipping_flat, 25);
  v_free_shipping := COALESCE(v_free_shipping, 200);
  v_order_prefix := COALESCE(v_order_prefix, 'ORD-');
  v_invoice_prefix := COALESCE(v_invoice_prefix, 'INV-');

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items) LOOP
    BEGIN
      v_product_id := (v_item->>'product_id')::uuid;
      v_quantity := (v_item->>'quantity')::integer;
    EXCEPTION WHEN others THEN
      RAISE EXCEPTION 'Invalid product item';
    END;

    IF v_quantity IS NULL OR v_quantity < 1 OR v_quantity > 100 THEN
      RAISE EXCEPTION 'Invalid product quantity';
    END IF;

    SELECT id, name, price, cost, stock
    INTO v_product_id, v_product_name, v_product_price, v_product_cost, v_product_stock
    FROM products
    WHERE id = v_product_id AND is_active = true
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Product unavailable';
    END IF;

    IF v_product_stock < v_quantity THEN
      RAISE EXCEPTION 'Insufficient stock';
    END IF;

    v_subtotal := v_subtotal + (v_product_price * v_quantity);
    v_total_cost := v_total_cost + (COALESCE(v_product_cost, 0) * v_quantity);
  END LOOP;

  v_tax_amount := round(v_subtotal * v_tax_rate / 100, 2);
  v_shipping_cost := CASE WHEN v_subtotal >= v_free_shipping THEN 0 ELSE v_shipping_flat END;
  v_total := v_subtotal + v_tax_amount + v_shipping_cost;

  SELECT id INTO v_customer_id FROM customers WHERE phone = v_phone ORDER BY created_at LIMIT 1 FOR UPDATE;
  IF v_customer_id IS NULL THEN
    INSERT INTO customers (name, email, phone, address, city)
    VALUES (v_name, v_email, v_phone, v_address, v_city)
    RETURNING id INTO v_customer_id;
  ELSE
    UPDATE customers
    SET name = v_name, email = v_email, address = v_address, city = v_city
    WHERE id = v_customer_id;
  END IF;

  v_order_number := v_order_prefix || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12));
  INSERT INTO orders (
    customer_id, order_number, idempotency_key, status, payment_status, payment_method,
    subtotal, tax_rate, tax_amount, shipping_cost, total,
    shipping_name, shipping_phone, shipping_address, shipping_city, notes
  ) VALUES (
    v_customer_id, v_order_number, p_idempotency_key, 'pending', 'unpaid', 'cod',
    v_subtotal, v_tax_rate, v_tax_amount, v_shipping_cost, v_total,
    v_name, v_phone, v_address, v_city, p_notes
  )
  ON CONFLICT (idempotency_key) DO NOTHING
  RETURNING id INTO v_order_id;

  IF v_order_id IS NULL THEN
    SELECT id, order_number INTO v_existing_id, v_existing_number
    FROM orders WHERE idempotency_key = p_idempotency_key;
    RETURN jsonb_build_object('order_id', v_existing_id, 'order_number', v_existing_number, 'replayed', true);
  END IF;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items) LOOP
    v_product_id := (v_item->>'product_id')::uuid;
    v_quantity := (v_item->>'quantity')::integer;

    SELECT name, price INTO v_product_name, v_product_price
    FROM products WHERE id = v_product_id FOR UPDATE;

    INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price, total_price)
    VALUES (v_order_id, v_product_id, v_product_name, v_quantity, v_product_price, v_product_price * v_quantity);

    UPDATE products
    SET stock = stock - v_quantity, updated_at = now()
    WHERE id = v_product_id AND stock >= v_quantity;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Insufficient stock';
    END IF;
  END LOOP;

  v_invoice_number := v_invoice_prefix || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12));
  INSERT INTO invoices (
    invoice_number, order_id, customer_id, invoice_date, due_date,
    subtotal, tax_amount, total, paid_amount, status
  ) VALUES (
    v_invoice_number, v_order_id, v_customer_id, v_today, v_today + 30,
    v_subtotal, v_tax_amount, v_total, 0, 'sent'
  ) RETURNING id INTO v_invoice_id;

  v_entry_number := 'JE-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12));
  INSERT INTO journal_entries (
    entry_number, entry_date, description, reference, reference_type,
    status, total_debit, total_credit
  ) VALUES (
    v_entry_number, v_today, 'إيراد بيع - طلب ' || v_order_number, v_order_number, 'order',
    'posted', v_total + v_total_cost, v_total + v_total_cost
  ) RETURNING id INTO v_entry_id;

  INSERT INTO journal_lines (entry_id, account_id, debit, credit, description, line_order)
  SELECT v_entry_id, id, v_total, 0, 'ذمم مدينة - ' || v_order_number, 1 FROM accounts WHERE code = '1100';
  INSERT INTO journal_lines (entry_id, account_id, debit, credit, description, line_order)
  SELECT v_entry_id, id, 0, v_subtotal, 'إيراد مبيعات - ' || v_order_number, 2 FROM accounts WHERE code = '4000';
  IF v_shipping_cost > 0 THEN
    INSERT INTO journal_lines (entry_id, account_id, debit, credit, description, line_order)
    SELECT v_entry_id, id, 0, v_shipping_cost, 'إيراد شحن - ' || v_order_number, 3 FROM accounts WHERE code = '4100';
  END IF;
  IF v_tax_amount > 0 THEN
    INSERT INTO journal_lines (entry_id, account_id, debit, credit, description, line_order)
    SELECT v_entry_id, id, 0, v_tax_amount, 'ضريبة مستحقة - ' || v_order_number, 4 FROM accounts WHERE code = '2100';
  END IF;
  IF v_total_cost > 0 THEN
    INSERT INTO journal_lines (entry_id, account_id, debit, credit, description, line_order)
    SELECT v_entry_id, id, v_total_cost, 0, 'تكلفة البضاعة المباعة - ' || v_order_number, 5 FROM accounts WHERE code = '5000';
    INSERT INTO journal_lines (entry_id, account_id, debit, credit, description, line_order)
    SELECT v_entry_id, id, 0, v_total_cost, 'خفض المخزون - ' || v_order_number, 6 FROM accounts WHERE code = '1200';
  END IF;

  UPDATE customers c
  SET total_orders = (SELECT count(*) FROM orders WHERE customer_id = c.id AND status <> 'cancelled'),
      total_spent = COALESCE((SELECT sum(total) FROM orders WHERE customer_id = c.id AND status <> 'cancelled'), 0)
  WHERE c.id = v_customer_id;

  INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, metadata)
  VALUES (auth.uid(), 'checkout.created', 'order', v_order_id,
    jsonb_build_object('order_number', v_order_number, 'total', v_total, 'payment_status', 'unpaid'));

  RETURN jsonb_build_object(
    'order_id', v_order_id,
    'order_number', v_order_number,
    'invoice_number', v_invoice_number,
    'total', v_total,
    'replayed', false
  );
END;
$$;

CREATE OR REPLACE FUNCTION decrement_stock(p_product_id uuid, p_quantity int)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_quantity IS NULL OR p_quantity < 1 THEN
    RAISE EXCEPTION 'Invalid stock quantity';
  END IF;
  UPDATE products SET stock = stock - p_quantity, updated_at = now()
  WHERE id = p_product_id AND stock >= p_quantity;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Insufficient stock';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION update_customer_stats(p_customer_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE customers
  SET total_orders = (SELECT COUNT(*) FROM orders WHERE customer_id = p_customer_id AND status <> 'cancelled'),
      total_spent = COALESCE((SELECT SUM(total) FROM orders WHERE customer_id = p_customer_id AND status <> 'cancelled'), 0)
  WHERE id = p_customer_id;
END;
$$;

REVOKE ALL ON FUNCTION is_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION is_admin() TO authenticated;
REVOKE ALL ON FUNCTION bootstrap_admin(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION bootstrap_admin(text) TO authenticated;
REVOKE ALL ON FUNCTION checkout_order(text, jsonb, jsonb, text, text) FROM PUBLIC, authenticated;
GRANT EXECUTE ON FUNCTION checkout_order(text, jsonb, jsonb, text, text) TO anon;
REVOKE ALL ON FUNCTION decrement_stock(uuid, int) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION decrement_stock(uuid, int) TO service_role;
REVOKE ALL ON FUNCTION update_customer_stats(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION update_customer_stats(uuid) TO service_role;

REVOKE ALL ON store_products FROM PUBLIC, authenticated;
GRANT SELECT ON store_products TO anon;
REVOKE ALL ON admin_users FROM PUBLIC, anon;
GRANT SELECT ON admin_users TO authenticated;
REVOKE ALL ON audit_logs FROM PUBLIC, anon;
GRANT SELECT ON audit_logs TO authenticated;
REVOKE ALL ON ai_provider_keys FROM anon, authenticated;
GRANT ALL ON ai_provider_keys TO service_role;
REVOKE ALL ON app_secrets FROM anon, authenticated;
GRANT ALL ON app_secrets TO service_role;

REVOKE ALL ON products FROM anon;
GRANT SELECT ON products TO authenticated;
GRANT SELECT (id, category_id, name, slug, description, price, stock, sku, image_url, is_active, is_featured, rating, tags, created_at, updated_at) ON products TO anon;
GRANT SELECT ON categories TO anon, authenticated;
GRANT SELECT ON store_settings TO anon, authenticated;

REVOKE ALL ON customers, orders, order_items, invoices, payments, accounts, journal_entries, journal_lines FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON customers, orders, order_items, invoices, payments, accounts, journal_entries, journal_lines TO authenticated;
GRANT SELECT, INSERT, UPDATE ON products TO authenticated;
GRANT INSERT, UPDATE ON store_settings TO authenticated;

DROP POLICY IF EXISTS "acc_delete" ON accounts;
DROP POLICY IF EXISTS "acc_insert" ON accounts;
DROP POLICY IF EXISTS "acc_select" ON accounts;
DROP POLICY IF EXISTS "acc_update" ON accounts;
DROP POLICY IF EXISTS "cat_delete" ON categories;
DROP POLICY IF EXISTS "cat_insert" ON categories;
DROP POLICY IF EXISTS "cat_select" ON categories;
DROP POLICY IF EXISTS "cat_update" ON categories;
DROP POLICY IF EXISTS "cust_delete" ON customers;
DROP POLICY IF EXISTS "cust_insert" ON customers;
DROP POLICY IF EXISTS "cust_select" ON customers;
DROP POLICY IF EXISTS "cust_update" ON customers;
DROP POLICY IF EXISTS "inv_delete" ON invoices;
DROP POLICY IF EXISTS "inv_insert" ON invoices;
DROP POLICY IF EXISTS "inv_select" ON invoices;
DROP POLICY IF EXISTS "inv_update" ON invoices;
DROP POLICY IF EXISTS "je_delete" ON journal_entries;
DROP POLICY IF EXISTS "je_insert" ON journal_entries;
DROP POLICY IF EXISTS "je_select" ON journal_entries;
DROP POLICY IF EXISTS "je_update" ON journal_entries;
DROP POLICY IF EXISTS "jl_delete" ON journal_lines;
DROP POLICY IF EXISTS "jl_insert" ON journal_lines;
DROP POLICY IF EXISTS "jl_select" ON journal_lines;
DROP POLICY IF EXISTS "jl_update" ON journal_lines;
DROP POLICY IF EXISTS "oi_delete" ON order_items;
DROP POLICY IF EXISTS "oi_insert" ON order_items;
DROP POLICY IF EXISTS "oi_select" ON order_items;
DROP POLICY IF EXISTS "oi_update" ON order_items;
DROP POLICY IF EXISTS "ord_delete" ON orders;
DROP POLICY IF EXISTS "ord_insert" ON orders;
DROP POLICY IF EXISTS "ord_select" ON orders;
DROP POLICY IF EXISTS "ord_update" ON orders;
DROP POLICY IF EXISTS "pay_delete" ON payments;
DROP POLICY IF EXISTS "pay_insert" ON payments;
DROP POLICY IF EXISTS "pay_select" ON payments;
DROP POLICY IF EXISTS "pay_update" ON payments;
DROP POLICY IF EXISTS "prod_delete" ON products;
DROP POLICY IF EXISTS "prod_insert" ON products;
DROP POLICY IF EXISTS "prod_select" ON products;
DROP POLICY IF EXISTS "prod_update" ON products;
DROP POLICY IF EXISTS "ss_delete" ON store_settings;
DROP POLICY IF EXISTS "ss_insert" ON store_settings;
DROP POLICY IF EXISTS "ss_select" ON store_settings;
DROP POLICY IF EXISTS "ss_update" ON store_settings;

DROP POLICY IF EXISTS "admin_users_select_self" ON admin_users;
CREATE POLICY "admin_users_select_self" ON admin_users FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "audit_logs_admin_select" ON audit_logs;
CREATE POLICY "audit_logs_admin_select" ON audit_logs FOR SELECT TO authenticated USING (is_admin());

DROP POLICY IF EXISTS "categories_public_select" ON categories;
CREATE POLICY "categories_public_select" ON categories FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "categories_admin_insert" ON categories;
CREATE POLICY "categories_admin_insert" ON categories FOR INSERT TO authenticated WITH CHECK (is_admin());
DROP POLICY IF EXISTS "categories_admin_update" ON categories;
CREATE POLICY "categories_admin_update" ON categories FOR UPDATE TO authenticated USING (is_admin()) WITH CHECK (is_admin());
DROP POLICY IF EXISTS "categories_admin_delete" ON categories;
CREATE POLICY "categories_admin_delete" ON categories FOR DELETE TO authenticated USING (is_admin());

DROP POLICY IF EXISTS "products_public_active_select" ON products;
CREATE POLICY "products_public_active_select" ON products FOR SELECT TO anon USING (is_active = true);
DROP POLICY IF EXISTS "products_admin_select" ON products;
CREATE POLICY "products_admin_select" ON products FOR SELECT TO authenticated USING (is_admin());
DROP POLICY IF EXISTS "products_admin_insert" ON products;
CREATE POLICY "products_admin_insert" ON products FOR INSERT TO authenticated WITH CHECK (is_admin());
DROP POLICY IF EXISTS "products_admin_update" ON products;
CREATE POLICY "products_admin_update" ON products FOR UPDATE TO authenticated USING (is_admin()) WITH CHECK (is_admin());
DROP POLICY IF EXISTS "products_admin_delete" ON products;
CREATE POLICY "products_admin_delete" ON products FOR DELETE TO authenticated USING (is_admin());

DROP POLICY IF EXISTS "settings_public_select" ON store_settings;
CREATE POLICY "settings_public_select" ON store_settings FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "settings_admin_insert" ON store_settings;
CREATE POLICY "settings_admin_insert" ON store_settings FOR INSERT TO authenticated WITH CHECK (is_admin());
DROP POLICY IF EXISTS "settings_admin_update" ON store_settings;
CREATE POLICY "settings_admin_update" ON store_settings FOR UPDATE TO authenticated USING (is_admin()) WITH CHECK (is_admin());
DROP POLICY IF EXISTS "settings_admin_delete" ON store_settings;
CREATE POLICY "settings_admin_delete" ON store_settings FOR DELETE TO authenticated USING (is_admin());

CREATE POLICY "customers_admin_select" ON customers FOR SELECT TO authenticated USING (is_admin());
CREATE POLICY "customers_admin_insert" ON customers FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY "customers_admin_update" ON customers FOR UPDATE TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "customers_admin_delete" ON customers FOR DELETE TO authenticated USING (is_admin());
CREATE POLICY "orders_admin_select" ON orders FOR SELECT TO authenticated USING (is_admin());
CREATE POLICY "orders_admin_insert" ON orders FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY "orders_admin_update" ON orders FOR UPDATE TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "orders_admin_delete" ON orders FOR DELETE TO authenticated USING (is_admin());
CREATE POLICY "order_items_admin_select" ON order_items FOR SELECT TO authenticated USING (is_admin());
CREATE POLICY "order_items_admin_insert" ON order_items FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY "order_items_admin_update" ON order_items FOR UPDATE TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "order_items_admin_delete" ON order_items FOR DELETE TO authenticated USING (is_admin());
CREATE POLICY "invoices_admin_select" ON invoices FOR SELECT TO authenticated USING (is_admin());
CREATE POLICY "invoices_admin_insert" ON invoices FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY "invoices_admin_update" ON invoices FOR UPDATE TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "invoices_admin_delete" ON invoices FOR DELETE TO authenticated USING (is_admin());
CREATE POLICY "payments_admin_select" ON payments FOR SELECT TO authenticated USING (is_admin());
CREATE POLICY "payments_admin_insert" ON payments FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY "payments_admin_update" ON payments FOR UPDATE TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "payments_admin_delete" ON payments FOR DELETE TO authenticated USING (is_admin());
CREATE POLICY "accounts_admin_select" ON accounts FOR SELECT TO authenticated USING (is_admin());
CREATE POLICY "accounts_admin_insert" ON accounts FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY "accounts_admin_update" ON accounts FOR UPDATE TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "accounts_admin_delete" ON accounts FOR DELETE TO authenticated USING (is_admin());
CREATE POLICY "journal_entries_admin_select" ON journal_entries FOR SELECT TO authenticated USING (is_admin());
CREATE POLICY "journal_entries_admin_insert" ON journal_entries FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY "journal_entries_admin_update" ON journal_entries FOR UPDATE TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "journal_entries_admin_delete" ON journal_entries FOR DELETE TO authenticated USING (is_admin());
CREATE POLICY "journal_lines_admin_select" ON journal_lines FOR SELECT TO authenticated USING (is_admin());
CREATE POLICY "journal_lines_admin_insert" ON journal_lines FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY "journal_lines_admin_update" ON journal_lines FOR UPDATE TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "journal_lines_admin_delete" ON journal_lines FOR DELETE TO authenticated USING (is_admin());

REVOKE ALL ON store_products FROM authenticated;
GRANT SELECT ON store_products TO anon;
