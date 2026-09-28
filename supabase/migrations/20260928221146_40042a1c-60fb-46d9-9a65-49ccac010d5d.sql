CREATE OR REPLACE FUNCTION public.guard_profile_sensitive_fields()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
begin
  -- Trusted database routines (wallet, verification) and admins/backend jobs may change anything.
  if coalesce(current_setting('app.trusted_write', true), '') = 'on'
     or auth.uid() is null or public.has_role(auth.uid(), 'admin') then
    return new;
  end if;
  new.wallet_balance := old.wallet_balance;
  new.xp := old.xp;
  new.hunter_level := old.hunter_level;
  new.is_verified := old.is_verified;
  new.warning_count := old.warning_count;
  new.banned_at := old.banned_at;
  new.phone_verified_at := old.phone_verified_at;
  return new;
end $$;