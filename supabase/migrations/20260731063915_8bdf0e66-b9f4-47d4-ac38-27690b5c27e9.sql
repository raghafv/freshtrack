CREATE TABLE public.pending_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  barcode text NOT NULL,
  name text NOT NULL,
  quantity text,
  image_url text,
  submitted_by uuid,
  status text NOT NULL DEFAULT 'pending',
  reviewed_by uuid,
  reviewed_at timestamptz,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX pending_products_barcode_pending_idx
  ON public.pending_products (barcode)
  WHERE status = 'pending';

GRANT SELECT, INSERT ON public.pending_products TO authenticated;
GRANT ALL ON public.pending_products TO service_role;

ALTER TABLE public.pending_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users submit pending products"
  ON public.pending_products FOR INSERT TO authenticated
  WITH CHECK (submitted_by = auth.uid());

CREATE POLICY "users read own pending products"
  ON public.pending_products FOR SELECT TO authenticated
  USING (
    submitted_by = auth.uid()
    OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin')
  );

CREATE TRIGGER pending_products_updated_at
  BEFORE UPDATE ON public.pending_products
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();