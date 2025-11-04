-- Certification Requests (Off-chain) for Certifier flow
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop if re-running locally
-- DROP TABLE IF EXISTS public.certification_requests CASCADE;

CREATE TABLE IF NOT EXISTS public.certification_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  farmer_id UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  farmer_address TEXT NOT NULL,
  name TEXT NOT NULL,
  certification_body TEXT,
  document_url TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  expiry_date TIMESTAMP WITH TIME ZONE NULL,
  blockchain_tx_hash TEXT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_certreq_status ON public.certification_requests(status);
CREATE INDEX IF NOT EXISTS idx_certreq_created_at ON public.certification_requests(created_at);
CREATE INDEX IF NOT EXISTS idx_certreq_farmer_address ON public.certification_requests(farmer_address);

-- Disable RLS for simplicity (adjust as needed)
ALTER TABLE public.certification_requests DISABLE ROW LEVEL SECURITY;
