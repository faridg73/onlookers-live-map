DROP FUNCTION IF EXISTS public.public_community_feed(text, integer);
CREATE OR REPLACE FUNCTION public.public_community_feed(_category text DEFAULT NULL::text, _limit integer DEFAULT 120)
 RETURNS TABLE(id uuid, category text, tags text[], title text, body text, place text, latitude double precision, longitude double precision, media_path text, aspect text, is_flash boolean, expires_at timestamp with time zone, pinned_until timestamp with time zone, pinned_credits integer, created_at timestamp with time zone, author_name text, hunter_level integer, author_verified boolean)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT p.id, p.category, p.tags, p.title, p.body, p.place,
         round(p.latitude::numeric, 2)::double precision,
         round(p.longitude::numeric, 2)::double precision,
         p.media_path, p.aspect, p.is_flash, p.expires_at, p.pinned_until,
         p.pinned_credits, p.created_at,
         COALESCE(NULLIF(CASE WHEN pr.is_incognito THEN pr.alias ELSE pr.display_name END, ''), 'Onlooker'),
         COALESCE(pr.hunter_level, 1),
         COALESCE(pr.is_verified, false)
  FROM public.community_posts p
  LEFT JOIN public.profiles pr ON pr.id = p.user_id
  WHERE (p.expires_at IS NULL OR p.expires_at > now())
    AND (_category IS NULL OR p.category = _category)
  ORDER BY (p.pinned_until IS NOT NULL AND p.pinned_until > now()) DESC, p.created_at DESC
  LIMIT LEAST(COALESCE(_limit, 120), 200);
$function$;

REVOKE ALL ON FUNCTION public.public_community_feed(text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_community_feed(text, integer) TO anon, authenticated;