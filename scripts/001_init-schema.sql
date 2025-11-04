-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
-- Drop existing objects if present (trigger/function first)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- Drop tables in reverse-dependency order to avoid FK conflicts
DROP TABLE IF EXISTS public.product_movements CASCADE;
DROP TABLE IF EXISTS public.products CASCADE;
DROP TABLE IF EXISTS public.certifications CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- Ensure the uuid extension is available
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users/Profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  role TEXT CHECK (role IN ('farmer', 'processor', 'consumer')),
  organization_name TEXT,
  wallet_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Certifications table
CREATE TABLE IF NOT EXISTS public.certifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  certification_type TEXT NOT NULL,
  issuing_body TEXT NOT NULL,
  certification_number TEXT UNIQUE NOT NULL,
  valid_from DATE NOT NULL,
  valid_until DATE NOT NULL,
  certificate_url TEXT,
  verified BOOLEAN DEFAULT FALSE,
  blockchain_hash TEXT UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Products table
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  farmer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  product_sku TEXT UNIQUE NOT NULL,
  product_type TEXT NOT NULL,
  description TEXT,
  farming_practices TEXT,
  harvest_date DATE,
  certification_id UUID REFERENCES public.certifications(id),
  qr_code_url TEXT UNIQUE,
  blockchain_hash TEXT UNIQUE,
  current_owner_id UUID REFERENCES auth.users(id),
  status TEXT DEFAULT 'created' CHECK (status IN ('created', 'in_transit', 'processed', 'retail', 'sold')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Product movement/tracking history
CREATE TABLE IF NOT EXISTS public.product_movements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  from_user_id UUID REFERENCES auth.users(id),
  to_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  movement_type TEXT NOT NULL,
  location TEXT,
  notes TEXT,
  temperature_reading FLOAT,
  humidity_reading FLOAT,
  blockchain_hash TEXT UNIQUE,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Explicitly ensure Row Level Security is disabled for these tables
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.certifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.products DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_movements DISABLE ROW LEVEL SECURITY;

-- Recreate trigger/function for profile auto-creation on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  meta_role TEXT;
  meta_name TEXT;
BEGIN
  -- Extract role/full_name from auth user's raw_user_meta_data set during signUp
  meta_role := lower(COALESCE(new.raw_user_meta_data->>'role', 'consumer'));
  IF meta_role NOT IN ('farmer', 'processor', 'consumer') THEN
    meta_role := 'consumer';
  END IF;

  meta_name := NULLIF(new.raw_user_meta_data->>'full_name', '');

  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (new.id, new.email, meta_name, meta_role);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
