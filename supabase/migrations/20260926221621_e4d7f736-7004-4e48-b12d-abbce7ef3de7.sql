create or replace function public.ensure_credit_wallet(_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = 'public'
as $$
declare
  _wallet_id uuid;
begin
  if _user_id is null or auth.uid() is null or _user_id <> auth.uid() then
    raise exception 'Not authorized';
  end if;

  insert into public.user_credit_wallets (user_id)
  values (_user_id)
  on conflict (user_id) do nothing;

  select id into _wallet_id from public.user_credit_wallets where user_id = _user_id;
  return _wallet_id;
end;
$$;

create or replace function public.ensure_coin_wallet(_user_id uuid default auth.uid())
returns uuid
language sql
security definer
set search_path = 'public'
as $$
  select public.ensure_credit_wallet(coalesce(_user_id, auth.uid()))
$$;