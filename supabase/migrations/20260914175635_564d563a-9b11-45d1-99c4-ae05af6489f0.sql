alter table public.profiles
  add column if not exists phone text,
  add column if not exists phone_verified_at timestamptz;

create table if not exists public.phone_verifications (
  id uuid primary key default gen_random_uuid(),
  phone text not null unique,
  email text,
  verified_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

grant all on public.phone_verifications to service_role;
alter table public.phone_verifications enable row level security;

create or replace function public.guard_profile_updates()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
BEGIN
  IF COALESCE(current_setting('app.trusted_write', true), '') = 'on' THEN
    RETURN NEW;
  END IF;

  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthenticated profile updates are not allowed';
  END IF;

  IF public.has_role(auth.uid(), 'admin'::public.app_role)
     OR public.has_role(auth.uid(), 'moderator'::public.app_role) THEN
    RETURN NEW;
  END IF;

  IF auth.uid() = OLD.id THEN
    IF NEW.wallet_balance IS DISTINCT FROM OLD.wallet_balance
       OR NEW.legacy_usd_balance IS DISTINCT FROM OLD.legacy_usd_balance
       OR NEW.rating IS DISTINCT FROM OLD.rating
       OR NEW.xp IS DISTINCT FROM OLD.xp
       OR NEW.hunter_level IS DISTINCT FROM OLD.hunter_level
       OR NEW.warning_count IS DISTINCT FROM OLD.warning_count
       OR NEW.banned_at IS DISTINCT FROM OLD.banned_at
       OR NEW.is_verified IS DISTINCT FROM OLD.is_verified
       OR NEW.phone_verified_at IS DISTINCT FROM OLD.phone_verified_at
       OR NEW.id IS DISTINCT FROM OLD.id
       OR NEW.created_at IS DISTINCT FROM OLD.created_at
    THEN
      RAISE EXCEPTION 'Protected profile fields cannot be changed directly';
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

-- Copies a confirmed phone number onto the signed-in member's profile.
create or replace function public.claim_verified_phone()
 returns table (phone text, verified_at timestamptz)
 language plpgsql
 security definer
 set search_path to 'public'
as $$
declare
  v_email text := auth.email();
  v_row public.phone_verifications;
begin
  if auth.uid() is null then
    raise exception 'Sign in first';
  end if;
  if v_email is null then
    return;
  end if;

  select * into v_row
  from public.phone_verifications pv
  where lower(pv.email) = lower(v_email)
  order by pv.verified_at desc
  limit 1;

  if v_row.id is null then
    return;
  end if;

  perform set_config('app.trusted_write', 'on', true);
  update public.profiles p
     set phone = v_row.phone,
         phone_verified_at = coalesce(p.phone_verified_at, v_row.verified_at)
   where p.id = auth.uid();

  return query select v_row.phone, v_row.verified_at;
end;
$$;

revoke all on function public.claim_verified_phone() from public;
grant execute on function public.claim_verified_phone() to authenticated;