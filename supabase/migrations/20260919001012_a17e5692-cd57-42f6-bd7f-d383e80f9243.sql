CREATE OR REPLACE FUNCTION public.public_creator_cards(_ids uuid[])
RETURNS TABLE (
  id uuid,
  name text,
  avatar_url text,
  is_verified boolean,
  follower_count integer,
  hunter_level integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id,
    CASE WHEN p.is_incognito THEN COALESCE(p.alias, 'Onlooker') ELSE COALESCE(NULLIF(p.display_name, ''), 'Onlooker') END,
    CASE WHEN p.is_incognito THEN NULL ELSE p.avatar_url END,
    COALESCE(p.is_verified, false),
    COALESCE(p.follower_count, 0),
    COALESCE(p.hunter_level, 1)
  FROM public.profiles p
  WHERE p.id = ANY(_ids)
    AND p.banned_at IS NULL;
$$;

REVOKE ALL ON FUNCTION public.public_creator_cards(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_creator_cards(uuid[]) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.public_top_creators(_limit integer DEFAULT 12)
RETURNS TABLE (
  id uuid,
  name text,
  avatar_url text,
  is_verified boolean,
  follower_count integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id,
    CASE WHEN p.is_incognito THEN COALESCE(p.alias, 'Onlooker') ELSE COALESCE(NULLIF(p.display_name, ''), 'Onlooker') END,
    CASE WHEN p.is_incognito THEN NULL ELSE p.avatar_url END,
    COALESCE(p.is_verified, false),
    COALESCE(p.follower_count, 0)
  FROM public.profiles p
  WHERE p.banned_at IS NULL
  ORDER BY COALESCE(p.follower_count, 0) DESC, p.created_at ASC
  LIMIT GREATEST(1, LEAST(COALESCE(_limit, 12), 50));
$$;

REVOKE ALL ON FUNCTION public.public_top_creators(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_top_creators(integer) TO anon, authenticated, service_role;