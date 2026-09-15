create or replace function public.mark_creator_verified(_user_id uuid, _phone text)
returns table (is_verified boolean, phone text, phone_verified_at timestamptz)
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if _user_id is null or coalesce(trim(_phone), '') = '' then
    raise exception 'A member and a confirmed phone number are required';
  end if;

  insert into public.phone_verifications (phone, verified_at)
  values (_phone, now())
  on conflict (phone) do update set verified_at = now();

  perform set_config('app.trusted_write', 'on', true);

  update public.profiles p
  set is_verified = true,
      phone = _phone,
      phone_verified_at = now(),
      verification_requested_at = null,
      updated_at = now()
  where p.id = _user_id;

  perform set_config('app.trusted_write', 'off', true);

  return query
  select p.is_verified, p.phone, p.phone_verified_at
  from public.profiles p
  where p.id = _user_id;
end;
$$;

revoke all on function public.mark_creator_verified(uuid, text) from public, anon, authenticated;
grant execute on function public.mark_creator_verified(uuid, text) to service_role;