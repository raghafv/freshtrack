CREATE TABLE public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  user_email text,
  category text NOT NULL DEFAULT 'Other',
  message text NOT NULL,
  image_urls text[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'open',
  admin_reply text,
  replied_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.support_tickets TO authenticated;
GRANT ALL ON public.support_tickets TO service_role;

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users create own tickets" ON public.support_tickets
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "users read own tickets" ON public.support_tickets
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR lower(coalesce(auth.jwt() ->> 'email', '')) = 'raghav.goyal909@gmail.com'
  );

CREATE POLICY "admins update tickets" ON public.support_tickets
  FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR lower(coalesce(auth.jwt() ->> 'email', '')) = 'raghav.goyal909@gmail.com'
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR lower(coalesce(auth.jwt() ->> 'email', '')) = 'raghav.goyal909@gmail.com'
  );

CREATE TRIGGER support_tickets_updated
  BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX support_tickets_status_created_idx ON public.support_tickets (status, created_at DESC);
CREATE INDEX support_tickets_user_idx ON public.support_tickets (user_id, created_at DESC);