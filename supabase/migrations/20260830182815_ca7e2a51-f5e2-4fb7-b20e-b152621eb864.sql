REVOKE EXECUTE ON FUNCTION public.ensure_profile(UUID, TEXT) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.consume_credits(UUID, INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ensure_profile(UUID, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.consume_credits(UUID, INTEGER) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.ensure_profile(p_user_id UUID, p_email TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_credits INTEGER;
BEGIN
  IF auth.uid() IS DISTINCT FROM p_user_id AND (current_setting('request.jwt.claims', true)::jsonb ->> 'role') IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'Não autorizado';
  END IF;

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
  IF auth.uid() IS DISTINCT FROM p_user_id AND (current_setting('request.jwt.claims', true)::jsonb ->> 'role') IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'Não autorizado';
  END IF;

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