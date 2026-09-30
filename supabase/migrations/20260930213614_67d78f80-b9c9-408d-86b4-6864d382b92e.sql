create or replace function public.auth_providers_for_email(_email text)
returns text[]
language sql
stable
security definer
set search_path = public, auth
as $$
  select coalesce(array_agg(distinct i.provider), '{}')
  from auth.users u
  join auth.identities i on i.user_id = u.id
  where lower(u.email) = lower(trim(_email));
$$;
revoke all on function public.auth_providers_for_email(text) from public, anon, authenticated;
grant execute on function public.auth_providers_for_email(text) to service_role;