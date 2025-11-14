-- Store structured media metadata for each product record
ALTER TABLE IF EXISTS public.products
  ADD COLUMN IF NOT EXISTS media JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.products.media IS 'Array of pinned media metadata objects (cid, gatewayUrl, mimeType, etc).';
