ALTER TABLE public.platform_settings
ADD COLUMN landing_content jsonb NOT NULL DEFAULT '{}'::jsonb;