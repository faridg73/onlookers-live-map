revoke update on public.profiles from authenticated;
grant update (display_name, full_name, avatar_url, alias, terms_accepted_at, onboarded, onboarding_completed, updated_at) on public.profiles to authenticated;

revoke update on public.bounty_pools from authenticated;
grant update (title, place, latitude, longitude, status, expires_at, updated_at) on public.bounty_pools to authenticated;