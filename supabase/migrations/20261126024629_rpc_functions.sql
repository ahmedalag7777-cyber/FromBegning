/*
# RPC Functions: decrement_stock, update_customer_stats

## Overview
Creates two helper functions:
1. `decrement_stock(p_product_id, p_quantity)` - Atomically decrements product stock and prevents negative stock.
2. `update_customer_stats(p_customer_id)` - Recalculates total_orders and total_spent for a customer.

Both are safe to call from the anon key.
*/

-- Decrement stock atomically
CREATE OR REPLACE FUNCTION decrement_stock(p_product_id uuid, p_quantity int)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE products
  SET stock = GREATEST(stock - p_quantity, 0),
      updated_at = now()
  WHERE id = p_product_id;
END;
$$;

-- Update customer stats from orders
CREATE OR REPLACE FUNCTION update_customer_stats(p_customer_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE customers
  SET 
    total_orders = (
      SELECT COUNT(*) FROM orders WHERE customer_id = p_customer_id AND status != 'cancelled'
    ),
    total_spent = COALESCE((
      SELECT SUM(total) FROM orders WHERE customer_id = p_customer_id AND status != 'cancelled'
    ), 0)
  WHERE id = p_customer_id;
END;
$$;

-- Grant execute to anon and authenticated
GRANT EXECUTE ON FUNCTION decrement_stock(uuid, int) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION update_customer_stats(uuid) TO anon, authenticated;
