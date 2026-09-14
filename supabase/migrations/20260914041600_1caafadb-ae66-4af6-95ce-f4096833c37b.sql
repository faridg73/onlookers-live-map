-- 1) Rate limiting store (backend only)
CREATE TABLE public.rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket text NOT NULL,
  identifier text NOT NULL,
  window_start timestamptz NOT NULL DEFAULT now(),
  hits integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (bucket, identifier, window_start)
);

GRANT ALL ON public.rate_limits TO service_role;
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Backend only" ON public.rate_limits FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.consume_rate_limit(
  _bucket text, _identifier text, _limit integer, _window_seconds integer
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _start timestamptz := to_timestamp(floor(extract(epoch from now()) / GREATEST(_window_seconds, 1)) * GREATEST(_window_seconds, 1));
  _hits integer;
BEGIN
  INSERT INTO public.rate_limits (bucket, identifier, window_start, hits)
  VALUES (_bucket, _identifier, _start, 1)
  ON CONFLICT (bucket, identifier, window_start)
  DO UPDATE SET hits = rate_limits.hits + 1, updated_at = now()
  RETURNING hits INTO _hits;

  DELETE FROM public.rate_limits WHERE window_start < now() - interval '1 day';

  RETURN _hits <= GREATEST(_limit, 1);
END;
$$;

REVOKE ALL ON FUNCTION public.consume_rate_limit(text, text, integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.consume_rate_limit(text, text, integer, integer) TO service_role;

-- 2) Access codes only while the claim is live
DROP POLICY IF EXISTS "Claiming spotter can read the access code" ON public.request_access_codes;
CREATE POLICY "Claiming spotter can read the access code"
ON public.request_access_codes FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.claims c
  JOIN public.requests r ON r.id = c.request_id
  WHERE c.request_id = request_access_codes.request_id
    AND c.spotter_id = auth.uid()
    AND c.status IN ('in_progress', 'submitted')
    AND r.status IN ('open', 'claimed')
    AND r.expires_at > now()
));

-- 3) Guests get a coarse public feed instead of exact live locations
DROP POLICY IF EXISTS "Live community posts are public" ON public.community_posts;
CREATE POLICY "Signed-in members read live posts"
ON public.community_posts FOR SELECT TO authenticated
USING (expires_at IS NULL OR expires_at > now());

REVOKE SELECT ON public.community_posts FROM anon;

CREATE OR REPLACE FUNCTION public.public_community_feed(_category text DEFAULT NULL, _limit integer DEFAULT 120)
RETURNS TABLE (
  id uuid, category text, tags text[], title text, body text, place text,
  latitude double precision, longitude double precision, media_path text, aspect text,
  is_flash boolean, expires_at timestamptz, pinned_until timestamptz, pinned_credits integer,
  created_at timestamptz, author_name text, hunter_level integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.category, p.tags, p.title, p.body, p.place,
         round(p.latitude::numeric, 2)::double precision,
         round(p.longitude::numeric, 2)::double precision,
         p.media_path, p.aspect, p.is_flash, p.expires_at, p.pinned_until,
         p.pinned_credits, p.created_at,
         COALESCE(NULLIF(CASE WHEN pr.is_incognito THEN pr.alias ELSE pr.display_name END, ''), 'Onlooker'),
         COALESCE(pr.hunter_level, 1)
  FROM public.community_posts p
  LEFT JOIN public.profiles pr ON pr.id = p.user_id
  WHERE (p.expires_at IS NULL OR p.expires_at > now())
    AND (_category IS NULL OR p.category = _category)
  ORDER BY (p.pinned_until IS NOT NULL AND p.pinned_until > now()) DESC, p.created_at DESC
  LIMIT LEAST(COALESCE(_limit, 120), 200);
$$;

REVOKE ALL ON FUNCTION public.public_community_feed(text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_community_feed(text, integer) TO anon, authenticated;