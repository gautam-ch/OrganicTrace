-- Force recreation of certification_requests.farmer_id foreign key to profiles(id)
-- Use when diagnostic query shows no FK constraint but application still reports FK_NOT_MIGRATED.
-- Safe to run multiple times.

BEGIN;

-- Ensure profiles table exists
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='profiles'
  ) THEN
    RAISE EXCEPTION 'profiles table does not exist in public schema.';
  END IF;
END $$;

-- Ensure certification_requests table exists
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='certification_requests'
  ) THEN
    RAISE EXCEPTION 'certification_requests table does not exist in public schema.';
  END IF;
END $$;

-- Drop ANY existing FK on farmer_id (covers legacy or partial migrations)
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT conname
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(c.conkey)
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname='public' AND t.relname='certification_requests' AND a.attname='farmer_id' AND c.contype='f'
  ) LOOP
    EXECUTE format('ALTER TABLE public.certification_requests DROP CONSTRAINT %I', r.conname);
  END LOOP;
END $$;

-- Recreate FK to profiles(id) with ON DELETE SET NULL
ALTER TABLE public.certification_requests
  ADD CONSTRAINT certification_requests_farmer_id_fkey
  FOREIGN KEY (farmer_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Backfill farmer_id using farmer_address if NULL
UPDATE public.certification_requests cr
SET farmer_id = p.id
FROM public.profiles p
WHERE cr.farmer_id IS NULL AND lower(cr.farmer_address) = lower(p.wallet_address);

COMMIT;

-- Verification query (run after this script):
-- SELECT tc.constraint_name, kcu.column_name, ccu.table_name AS foreign_table_name
-- FROM information_schema.table_constraints tc
-- JOIN information_schema.key_column_usage kcu ON tc.constraint_name=kcu.constraint_name AND tc.table_schema=kcu.table_schema
-- JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name=tc.constraint_name AND ccu.table_schema=tc.table_schema
-- WHERE tc.constraint_type='FOREIGN KEY' AND tc.table_schema='public' AND tc.table_name='certification_requests' AND kcu.column_name='farmer_id';
