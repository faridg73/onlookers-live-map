ALTER TABLE public.requests ADD COLUMN IF NOT EXISTS is_private boolean NOT NULL DEFAULT false;
ALTER TABLE public.requests ADD COLUMN IF NOT EXISTS is_verified_visit boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.force_verified_visit_private()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.is_verified_visit THEN NEW.is_private := true; END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_force_verified_visit_private ON public.requests;
CREATE TRIGGER trg_force_verified_visit_private BEFORE INSERT OR UPDATE ON public.requests
FOR EACH ROW EXECUTE FUNCTION public.force_verified_visit_private();

DROP POLICY IF EXISTS "Signed-in users can view active requests" ON public.requests;
CREATE POLICY "Signed-in users can view active requests" ON public.requests
FOR SELECT TO authenticated
USING (status = 'open'::request_status AND expires_at > now() AND NOT is_private);

CREATE OR REPLACE FUNCTION public.is_private_request(_request_id text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((SELECT r.is_private FROM public.requests r WHERE r.id::text = _request_id), false)
$$;

CREATE OR REPLACE FUNCTION public.force_private_replay()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.request_id IS NOT NULL AND public.is_private_request(NEW.request_id) THEN
    NEW.is_public := false;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_force_private_replay ON public.bounty_videos;
CREATE TRIGGER trg_force_private_replay BEFORE INSERT OR UPDATE ON public.bounty_videos
FOR EACH ROW EXECUTE FUNCTION public.force_private_replay();

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
  WHERE v.is_public AND v.accepted_at IS NOT NULL
    AND NOT public.is_private_request(v.request_id)
  ORDER BY v.created_at DESC
  LIMIT LEAST(GREATEST(COALESCE(_limit, 20), 1), 50)
  OFFSET GREATEST(COALESCE(_offset, 0), 0);
$function$;

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
  WHERE v.is_public AND v.accepted_at IS NOT NULL AND NOT COALESCE(r.is_private, false)
  ORDER BY v.view_count DESC, v.created_at DESC
  LIMIT LEAST(GREATEST(COALESCE(_limit, 40), 1), 100);
$function$;