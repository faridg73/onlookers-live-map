create or replace function public.guard_profile_updates()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if auth.uid() = old.id
     and not public.has_role(auth.uid(), 'admin'::public.app_role)
     and not public.has_role(auth.uid(), 'moderator'::public.app_role)
  then
    if new.wallet_balance is distinct from old.wallet_balance
       or new.legacy_usd_balance is distinct from old.legacy_usd_balance
       or new.rating is distinct from old.rating
       or new.xp is distinct from old.xp
       or new.hunter_level is distinct from old.hunter_level
       or new.warning_count is distinct from old.warning_count
       or new.banned_at is distinct from old.banned_at
       or new.id is distinct from old.id
       or new.created_at is distinct from old.created_at
    then
      raise exception 'Protected profile fields cannot be changed directly';
    end if;
  end if;
  return new;
end;
$$;