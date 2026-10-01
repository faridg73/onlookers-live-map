-- Reports can target a clip as well as a post.
ALTER TABLE public.content_reports ALTER COLUMN post_id DROP NOT NULL;
ALTER TABLE public.content_reports ADD COLUMN IF NOT EXISTS video_id uuid REFERENCES public.bounty_videos(id) ON DELETE CASCADE;
ALTER TABLE public.content_reports ADD CONSTRAINT content_reports_one_target CHECK ((post_id IS NULL) <> (video_id IS NULL));
CREATE UNIQUE INDEX IF NOT EXISTS content_reports_video_reporter ON public.content_reports (video_id, reporter_id) WHERE video_id IS NOT NULL;
DROP POLICY IF EXISTS "Reporters file reports" ON public.content_reports;
CREATE POLICY "Reporters file reports" ON public.content_reports FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = reporter_id AND status = 'open');

ALTER TABLE public.bounty_videos ADD COLUMN IF NOT EXISTS hidden_at timestamptz;

-- Public clip feeds: skip removed clips and clips from people the viewer blocked.
CREATE OR REPLACE FUNCTION public.global_feed_clips(_limit integer DEFAULT 40)
 RETURNS TABLE(id uuid, request_title text, request_place text, note text, bounty_amount numeric, storage_path text, thumb_path text, created_at timestamp with time zone, view_count integer, uploader_id uuid, uploader_name text, uploader_avatar text, hunter_level integer, tip_total numeric, latitude double precision, longitude double precision)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT v.id, v.request_title, v.request_place, v.note, v.bounty_amount,
    v.storage_path, v.thumb_path, v.created_at, v.view_count, v.uploader_id,
    CASE WHEN p.is_incognito THEN COALESCE(p.alias, 'Onlooker_' || public.build_alias(p.id))
         ELSE COALESCE(p.display_name, 'onlooker') END,
    CASE WHEN p.is_incognito THEN NULL ELSE p.avatar_url END,
    COALESCE(p.hunter_level, 1),
    COALESCE((SELECT SUM(t.amount) FROM public.video_tips t WHERE t.video_id = v.id), 0),
    round(r.latitude::numeric, 2)::double precision,
    round(r.longitude::numeric, 2)::double precision
  FROM public.bounty_videos v
  LEFT JOIN public.profiles p ON p.id = v.uploader_id
  LEFT JOIN public.requests r ON r.id::text = v.request_id
  WHERE v.is_public AND v.accepted_at IS NOT NULL AND v.hidden_at IS NULL
    AND NOT COALESCE(r.is_private, false)
    AND NOT EXISTS (SELECT 1 FROM public.user_blocks b WHERE b.blocker_id = auth.uid() AND b.blocked_id = v.uploader_id)
  ORDER BY v.view_count DESC, v.created_at DESC
  LIMIT LEAST(GREATEST(COALESCE(_limit, 40), 1), 100);
$function$;

CREATE OR REPLACE FUNCTION public.explore_clips(_limit integer DEFAULT 20, _offset integer DEFAULT 0)
 RETURNS TABLE(id uuid, request_title text, request_place text, note text, bounty_amount numeric, storage_path text, thumb_path text, duration_seconds integer, created_at timestamp with time zone, view_count integer, uploader_name text, uploader_avatar text, comment_count integer, review_count integer, average_rating numeric)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT v.id, v.request_title, v.request_place, v.note, v.bounty_amount,
    v.storage_path, v.thumb_path, v.duration_seconds, v.created_at, v.view_count,
    COALESCE(p.display_name, 'onlooker'), p.avatar_url,
    (SELECT COUNT(*)::integer FROM public.video_comments c WHERE c.video_id = v.id),
    (SELECT COUNT(*)::integer FROM public.video_reviews r WHERE r.video_id = v.id),
    COALESCE((SELECT ROUND(AVG(r.score)::numeric, 2) FROM public.video_reviews r WHERE r.video_id = v.id), 0)
  FROM public.bounty_videos v
  LEFT JOIN public.profiles p ON p.id = v.uploader_id
  WHERE v.is_public AND v.accepted_at IS NOT NULL AND v.hidden_at IS NULL
    AND NOT public.is_private_request(v.request_id)
    AND NOT EXISTS (SELECT 1 FROM public.user_blocks b WHERE b.blocker_id = auth.uid() AND b.blocked_id = v.uploader_id)
  ORDER BY v.created_at DESC
  LIMIT LEAST(GREATEST(COALESCE(_limit, 20), 1), 50)
  OFFSET GREATEST(COALESCE(_offset, 0), 0);
$function$;

