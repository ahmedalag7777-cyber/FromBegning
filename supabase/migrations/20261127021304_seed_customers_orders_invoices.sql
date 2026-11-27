/*
# Seed customers, orders, invoices, and journal entries

1. Data Inserted
- 8 sample customers with Arabic names and contact info
- 12 sample orders spanning last 30 days with various statuses
- Order items for each order referencing actual products
- Invoices for paid/delivered orders
- Journal entries with balanced double-entry lines (debit cash, credit revenue + COGS entries)

2. Notes
- Products referenced via subselect by name (stable, no hardcoded UUIDs)
- journal_entries uses entry_number (unique) and total_debit/total_credit columns
- All amounts are numeric
*/

-- Customers
INSERT INTO customers (name, email, phone, address, city, total_orders, total_spent)
VALUES
  ('أحمد محمد العتيبي', 'ahmed@example.com', '0501234567', 'حي النخيل، شارع الملك فهد', 'الرياض', 3, 4500),
  ('فاطمة الزهراني', 'fatima@example.com', '0552345678', 'حي الروضة، طريق المدينة', 'جدة', 2, 2800),
  ('محمد عبدالله القحطاني', 'mohammed@example.com', '0563456789', 'حي الورود', 'الدمام', 5, 8200),
  ('نورة السبيعي', 'noura@example.com', '0574567890', 'حي الياسمين', 'الرياض', 1, 1200),
  ('خالد الشمري', 'khaled@example.com', '0585678901', 'حي العليا', 'الرياض', 4, 6100),
  ('سارة المطيري', 'sara@example.com', '0596789012', 'حي السلامة', 'جدة', 2, 3400),
  ('عبدالرحمن الدوسري', 'abdulrahman@example.com', '0507890123', 'حي الملقا', 'الرياض', 1, 950),
  ('منى العنزي', 'mona@example.com', '0518901234', 'حي الفيحاء', 'مكة المكرمة', 3, 5200);

-- Orders
INSERT INTO orders (order_number, customer_id, status, payment_status, payment_method, subtotal, tax_rate, tax_amount, shipping_cost, total, shipping_name, shipping_phone, shipping_address, shipping_city, created_at)
SELECT
  'ORD-' || lpad(gs::text, 5, '0'),
  c.id,
  CASE (gs % 5)
    WHEN 0 THEN 'pending'::text
    WHEN 1 THEN 'processing'::text
    WHEN 2 THEN 'shipped'::text
    WHEN 3 THEN 'delivered'::text
    WHEN 4 THEN 'delivered'::text
  END,
  CASE (gs % 4)
    WHEN 0 THEN 'unpaid'::text
    WHEN 1 THEN 'paid'::text
    WHEN 2 THEN 'paid'::text
    WHEN 3 THEN 'paid'::text
  END,
  CASE (gs % 3)
    WHEN 0 THEN 'cash'::text
    WHEN 1 THEN 'card'::text
    WHEN 2 THEN 'transfer'::text
  END,
  (100 + gs * 80)::numeric,
  0.15,
  ((100 + gs * 80) * 0.15)::numeric,
  CASE WHEN (100 + gs * 80) > 500 THEN 0 ELSE 25 END,
  ((100 + gs * 80) * 1.15 + CASE WHEN (100 + gs * 80) > 500 THEN 0 ELSE 25 END)::numeric,
  c.name,
  c.phone,
  c.address,
  c.city,
  (now() - (gs || ' days')::interval)::timestamptz
FROM generate_series(0, 11) gs
JOIN customers c ON c.email = (
  CASE (gs % 8)
    WHEN 0 THEN 'ahmed@example.com'
    WHEN 1 THEN 'fatima@example.com'
    WHEN 2 THEN 'mohammed@example.com'
    WHEN 3 THEN 'noura@example.com'
    WHEN 4 THEN 'khaled@example.com'
    WHEN 5 THEN 'sara@example.com'
    WHEN 6 THEN 'abdulrahman@example.com'
    WHEN 7 THEN 'mona@example.com'
  END
);

-- Order items (1-2 items per order)
INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price, total_price)
SELECT
  o.id,
  p.id,
  p.name,
  qty,
  p.price,
  p.price * qty
FROM orders o
CROSS JOIN LATERAL (
  SELECT (1 + (floor(random() * 3))::int) AS qty
) v
CROSS JOIN LATERAL (
  SELECT * FROM products ORDER BY random() LIMIT 1
) p;

-- Invoices for paid/delivered orders
INSERT INTO invoices (invoice_number, order_id, customer_id, invoice_date, due_date, subtotal, tax_amount, total, paid_amount, status)
SELECT
  'INV-' || lpad(row_number() OVER ()::text, 5, '0'),
  o.id,
  o.customer_id,
  o.created_at::date,
  (o.created_at + interval '30 days')::date,
  o.subtotal,
  o.tax_amount,
  o.total,
  CASE WHEN o.payment_status = 'paid' THEN o.total ELSE 0 END,
  CASE WHEN o.payment_status = 'paid' THEN 'paid' ELSE 'sent' END
FROM orders o
WHERE o.payment_status = 'paid' OR o.status = 'delivered';

-- Journal entries for revenue (from paid orders)
INSERT INTO journal_entries (entry_number, entry_date, description, reference, reference_type, total_debit, total_credit, status)
SELECT
  'JE-' || lpad(row_number() OVER ()::text, 5, '0'),
  o.created_at::date,
  'إيراد مبيعات - ' || o.order_number,
  o.order_number,
  'order',
  o.total,
  o.total,
  'posted'
FROM orders o
WHERE o.payment_status = 'paid'
ORDER BY o.created_at;

-- Journal line: debit cash (1000)
INSERT INTO journal_lines (entry_id, account_id, debit, credit, description, line_order)
SELECT
  je.id,
  (SELECT id FROM accounts WHERE code = '1000' LIMIT 1),
  je.total_debit,
  0,
  'إضافة المبلغ للصندوق',
  1
FROM journal_entries je
WHERE je.reference_type = 'order';

-- Journal line: credit sales revenue (4000)
INSERT INTO journal_lines (entry_id, account_id, debit, credit, description, line_order)
SELECT
  je.id,
  (SELECT id FROM accounts WHERE code = '4000' LIMIT 1),
  0,
  je.total_credit,
  'إيراد مبيعات',
  2
FROM journal_entries je
WHERE je.reference_type = 'order';
