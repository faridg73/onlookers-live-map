ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS following_count integer NOT NULL DEFAULT 0;

SELECT set_config('app.trusted_write', 'on', true);
UPDATE public.profiles p SET following_count = s.n
FROM (SELECT follower_id, count(*)::int n FROM public.user_follows GROUP BY follower_id) s
WHERE s.follower_id = p.id;

CREATE OR REPLACE FUNCTION public.sync_follower_count()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM set_config('app.trusted_write', 'on', true);
  IF TG_OP = 'INSERT' THEN
    UPDATE public.profiles SET follower_count = follower_count + 1 WHERE id = NEW.followee_id;
    UPDATE public.profiles SET following_count = following_count + 1 WHERE id = NEW.follower_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.profiles SET follower_count = GREATEST(0, follower_count - 1) WHERE id = OLD.followee_id;
    UPDATE public.profiles SET following_count = GREATEST(0, following_count - 1) WHERE id = OLD.follower_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END; $$;
REVOKE ALL ON FUNCTION public.sync_follower_count() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.protect_following_count()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF current_user IN ('authenticated', 'anon') THEN
    IF TG_OP = 'INSERT' THEN NEW.following_count := 0;
    ELSE NEW.following_count := OLD.following_count; END IF;
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS protect_following_count ON public.profiles;
CREATE TRIGGER protect_following_count BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.protect_following_count();

CREATE OR REPLACE FUNCTION public.public_reputation_cards(_ids uuid[])
RETURNS TABLE (
  id uuid, name text, handle text, avatar_url text, is_verified boolean,
  follower_count integer, following_count integer,
  rating numeric, review_count integer, bounties_completed integer,
  on_time_rate integer, id_confirmed boolean
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    p.id,
    CASE WHEN p.is_incognito THEN COALESCE(p.alias, 'Onlooker') ELSE COALESCE(NULLIF(p.display_name, ''), 'Onlooker') END,
    CASE WHEN p.is_incognito THEN NULL ELSE p.username END,
    CASE WHEN p.is_incognito THEN NULL ELSE p.avatar_url END,
    COALESCE(p.is_verified, false),
    COALESCE(p.follower_count, 0),
    COALESCE(p.following_count, 0),
    COALESCE((SELECT round(avg(r.score)::numeric, 1) FROM public.ratings r WHERE r.ratee_id = p.id), 0),
    (SELECT count(*)::int FROM public.ratings r WHERE r.ratee_id = p.id),
    (SELECT count(*)::int FROM public.claims c WHERE c.spotter_id = p.id AND c.status = 'approved'),
    COALESCE((SELECT CASE WHEN count(*) > 0 THEN round(100.0 * count(*) FILTER (WHERE c.status = 'approved') / count(*))::int ELSE 0 END
      FROM public.claims c WHERE c.spotter_id = p.id), 0),
    (p.phone_verified_at IS NOT NULL OR COALESCE(p.is_verified, false))
  FROM public.profiles p
  WHERE p.id = ANY(_ids) AND p.banned_at IS NULL;
$$;
REVOKE ALL ON FUNCTION public.public_reputation_cards(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_reputation_cards(uuid[]) TO anon, authenticated, service_role;