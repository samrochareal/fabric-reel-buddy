create or replace function public.claim_credit_refill(_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare p public.profiles; begin
  if auth.role() <> 'service_role' then
    raise exception 'not authorized';
  end if;

  select * into p from public.profiles where id = _user_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'no_profile');
  end if;

  if p.credits <= 0 and p.credit_refill_amount > 0
     and now() - p.last_refill_at >= make_interval(hours => p.credit_refill_hours) then
    update public.profiles set credits = p.credit_refill_amount, last_refill_at = now()
    where id = _user_id returning * into p;

    insert into public.credit_transactions (user_id, amount, reason)
    values (_user_id, p.credit_refill_amount, 'free_refill');

    return jsonb_build_object('ok', true, 'refilled', true, 'credits', p.credits,
      'next_refill_at', p.last_refill_at + make_interval(hours => p.credit_refill_hours));
  end if;

  return jsonb_build_object('ok', true, 'refilled', false, 'credits', p.credits,
    'next_refill_at', p.last_refill_at + make_interval(hours => p.credit_refill_hours));
end;
$function$;