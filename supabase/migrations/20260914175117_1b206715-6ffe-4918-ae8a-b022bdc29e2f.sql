REVOKE ALL ON FUNCTION public.public_profile_card(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_profile_card(uuid) TO anon, authenticated;