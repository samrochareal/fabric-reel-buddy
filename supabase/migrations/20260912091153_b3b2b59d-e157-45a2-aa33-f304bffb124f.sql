ALTER TABLE public.platform_settings
  ADD COLUMN IF NOT EXISTS account_defaults jsonb NOT NULL DEFAULT '{"credits":5,"creditRefillAmount":5,"creditRefillHours":12,"premium":false,"blocked":false,"accessDays":null,"allowedTools":{}}'::jsonb;

CREATE OR REPLACE FUNCTION public.apply_account_defaults_to_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  defaults jsonb;
  access_days integer;
BEGIN
  SELECT account_defaults INTO defaults
  FROM public.platform_settings
  WHERE id = true;

  IF defaults IS NULL THEN
    RETURN NEW;
  END IF;

  NEW.credits := GREATEST(0, COALESCE((defaults->>'credits')::integer, NEW.credits));
  NEW.credit_refill_amount := GREATEST(0, COALESCE((defaults->>'creditRefillAmount')::integer, NEW.credit_refill_amount));
  NEW.credit_refill_hours := GREATEST(1, COALESCE((defaults->>'creditRefillHours')::integer, NEW.credit_refill_hours));
  NEW.premium := COALESCE((defaults->>'premium')::boolean, NEW.premium);
  NEW.blocked := COALESCE((defaults->>'blocked')::boolean, NEW.blocked);
  NEW.allowed_tools := COALESCE(defaults->'allowedTools', NEW.allowed_tools, '{}'::jsonb);

  IF defaults ? 'accessDays' THEN
    access_days := NULLIF(defaults->>'accessDays', '')::integer;
    NEW.access_expires_at := CASE
      WHEN access_days IS NOT NULL AND access_days > 0 THEN now() + make_interval(days => access_days)
      ELSE NULL
    END;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS apply_account_defaults_before_insert ON public.profiles;
CREATE TRIGGER apply_account_defaults_before_insert
BEFORE INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.apply_account_defaults_to_profile();