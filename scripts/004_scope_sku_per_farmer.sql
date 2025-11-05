-- Scope SKU uniqueness per farmer instead of globally
-- Safe migration: drops the old unique constraint and adds a composite unique constraint

BEGIN;

-- Old single-column unique constraint created by 001_init-schema.sql
ALTER TABLE IF EXISTS public.products
  DROP CONSTRAINT IF EXISTS products_product_sku_key;

-- New composite constraint: a farmer cannot reuse the same SKU, but other farmers can
ALTER TABLE IF EXISTS public.products
  ADD CONSTRAINT products_farmer_id_product_sku_key UNIQUE (farmer_id, product_sku);

COMMIT;
