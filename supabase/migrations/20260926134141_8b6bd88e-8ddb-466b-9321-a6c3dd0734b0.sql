DROP POLICY IF EXISTS "signed in users read products" ON public.products;
CREATE POLICY "creators and admins read products" ON public.products
FOR SELECT TO authenticated
USING (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));