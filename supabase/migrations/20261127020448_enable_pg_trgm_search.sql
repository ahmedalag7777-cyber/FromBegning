/*
# Enable pg_trgm for Arabic fuzzy text search

1. Extensions
- Enable pg_trgm extension for trigram-based fuzzy matching

2. Indexes
- Add GIN trigram indexes on products.name, products.description, customers.name, customers.phone
- Enables fast LIKE/ILIKE and similarity() queries for Arabic text search

3. Notes
- pg_trgm supports Arabic text since it works on character-level trigrams
- These indexes accelerate both exact and fuzzy matching
*/

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_products_name_trgm ON products USING GIN (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_products_desc_trgm ON products USING GIN (description gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_customers_name_trgm ON customers USING GIN (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_customers_phone_trgm ON customers USING GIN (phone gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_orders_number_trgm ON orders USING GIN (order_number gin_trgm_ops);
