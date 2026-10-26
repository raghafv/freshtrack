ALTER TABLE public.user_settings
  ADD COLUMN IF NOT EXISTS notify_expiry boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_added boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_merged boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_shopping boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_system boolean NOT NULL DEFAULT true;

ALTER TABLE public.pending_products
  ADD COLUMN IF NOT EXISTS back_image_url text,
  ADD COLUMN IF NOT EXISTS standard_image_url text;

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS back_image_url text,
  ADD COLUMN IF NOT EXISTS standard_image_url text;