CREATE TABLE public.user_follows (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  follower_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  followee_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (follower_id, followee_id),
  CHECK (follower_id <> followee_id)
);
GRANT SELECT ON public.user_follows TO anon;
GRANT SELECT, INSERT, DELETE ON public.user_follows TO authenticated;
GRANT ALL ON public.user_follows TO service_role;
ALTER TABLE public.user_follows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can see follows" ON public.user_follows FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Users can follow as themselves" ON public.user_follows FOR INSERT TO authenticated WITH CHECK (auth.uid() = follower_id);
CREATE POLICY "Users can unfollow themselves" ON public.user_follows FOR DELETE TO authenticated USING (auth.uid() = follower_id);

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS follower_count integer NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.sync_follower_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM set_config('app.trusted_write', 'on', true);
  IF TG_OP = 'INSERT' THEN
    UPDATE public.profiles SET follower_count = follower_count + 1 WHERE id = NEW.followee_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.profiles SET follower_count = GREATEST(0, follower_count - 1) WHERE id = OLD.followee_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER user_follows_count AFTER INSERT OR DELETE ON public.user_follows
FOR EACH ROW EXECUTE FUNCTION public.sync_follower_count();