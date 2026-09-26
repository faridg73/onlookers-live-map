ALTER TABLE public.community_posts ADD COLUMN IF NOT EXISTS hidden_at timestamptz;

CREATE TABLE public.user_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id uuid NOT NULL,
  blocked_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (blocker_id, blocked_id),
  CHECK (blocker_id <> blocked_id)
);
GRANT SELECT, INSERT, DELETE ON public.user_blocks TO authenticated;
GRANT ALL ON public.user_blocks TO service_role;
ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own blocks" ON public.user_blocks FOR SELECT TO authenticated USING (auth.uid() = blocker_id);
CREATE POLICY "Users add own blocks" ON public.user_blocks FOR INSERT TO authenticated WITH CHECK (auth.uid() = blocker_id);
CREATE POLICY "Users remove own blocks" ON public.user_blocks FOR DELETE TO authenticated USING (auth.uid() = blocker_id);

CREATE TABLE public.content_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  reporter_id uuid NOT NULL,
  reason text NOT NULL,
  details text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'open',
  resolved_by uuid,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (post_id, reporter_id)
);
GRANT SELECT, INSERT ON public.content_reports TO authenticated;
GRANT ALL ON public.content_reports TO service_role;
ALTER TABLE public.content_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Reporters file reports" ON public.content_reports FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = reporter_id AND status = 'open');
CREATE POLICY "Reporters and staff read reports" ON public.content_reports FOR SELECT TO authenticated
  USING (auth.uid() = reporter_id OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

-- Auto-hide a post once 3 different people report it, pending review.
CREATE OR REPLACE FUNCTION public.auto_hide_reported_post() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF (SELECT count(*) FROM public.content_reports WHERE post_id = NEW.post_id AND status = 'open') >= 3 THEN
    UPDATE public.community_posts SET hidden_at = now() WHERE id = NEW.post_id AND hidden_at IS NULL;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER content_reports_auto_hide AFTER INSERT ON public.content_reports
  FOR EACH ROW EXECUTE FUNCTION public.auto_hide_reported_post();

-- Automated objectionable-content filter before a post goes live.
CREATE OR REPLACE FUNCTION public.enforce_community_post_moderation() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  banned text[] := ARRAY[
    'nigger','nigga','faggot','fag','retard','kike','spic','chink','tranny','wetback',
    'porn','nude','nudes','naked','onlyfans','sex tape','blowjob','cum','pussy','dick pic',
    'kill yourself','kys','i will kill','shoot up','bomb threat','rape',
    'buy drugs','sell drugs','cocaine for sale','meth for sale',
    'ticketmaster','stubhub','seatgeek','screen record','ticket barcode'
  ];
  haystack text := ' ' || regexp_replace(lower(coalesce(NEW.title,'') || ' ' || coalesce(NEW.body,'') || ' ' || coalesce(NEW.place,'') || ' ' || array_to_string(coalesce(NEW.tags,'{}'::text[]),' ')), '[^a-z0-9]+', ' ', 'g') || ' ';
  hits text[] := ARRAY(SELECT k FROM unnest(banned) k WHERE position(' ' || k || ' ' IN haystack) > 0);
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.title IS NOT DISTINCT FROM OLD.title AND NEW.body IS NOT DISTINCT FROM OLD.body
     AND NEW.place IS NOT DISTINCT FROM OLD.place AND NEW.tags IS NOT DISTINCT FROM OLD.tags THEN
    RETURN NEW;
  END IF;
  IF array_length(hits, 1) > 0 THEN
    INSERT INTO public.moderation_flags (user_id, title, details, matched_terms, source)
    VALUES (NEW.user_id, left(coalesce(NEW.title,''), 200), left(coalesce(NEW.body,''), 1000), hits, 'community_post');
    RAISE EXCEPTION USING ERRCODE = 'P0001',
      MESSAGE = 'post_moderation_blocked: This post contains language that breaks our community guidelines. Please edit it and try again.';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER community_posts_moderation BEFORE INSERT OR UPDATE ON public.community_posts
  FOR EACH ROW EXECUTE FUNCTION public.enforce_community_post_moderation();

-- Reads: hide expired, removed, and blocked-author posts.
DROP POLICY IF EXISTS "Signed-in members read live posts" ON public.community_posts;
CREATE POLICY "Signed-in members read live posts" ON public.community_posts FOR SELECT TO authenticated
  USING ((expires_at IS NULL OR expires_at > now()) AND hidden_at IS NULL
    AND NOT EXISTS (SELECT 1 FROM public.user_blocks b WHERE b.blocker_id = auth.uid() AND b.blocked_id = community_posts.user_id));

CREATE OR REPLACE FUNCTION public.public_community_feed(_category text DEFAULT NULL::text, _limit integer DEFAULT 120)
 RETURNS TABLE(id uuid, category text, tags text[], title text, body text, place text, latitude double precision, longitude double precision, media_path text, aspect text, is_flash boolean, expires_at timestamp with time zone, pinned_until timestamp with time zone, pinned_credits integer, created_at timestamp with time zone, author_name text, hunter_level integer, author_verified boolean, report_incident_type text, report_radius_m integer, media_analysis_status text, reporter_trust_level integer, validation_count integer, flag_count integer, trust_score integer, report_status text, event_starts_at timestamp with time zone)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT p.id, p.category, p.tags, p.title, p.body, p.place,
         round(p.latitude::numeric, 2)::double precision,
         round(p.longitude::numeric, 2)::double precision,
         p.media_path, p.aspect, p.is_flash, p.expires_at, p.pinned_until,
         p.pinned_credits, p.created_at,
         COALESCE(NULLIF(CASE WHEN pr.is_incognito THEN pr.alias ELSE pr.display_name END, ''), 'Onlooker'),
         COALESCE(pr.hunter_level, 1), COALESCE(pr.is_verified, false),
         p.report_incident_type, p.report_radius_m, p.media_analysis_status,
         p.reporter_trust_level, p.validation_count, p.flag_count, p.trust_score,
         CASE WHEN p.report_incident_type IS NOT NULL AND p.expires_at IS NOT NULL AND p.expires_at <= now()
              THEN 'expired' ELSE p.report_status END,
         p.event_starts_at
  FROM public.community_posts p
  LEFT JOIN public.profiles pr ON pr.id = p.user_id
  WHERE (p.expires_at IS NULL OR p.expires_at > now())
    AND p.hidden_at IS NULL
    AND (_category IS NULL OR p.category = _category)
  ORDER BY (p.pinned_until IS NOT NULL AND p.pinned_until > now()) DESC, p.created_at DESC
  LIMIT LEAST(COALESCE(_limit, 120), 200);
$function$;

-- Staff review queue and actions.
CREATE OR REPLACE FUNCTION public.admin_content_reports()
RETURNS TABLE(id uuid, post_id uuid, post_title text, post_body text, author_id uuid, author_name text, reporter_name text, reason text, details text, status text, post_hidden boolean, report_count bigint, created_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT r.id, r.post_id, p.title, p.body, p.user_id,
         COALESCE(NULLIF(pa.display_name,''),'Onlooker'), COALESCE(NULLIF(pr.display_name,''),'Onlooker'),
         r.reason, r.details, r.status, p.hidden_at IS NOT NULL,
         (SELECT count(*) FROM public.content_reports x WHERE x.post_id = r.post_id), r.created_at
  FROM public.content_reports r
  JOIN public.community_posts p ON p.id = r.post_id
  LEFT JOIN public.profiles pa ON pa.id = p.user_id
  LEFT JOIN public.profiles pr ON pr.id = r.reporter_id
  WHERE public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator')
  ORDER BY (r.status = 'open') DESC, r.created_at DESC
  LIMIT 200;
$$;

CREATE OR REPLACE FUNCTION public.resolve_content_report(_report_id uuid, _action text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _post uuid;
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator')) THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;
  IF _action NOT IN ('dismiss','remove','restore') THEN RAISE EXCEPTION 'Unknown action'; END IF;
  SELECT post_id INTO _post FROM public.content_reports WHERE id = _report_id;
  IF _post IS NULL THEN RAISE EXCEPTION 'Report not found'; END IF;
  IF _action = 'remove' THEN
    UPDATE public.community_posts SET hidden_at = now() WHERE id = _post;
  ELSE
    UPDATE public.community_posts SET hidden_at = NULL WHERE id = _post;
  END IF;
  UPDATE public.content_reports SET status = CASE WHEN _action = 'remove' THEN 'removed' ELSE 'dismissed' END,
    resolved_by = auth.uid(), resolved_at = now()
  WHERE post_id = _post AND status = 'open';
END $$;
GRANT EXECUTE ON FUNCTION public.admin_content_reports() TO authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_content_report(uuid, text) TO authenticated;