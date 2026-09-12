CREATE TABLE public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_subscription_id text NOT NULL UNIQUE,
  stripe_customer_id text NOT NULL,
  product_id text,
  price_id text,
  status text NOT NULL DEFAULT 'active',
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  environment text NOT NULL DEFAULT 'sandbox',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own subscription"
  ON public.subscriptions FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX idx_subscriptions_user_id ON public.subscriptions(user_id);

CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.payment_credit_grants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_key text NOT NULL UNIQUE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  price_id text,
  credits integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.payment_credit_grants TO service_role;

ALTER TABLE public.payment_credit_grants ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.apply_plan_credits(
  _user_id uuid,
  _credits integer,
  _event_key text,
  _price_id text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _inserted boolean := false;
BEGIN
  IF _credits IS NULL OR _credits <= 0 THEN
    RETURN jsonb_build_object('granted', false, 'reason', 'no credits');
  END IF;

  INSERT INTO public.payment_credit_grants (event_key, user_id, price_id, credits)
  VALUES (_event_key, _user_id, _price_id, _credits)
  ON CONFLICT (event_key) DO NOTHING;

  _inserted := FOUND;

  IF NOT _inserted THEN
    RETURN jsonb_build_object('granted', false, 'reason', 'already granted');
  END IF;

  UPDATE public.profiles
  SET credits = credits + _credits
  WHERE id = _user_id;

  INSERT INTO public.credit_transactions (user_id, amount, reason)
  VALUES (_user_id, _credits, COALESCE('plano: ' || _price_id, 'plano'));

  RETURN jsonb_build_object('granted', true, 'credits', _credits);
END;
$$;

REVOKE ALL ON FUNCTION public.apply_plan_credits(uuid, integer, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_plan_credits(uuid, integer, text, text) TO service_role;