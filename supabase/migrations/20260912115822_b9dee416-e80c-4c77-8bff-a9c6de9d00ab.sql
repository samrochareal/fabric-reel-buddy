CREATE TABLE public.landing_translations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lang TEXT NOT NULL,
  source TEXT NOT NULL,
  translated TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (lang, source)
);
GRANT SELECT ON public.landing_translations TO anon;
GRANT SELECT ON public.landing_translations TO authenticated;
GRANT ALL ON public.landing_translations TO service_role;
ALTER TABLE public.landing_translations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read landing translations" ON public.landing_translations FOR SELECT TO anon, authenticated USING (true);