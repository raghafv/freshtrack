DROP POLICY IF EXISTS "users read own tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "admins update tickets" ON public.support_tickets;

CREATE POLICY "users read own tickets" ON public.support_tickets
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::app_role
    )
    OR lower(coalesce(auth.jwt() ->> 'email', '')) = 'raghav.goyal909@gmail.com'
  );

CREATE POLICY "admins update tickets" ON public.support_tickets
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::app_role
    )
    OR lower(coalesce(auth.jwt() ->> 'email', '')) = 'raghav.goyal909@gmail.com'
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::app_role
    )
    OR lower(coalesce(auth.jwt() ->> 'email', '')) = 'raghav.goyal909@gmail.com'
  );