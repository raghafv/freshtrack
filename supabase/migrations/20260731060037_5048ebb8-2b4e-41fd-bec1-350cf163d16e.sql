CREATE TABLE public.saved_recipes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  title text NOT NULL,
  emoji text,
  minutes integer,
  uses text[] NOT NULL DEFAULT '{}',
  missing text[] NOT NULL DEFAULT '{}',
  steps text[] NOT NULL DEFAULT '{}',
  mode text NOT NULL DEFAULT 'surprise',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.saved_recipes TO authenticated;
GRANT ALL ON public.saved_recipes TO service_role;

ALTER TABLE public.saved_recipes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own saved recipes" ON public.saved_recipes
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER saved_recipes_set_updated_at
  BEFORE UPDATE ON public.saved_recipes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX saved_recipes_user_created_idx ON public.saved_recipes (user_id, created_at DESC);