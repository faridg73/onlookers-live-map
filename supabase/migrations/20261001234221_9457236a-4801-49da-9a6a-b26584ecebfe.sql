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
    UPDATE public.profiles
       SET banned_at = CASE WHEN _action = 'suspend' THEN now() ELSE NULL END,
           account_frozen_at = CASE WHEN _action = 'suspend' THEN now() ELSE NULL END,
           updated_at = now()
     WHERE id = _author;
    IF _action = 'suspend' THEN
      INSERT INTO public.notifications (user_id, kind, request_key, preview)
      VALUES (_author, 'account_banned', 'moderation', 'Your Onlooker account has been suspended after a content report.');
    END IF;
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

CREATE OR REPLACE FUNCTION public.admin_content_reports()
RETURNS TABLE(id uuid, kind text, post_id uuid, video_id uuid, post_title text, post_body text, author_id uuid, author_name text, author_suspended boolean, reporter_name text, reason text, details text, status text, post_hidden boolean, report_count bigint, created_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT r.id,
         CASE WHEN r.video_id IS NOT NULL THEN 'clip' ELSE 'post' END,
         r.post_id, r.video_id,
         COALESCE(p.title, v.request_title, 'Clip'),
         COALESCE(p.body, v.note, ''),
         COALESCE(p.user_id, v.uploader_id),
         COALESCE(NULLIF(pa.display_name,''),'Onlooker'),
         pa.banned_at IS NOT NULL,
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