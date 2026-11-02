-- 1. The owner-admin trigger trusted the editable profiles.email value.
DROP TRIGGER IF EXISTS profiles_grant_owner_admin ON public.profiles;
DROP FUNCTION IF EXISTS public.grant_owner_admin();

-- 2. Product catalog: sign-in required to read, own rows only to insert.
DROP POLICY IF EXISTS "products readable by everyone" ON public.products;
DROP POLICY IF EXISTS "signed in users can add products" ON public.products;

CREATE POLICY "signed in users read products" ON public.products
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "users add products they create" ON public.products
  FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

REVOKE SELECT ON public.products FROM anon;

-- 3. Storage: remove the unbound shared-read rules.
DROP POLICY IF EXISTS "signed in users can read dish photos" ON storage.objects;
DROP POLICY IF EXISTS "support read own or admin" ON storage.objects;

CREATE POLICY "support read own uploads" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'support-images'
    AND (storage.foldername(name))[1] = (auth.uid())::text
  );