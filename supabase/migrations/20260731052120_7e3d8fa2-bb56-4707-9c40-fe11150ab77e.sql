CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  barcode text NOT NULL UNIQUE,
  name text NOT NULL,
  brand text,
  category text NOT NULL DEFAULT 'Other',
  size text,
  image_url text,
  shelf_life_days integer NOT NULL DEFAULT 7,
  storage text NOT NULL DEFAULT 'Pantry',
  source text NOT NULL DEFAULT 'FreshTrack',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX products_name_idx ON public.products (lower(name));
CREATE INDEX products_brand_idx ON public.products (lower(coalesce(brand, '')));

GRANT SELECT, INSERT, UPDATE ON public.products TO authenticated;
GRANT SELECT ON public.products TO anon;
GRANT ALL ON public.products TO service_role;

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "products readable by everyone" ON public.products
  FOR SELECT USING (true);

CREATE POLICY "signed in users can add products" ON public.products
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "signed in users can enrich products" ON public.products
  FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE TRIGGER products_set_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();