-- Staff queue covers posts and clips.
DROP FUNCTION IF EXISTS public.admin_content_reports();
CREATE FUNCTION public.admin_content_reports()
RETURNS TABLE(id uuid, kind text, post_id uuid, video_id uuid, post_title text, post_body text, author_id uuid, author_name text, author_suspended boolean, reporter_name text, reason text, details text, status text, post_hidden boolean, report_count bigint, created_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT r.id,
         CASE WHEN r.video_id IS NOT NULL THEN 'clip' ELSE 'post' END,
         r.post_id, r.video_id,
         COALESCE(p.title, v.request_title, 'Clip'),
         COALESCE(p.body, v.note, ''),
         COALESCE(p.user_id, v.uploader_id),
         COALESCE(NULLIF(pa.display_name,''),'Onlooker'),
         pa.account_frozen_at IS NOT NULL,
         COALESCE(NULLIF(pr.display_name,''),'Onlooker'),
         r.reason, r.details, r.status,
         COALESCE(p.hidden_at, v.hidden_at) IS NOT NULL,
         (SELECT count(*) FROM public.content_reports x WHERE x.post_id IS NOT DISTINCT FROM r.post_id AND x.video_id IS NOT DISTINCT FROM r.video_id),
         r.created_at
  FROM public.content_reports r
  LEFT JOIN public.community_posts p ON p.id = r.post_id
  LEFT JOIN public.bounty_videos v ON v.id = r.video_id
  LEFT JOIN public.profiles pa ON pa.id = COALESCE(p.user_id, v.uploader_id)
  LEFT JOIN public.profiles pr ON pr.id = r.reporter_id
  WHERE public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator')
  ORDER BY (r.status = 'open') DESC, r.created_at DESC
  LIMIT 200;
$$;
REVOKE EXECUTE ON FUNCTION public.admin_content_reports() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_content_reports() TO authenticated;

CREATE OR REPLACE FUNCTION public.resolve_content_report(_report_id uuid, _action text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _post uuid; _video uuid; _author uuid;
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator')) THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;
  IF _action NOT IN ('dismiss','remove','restore','suspend','unsuspend') THEN RAISE EXCEPTION 'Unknown action'; END IF;
  SELECT r.post_id, r.video_id, COALESCE(p.user_id, v.uploader_id) INTO _post, _video, _author
  FROM public.content_reports r
  LEFT JOIN public.community_posts p ON p.id = r.post_id
  LEFT JOIN public.bounty_videos v ON v.id = r.video_id
  WHERE r.id = _report_id;
  IF _post IS NULL AND _video IS NULL THEN RAISE EXCEPTION 'Report not found'; END IF;

  IF _action IN ('suspend','unsuspend') THEN
    IF _author IS NULL THEN RAISE EXCEPTION 'No account to suspend'; END IF;
    UPDATE public.profiles SET account_frozen_at = CASE WHEN _action = 'suspend' THEN now() ELSE NULL END WHERE id = _author;
    UPDATE public.content_reports SET resolved_by = auth.uid(), resolved_at = now() WHERE id = _report_id;
    RETURN;
  END IF;

  PERFORM set_config('app.trusted_write', 'on', true);
  IF _post IS NOT NULL THEN
    UPDATE public.community_posts SET hidden_at = CASE WHEN _action = 'remove' THEN now() ELSE NULL END WHERE id = _post;
  ELSE
    UPDATE public.bounty_videos SET hidden_at = CASE WHEN _action = 'remove' THEN now() ELSE NULL END WHERE id = _video;
  END IF;
  UPDATE public.content_reports
    SET status = CASE _action WHEN 'remove' THEN 'removed' WHEN 'restore' THEN 'restored' ELSE 'dismissed' END,
        resolved_by = auth.uid(), resolved_at = now()
  WHERE post_id IS NOT DISTINCT FROM _post AND video_id IS NOT DISTINCT FROM _video
    AND status IN ('open','removed','restored');
END $$;
REVOKE EXECUTE ON FUNCTION public.resolve_content_report(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.resolve_content_report(uuid, text) TO authenticated;

-- "Kill fee" is now called "trip fee" in ledger descriptions.
DO $$
DECLARE f record; def text;
BEGIN
  FOR f IN SELECT p.oid FROM pg_proc p WHERE p.pronamespace = 'public'::regnamespace AND p.prosrc ILIKE '%Kill fee (dispute%' LOOP
    def := pg_get_functiondef(f.oid);
    def := replace(def, 'Kill fee (dispute settled partially)', 'Trip fee (dispute settled partially)');
    EXECUTE def;
  END LOOP;
END $$;
-- (ledger rows have no description column; nothing to rename there)