-- Retarget all foreign keys from auth.users(id) to public.profiles(id)
-- Keeps original ON DELETE behaviors.

BEGIN;

-- Certifications.user_id -> profiles.id (ON DELETE CASCADE)
ALTER TABLE IF EXISTS public.certifications
  DROP CONSTRAINT IF EXISTS certifications_user_id_fkey;
ALTER TABLE IF EXISTS public.certifications
  ADD CONSTRAINT certifications_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Products.farmer_id -> profiles.id (ON DELETE CASCADE)
ALTER TABLE IF EXISTS public.products
  DROP CONSTRAINT IF EXISTS products_farmer_id_fkey;
ALTER TABLE IF EXISTS public.products
  ADD CONSTRAINT products_farmer_id_fkey
  FOREIGN KEY (farmer_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Products.current_owner_id -> profiles.id (no explicit ON DELETE)
ALTER TABLE IF EXISTS public.products
  DROP CONSTRAINT IF EXISTS products_current_owner_id_fkey;
ALTER TABLE IF EXISTS public.products
  ADD CONSTRAINT products_current_owner_id_fkey
  FOREIGN KEY (current_owner_id) REFERENCES public.profiles(id);

-- Product_movements.from_user_id -> profiles.id (no explicit ON DELETE)
ALTER TABLE IF EXISTS public.product_movements
  DROP CONSTRAINT IF EXISTS product_movements_from_user_id_fkey;
ALTER TABLE IF EXISTS public.product_movements
  ADD CONSTRAINT product_movements_from_user_id_fkey
  FOREIGN KEY (from_user_id) REFERENCES public.profiles(id);

-- Product_movements.to_user_id -> profiles.id (ON DELETE CASCADE)
ALTER TABLE IF EXISTS public.product_movements
  DROP CONSTRAINT IF EXISTS product_movements_to_user_id_fkey;
ALTER TABLE IF EXISTS public.product_movements
  ADD CONSTRAINT product_movements_to_user_id_fkey
  FOREIGN KEY (to_user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Certification_requests.farmer_id -> profiles.id (ON DELETE SET NULL)
ALTER TABLE IF EXISTS public.certification_requests
  DROP CONSTRAINT IF EXISTS certification_requests_farmer_id_fkey;
ALTER TABLE IF EXISTS public.certification_requests
  ADD CONSTRAINT certification_requests_farmer_id_fkey
  FOREIGN KEY (farmer_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

COMMIT;
