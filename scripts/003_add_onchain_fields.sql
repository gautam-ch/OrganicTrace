-- Add on-chain linkage fields to products for syncing blockchain state
ALTER TABLE IF EXISTS public.products
  ADD COLUMN IF NOT EXISTS product_id_onchain BIGINT UNIQUE,
  ADD COLUMN IF NOT EXISTS last_tx_hash TEXT,
  ADD COLUMN IF NOT EXISTS current_owner_address TEXT;
