-- Wallet-first Profiles schema migration
-- This migration restructures the profiles table for wallet-based auth

BEGIN;

-- Ensure uuid extension exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- If an old profiles table exists referencing auth.users, transform it.
-- 1) Drop trigger/function related to auth.users if they exist
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE t.tgname = 'on_auth_user_created'
  ) THEN
    DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
  END IF;
EXCEPTION WHEN undefined_table THEN
  -- auth.users or trigger may not exist in this environment
  NULL;
END $$;

-- 2) Create profiles table if missing, otherwise alter to new shape
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_address TEXT NOT NULL,
  full_name TEXT,
  role TEXT NOT NULL CHECK (role IN ('farmer','processor','consumer')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add wallet uniqueness (case-insensitive) using functional unique index
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'profiles_wallet_address_lower_uidx'
  ) THEN
    CREATE UNIQUE INDEX profiles_wallet_address_lower_uidx ON public.profiles (LOWER(wallet_address));
  END IF;
END $$;

-- If legacy columns exist, migrate/clean them
DO $$
BEGIN
  -- Drop legacy columns if they exist
  IF EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='email'
  ) THEN
    ALTER TABLE public.profiles DROP COLUMN email;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='organization_name'
  ) THEN
    ALTER TABLE public.profiles DROP COLUMN organization_name;
  END IF;

  -- If a stray display_name column exists from prior migrations, remove it to keep full_name canonical
  IF EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='display_name'
  ) THEN
    ALTER TABLE public.profiles DROP COLUMN display_name;
  END IF;

  -- Ensure id is not FK to auth.users anymore
  BEGIN
    ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;
  EXCEPTION WHEN undefined_object THEN
    NULL;
  END;

  -- Replace role check constraint to enforce lowercase values
  BEGIN
    ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
  EXCEPTION WHEN undefined_object THEN
    NULL;
  END;

  ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_role_check CHECK (role IN ('farmer','processor','consumer'));

  -- Normalize any accidental uppercase/mixed roles back to lowercase for consistency
  UPDATE public.profiles SET role = LOWER(role) WHERE role IS NOT NULL AND role <> LOWER(role);

  -- Ensure id column has a default to support wallet-first inserts
  ALTER TABLE public.profiles ALTER COLUMN id SET DEFAULT uuid_generate_v4();
END $$;

-- Update trigger for updated_at if not present
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'set_profiles_updated_at'
  ) THEN
    CREATE TRIGGER set_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

COMMIT;
