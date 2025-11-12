-- Fix certification_requests.farmer_id foreign key to point to public.profiles(id)
-- Safe to run multiple times

BEGIN;

-- Ensure table exists
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'certification_requests'
  ) THEN
    RAISE NOTICE 'Table public.certification_requests does not exist; nothing to change.';
  END IF;
END $$;

-- Drop existing FK if any (often points to auth.users(id))
ALTER TABLE IF EXISTS public.certification_requests
  DROP CONSTRAINT IF EXISTS certification_requests_farmer_id_fkey;

-- Recreate FK to profiles(id)
ALTER TABLE IF EXISTS public.certification_requests
  ADD CONSTRAINT certification_requests_farmer_id_fkey
  FOREIGN KEY (farmer_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Optional backfill: if farmer_id is NULL but farmer_address matches profiles.wallet_address, set farmer_id
UPDATE public.certification_requests cr
SET farmer_id = p.id
FROM public.profiles p
WHERE cr.farmer_id IS NULL AND lower(cr.farmer_address) = lower(p.wallet_address);

COMMIT;

-- Notes:
-- Run order (fresh DB): 001_init-schema.sql -> 002_certification_requests.sql -> 005_wallet_first_profiles.sql -> 006_retarget_fks_to_profiles.sql -> 007_fix_certification_requests_fk.sql
-- If you skip 006, this 007 script will still fix the FK.
