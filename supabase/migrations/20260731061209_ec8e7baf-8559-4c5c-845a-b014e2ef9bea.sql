DROP POLICY IF EXISTS "signed in users can enrich products" ON public.products;

CREATE POLICY "creators or admins can update products"
ON public.products
FOR UPDATE
TO authenticated
USING (
  created_by = auth.uid()
  OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::app_role)
)
WITH CHECK (
  created_by = auth.uid()
  OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::app_role)
);