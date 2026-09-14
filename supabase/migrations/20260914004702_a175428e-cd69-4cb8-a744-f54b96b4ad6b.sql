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
       or new.is_incognito is distinct from old.is_incognito
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

drop trigger if exists guard_profile_updates_trigger on public.profiles;
create trigger guard_profile_updates_trigger
before update on public.profiles
for each row execute function public.guard_profile_updates();

create or replace function public.guard_bounty_pool_updates()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if auth.uid() = old.creator_id
     and not public.has_role(auth.uid(), 'admin'::public.app_role)
     and not public.has_role(auth.uid(), 'moderator'::public.app_role)
  then
    if new.goal_credits is distinct from old.goal_credits
       or new.creator_id is distinct from old.creator_id
       or new.kind is distinct from old.kind
       or new.created_at is distinct from old.created_at
       or (
         new.pooled_credits is distinct from old.pooled_credits
         and coalesce(current_setting('app.pool_ledger', true), 'off') <> 'on'
       )
    then
      raise exception 'Protected bounty pool fields cannot be changed directly';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists guard_bounty_pool_updates_trigger on public.bounty_pools;
create trigger guard_bounty_pool_updates_trigger
before update on public.bounty_pools
for each row execute function public.guard_bounty_pool_updates();