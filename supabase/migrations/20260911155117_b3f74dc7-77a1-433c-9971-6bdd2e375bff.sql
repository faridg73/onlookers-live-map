CREATE TABLE public.bounty_videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id text NOT NULL,
  uploader_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  request_title text NOT NULL DEFAULT '',
  request_place text NOT NULL DEFAULT '',
  bounty_amount numeric NOT NULL DEFAULT 0,
  note text NOT NULL DEFAULT '',
  storage_path text NOT NULL,
  duration_seconds integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.bounty_videos TO authenticated;
GRANT ALL ON public.bounty_videos TO service_role;

ALTER TABLE public.bounty_videos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Signed-in users can view bounty videos"
  ON public.bounty_videos FOR SELECT TO authenticated USING (true);

CREATE POLICY "Uploaders can add their own bounty videos"
  ON public.bounty_videos FOR INSERT TO authenticated WITH CHECK (auth.uid() = uploader_id);

CREATE POLICY "Uploaders can update their own bounty videos"
  ON public.bounty_videos FOR UPDATE TO authenticated USING (auth.uid() = uploader_id) WITH CHECK (auth.uid() = uploader_id);

CREATE POLICY "Uploaders can delete their own bounty videos"
  ON public.bounty_videos FOR DELETE TO authenticated USING (auth.uid() = uploader_id);

CREATE INDEX bounty_videos_request_id_idx ON public.bounty_videos (request_id);
CREATE INDEX bounty_videos_uploader_idx ON public.bounty_videos (uploader_id, created_at DESC);

CREATE TRIGGER update_bounty_videos_updated_at
  BEFORE UPDATE ON public.bounty_videos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Signed-in users can read bounty videos"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'bounty-videos');

CREATE POLICY "Users can upload bounty videos to their own folder"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'bounty-videos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own bounty videos"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'bounty-videos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own bounty videos"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'bounty-videos' AND auth.uid()::text = (storage.foldername(name))[1]);