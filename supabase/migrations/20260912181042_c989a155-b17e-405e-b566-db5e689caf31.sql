REVOKE ALL ON FUNCTION public.award_xp(uuid, integer) FROM anon, authenticated, public;
REVOKE ALL ON FUNCTION public.tip_hunter(uuid, numeric) FROM anon, public;
REVOKE ALL ON FUNCTION public.submit_instant_snippet(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.tip_hunter(uuid, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_instant_snippet(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.public_profile_card(uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.global_feed_clips(integer) TO authenticated, anon;