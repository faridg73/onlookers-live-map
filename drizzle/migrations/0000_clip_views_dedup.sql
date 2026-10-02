CREATE TABLE IF NOT EXISTS public.clip_views (
  video_id uuid NOT NULL REFERENCES public.bounty_videos(id) ON DELETE CASCADE,
  viewer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  viewed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (video_id, viewer_id)
);
GRANT ALL ON public.clip_views TO service_role;
ALTER TABLE public.clip_views ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.increment_clip_views(_video_id uuid)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE _uid uuid := auth.uid(); _owner uuid; _count integer; _new integer;
BEGIN
  SELECT uploader_id, view_count INTO _owner, _count FROM public.bounty_videos
  WHERE id = _video_id AND is_public AND accepted_at IS NOT NULL;
  IF NOT FOUND THEN RETURN 0; END IF;
  IF _uid IS NULL OR _uid = _owner THEN RETURN COALESCE(_count, 0); END IF;
  INSERT INTO public.clip_views (video_id, viewer_id) VALUES (_video_id, _uid)
  ON CONFLICT DO NOTHING;
  GET DIAGNOSTICS _new = ROW_COUNT;
  IF _new = 0 THEN RETURN COALESCE(_count, 0); END IF;
  UPDATE public.bounty_videos SET view_count = view_count + 1
  WHERE id = _video_id RETURNING view_count INTO _count;
  RETURN COALESCE(_count, 0);
END $$;
REVOKE EXECUTE ON FUNCTION public.increment_clip_views(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_clip_views(uuid) TO anon, authenticated;