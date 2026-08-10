-- 1. Products: only admins may update the shared catalog
DROP POLICY IF EXISTS "creators or admins can update products" ON public.products;
DROP POLICY IF EXISTS "signed in users can enrich products" ON public.products;
CREATE POLICY "admins can update products"
ON public.products FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 2. One persistent recommended recipe per user per day (Asia/Kolkata date)
CREATE TABLE IF NOT EXISTS public.daily_recipes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  recipe_date date NOT NULL,
  recipe jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, recipe_date)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.daily_recipes TO authenticated;
GRANT ALL ON public.daily_recipes TO service_role;
ALTER TABLE public.daily_recipes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own daily recipes" ON public.daily_recipes FOR ALL TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER daily_recipes_updated BEFORE UPDATE ON public.daily_recipes
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3. Independent notification toggles + assistant abuse guard
ALTER TABLE public.user_settings
  ADD COLUMN IF NOT EXISTS notify_expired boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_low_stock boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_recipe boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS assistant_offtopic_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS assistant_blocked_until timestamptz;

-- 4. Owner also holds the admin role
INSERT INTO public.user_roles (user_id, role)
SELECT p.id, 'admin'::app_role FROM public.profiles p
WHERE lower(p.email) = 'raghav.goyal909@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;