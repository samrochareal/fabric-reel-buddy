CREATE TABLE public.profiles (id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY, email TEXT, credits INTEGER NOT NULL DEFAULT 0, created_at TIMESTAMPTZ NOT NULL DEFAULT now());
GRANT SELECT ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);

CREATE TABLE public.credit_transactions (id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY, user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, amount INTEGER NOT NULL, reason TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now());
GRANT SELECT ON public.credit_transactions TO authenticated;
GRANT ALL ON public.credit_transactions TO service_role;
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own transactions" ON public.credit_transactions FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.ensure_profile(p_user_id UUID, p_email TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_credits INTEGER;
BEGIN
  INSERT INTO public.profiles (id, email, credits)
  VALUES (p_user_id, p_email, 7)
  ON CONFLICT (id) DO NOTHING;

  IF FOUND THEN
    INSERT INTO public.credit_transactions (user_id, amount, reason)
    VALUES (p_user_id, 7, 'Bônus de boas-vindas — Plano Grátis');
  END IF;

  SELECT credits INTO v_credits FROM public.profiles WHERE id = p_user_id;
  RETURN v_credits;
END;
$$;

CREATE OR REPLACE FUNCTION public.consume_credits(p_user_id UUID, p_amount INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_credits INTEGER;
BEGIN
  UPDATE public.profiles
  SET credits = credits - p_amount
  WHERE id = p_user_id AND credits >= p_amount;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Créditos insuficientes';
  END IF;

  INSERT INTO public.credit_transactions (user_id, amount, reason)
  VALUES (p_user_id, -p_amount, 'Processamento de vídeos');

  SELECT credits INTO v_credits FROM public.profiles WHERE id = p_user_id;
  RETURN v_credits;
END;
$$;