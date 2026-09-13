REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM anon;

GRANT EXECUTE ON FUNCTION public.explore_clips(integer, integer) TO anon;
GRANT EXECUTE ON FUNCTION public.global_feed_clips(integer) TO anon;
GRANT EXECUTE ON FUNCTION public.hunter_trust(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.increment_clip_views(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.onlookers_within_radius(double precision, double precision, numeric, uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.public_profile_card(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.public_request_markers() TO anon;
GRANT EXECUTE ON FUNCTION public.top_reporters(integer) TO anon;
GRANT EXECUTE ON FUNCTION public.top_reporters_weekly(integer) TO anon;