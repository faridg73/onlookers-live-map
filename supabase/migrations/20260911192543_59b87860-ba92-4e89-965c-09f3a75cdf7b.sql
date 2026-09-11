
ALTER TABLE public.bounty_videos
  ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS view_count integer NOT NULL DEFAULT 0;

-- Comments -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.video_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id uuid NOT NULL REFERENCES public.bounty_videos(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body text NOT NULL CHECK (char_length(btrim(body)) BETWEEN 1 AND 600),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.video_comments TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.video_comments TO authenticated;
GRANT ALL ON public.video_comments TO service_role;
ALTER TABLE public.video_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Comments on public clips are readable"
ON public.video_comments FOR SELECT TO anon, authenticated
USING (EXISTS (SELECT 1 FROM public.bounty_videos v WHERE v.id = video_id AND v.is_public));

CREATE POLICY "Signed-in users can comment"
ON public.video_comments FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Authors can edit their comment"
ON public.video_comments FOR UPDATE TO authenticated
USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "Authors can delete their comment"
ON public.video_comments FOR DELETE TO authenticated
USING (user_id = auth.uid());

CREATE TRIGGER update_video_comments_updated_at
BEFORE UPDATE ON public.video_comments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS video_comments_video_idx ON public.video_comments(video_id, created_at DESC);

-- Reviews --------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.video_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id uuid NOT NULL REFERENCES public.bounty_videos(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  score integer NOT NULL CHECK (score BETWEEN 1 AND 5),
  note text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (video_id, user_id)
);
GRANT SELECT ON public.video_reviews TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.video_reviews TO authenticated;
GRANT ALL ON public.video_reviews TO service_role;
ALTER TABLE public.video_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Reviews on public clips are readable"
ON public.video_reviews FOR SELECT TO anon, authenticated
USING (EXISTS (SELECT 1 FROM public.bounty_videos v WHERE v.id = video_id AND v.is_public));

CREATE POLICY "Signed-in users can review"
ON public.video_reviews FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Reviewers can update their review"
ON public.video_reviews FOR UPDATE TO authenticated
USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "Reviewers can delete their review"
ON public.video_reviews FOR DELETE TO authenticated
USING (user_id = auth.uid());

CREATE TRIGGER update_video_reviews_updated_at
BEFORE UPDATE ON public.video_reviews
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Public explore listing ------------------------------------------------
CREATE OR REPLACE FUNCTION public.explore_clips(_limit integer DEFAULT 20, _offset integer DEFAULT 0)
RETURNS TABLE(
  id uuid,
  request_title text,
  request_place text,
  note text,
  bounty_amount numeric,
  storage_path text,
  thumb_path text,
  duration_seconds integer,
  created_at timestamptz,
  view_count integer,
  uploader_name text,
  uploader_avatar text,
  comment_count integer,
  review_count integer,
  average_rating numeric
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    v.id, v.request_title, v.request_place, v.note, v.bounty_amount,
    v.storage_path, v.thumb_path, v.duration_seconds, v.created_at, v.view_count,
    COALESCE(p.display_name, 'onlooker'), p.avatar_url,
    (SELECT COUNT(*)::integer FROM public.video_comments c WHERE c.video_id = v.id),
    (SELECT COUNT(*)::integer FROM public.video_reviews r WHERE r.video_id = v.id),
    COALESCE((SELECT ROUND(AVG(r.score)::numeric, 2) FROM public.video_reviews r WHERE r.video_id = v.id), 0)
  FROM public.bounty_videos v
  LEFT JOIN public.profiles p ON p.id = v.uploader_id
  WHERE v.is_public AND v.accepted_at IS NOT NULL
  ORDER BY v.created_at DESC
  LIMIT LEAST(GREATEST(COALESCE(_limit, 20), 1), 50)
  OFFSET GREATEST(COALESCE(_offset, 0), 0);
$$;

GRANT EXECUTE ON FUNCTION public.explore_clips(integer, integer) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.increment_clip_views(_video_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE v integer;
BEGIN
  UPDATE public.bounty_videos
  SET view_count = view_count + 1
  WHERE id = _video_id AND is_public AND accepted_at IS NOT NULL
  RETURNING view_count INTO v;
  RETURN COALESCE(v, 0);
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_clip_views(uuid) TO anon, authenticated;
