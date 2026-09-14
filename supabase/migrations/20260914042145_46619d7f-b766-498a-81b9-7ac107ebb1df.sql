DROP TRIGGER IF EXISTS guard_profile_updates_trigger ON public.profiles;
CREATE TRIGGER guard_profile_updates_trigger
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.guard_profile_updates();

DROP TRIGGER IF EXISTS guard_bounty_video_update_trigger ON public.bounty_videos;
CREATE TRIGGER guard_bounty_video_update_trigger
BEFORE UPDATE ON public.bounty_videos
FOR EACH ROW EXECUTE FUNCTION public.guard_bounty_video_update();

DROP TRIGGER IF EXISTS guard_bounty_pool_updates_trigger ON public.bounty_pools;
CREATE TRIGGER guard_bounty_pool_updates_trigger
BEFORE UPDATE ON public.bounty_pools
FOR EACH ROW EXECUTE FUNCTION public.guard_bounty_pool_updates();