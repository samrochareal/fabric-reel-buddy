ALTER TABLE public.platform_settings
  ADD COLUMN IF NOT EXISTS referral_reward_mode text NOT NULL DEFAULT 'fixed',
  ADD COLUMN IF NOT EXISTS referral_reward_percent numeric NOT NULL DEFAULT 10;

DO $do$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'platform_settings_referral_reward_mode_check'
  ) THEN
    ALTER TABLE public.platform_settings
      ADD CONSTRAINT platform_settings_referral_reward_mode_check
      CHECK (referral_reward_mode IN ('fixed', 'percent'));
  END IF;
END $do$;

CREATE OR REPLACE FUNCTION public.admin_claim_referral(_user_id uuid, _code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
declare s public.platform_settings; ref public.profiles; me public.profiles; bonus integer;
begin
  if auth.role() <> 'service_role' then
    raise exception 'not authorized';
  end if;

  select * into s from public.platform_settings limit 1;
  if s is null or not s.referral_enabled then
    return jsonb_build_object('ok', false, 'reason', 'disabled');
  end if;

  select * into me from public.profiles where id = _user_id;
  if me is null or me.referred_by is not null then
    return jsonb_build_object('ok', false, 'reason', 'already');
  end if;

  select * into ref from public.profiles where referral_code = _code;
  if ref is null or ref.id = _user_id then
    return jsonb_build_object('ok', false, 'reason', 'invalid');
  end if;

  update public.profiles set referred_by = ref.id where id = _user_id;

  bonus := case when coalesce(s.referral_reward_mode, 'fixed') = 'percent'
                then 0 else coalesce(s.referral_reward_credits, 0) end;

  insert into public.referrals (referrer_id, referred_user_id, reward_credits)
  values (ref.id, _user_id, bonus)
  on conflict (referred_user_id) do nothing;

  if bonus > 0 then
    update public.profiles set credits = credits + bonus where id = ref.id;
    insert into public.credit_transactions (user_id, amount, reason)
    values (ref.id, bonus, 'referral_bonus');
  end if;

  return jsonb_build_object('ok', true, 'credits', bonus);
end;
$$;

REVOKE ALL ON FUNCTION public.admin_claim_referral(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_claim_referral(uuid, text) TO service_role;

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
  s public.platform_settings;
  _referrer uuid;
  _share integer := 0;
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

  SELECT * INTO s FROM public.platform_settings LIMIT 1;
  IF s IS NOT NULL AND s.referral_enabled
     AND COALESCE(s.referral_reward_mode, 'fixed') = 'percent' THEN
    SELECT referred_by INTO _referrer FROM public.profiles WHERE id = _user_id;
    IF _referrer IS NOT NULL THEN
      _share := floor(_credits * COALESCE(s.referral_reward_percent, 0) / 100.0)::int;
      IF _share > 0 THEN
        UPDATE public.profiles SET credits = credits + _share WHERE id = _referrer;
        INSERT INTO public.credit_transactions (user_id, amount, reason)
        VALUES (_referrer, _share, 'referral_share');
        UPDATE public.referrals
        SET reward_credits = reward_credits + _share
        WHERE referrer_id = _referrer AND referred_user_id = _user_id;
      END IF;
    END IF;
  END IF;

  RETURN jsonb_build_object('granted', true, 'credits', _credits, 'referral_share', _share);
END;
$$;

REVOKE ALL ON FUNCTION public.apply_plan_credits(uuid, integer, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_plan_credits(uuid, integer, text, text) TO service_role;