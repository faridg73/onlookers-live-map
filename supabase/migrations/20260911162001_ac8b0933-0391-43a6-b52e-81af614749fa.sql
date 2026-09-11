CREATE TABLE public.bounty_boosts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id text NOT NULL,
  booster_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount numeric NOT NULL CHECK (amount > 0 AND amount <= 100),
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, DELETE ON public.bounty_boosts TO authenticated;
GRANT ALL ON public.bounty_boosts TO service_role;

ALTER TABLE public.bounty_boosts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Signed-in users can view boosts"
  ON public.bounty_boosts FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can add their own boosts"
  ON public.bounty_boosts FOR INSERT TO authenticated WITH CHECK (auth.uid() = booster_id);

CREATE POLICY "Users can remove their own boosts"
  ON public.bounty_boosts FOR DELETE TO authenticated USING (auth.uid() = booster_id);

CREATE INDEX bounty_boosts_request_id_idx ON public.bounty_boosts (request_id);

CREATE OR REPLACE FUNCTION public.top_reporters(_limit integer DEFAULT 10)
RETURNS TABLE (
  user_id uuid,
  display_name text,
  avatar_url text,
  total_earned numeric,
  clips integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    v.uploader_id AS user_id,
    COALESCE(p.display_name, 'onlooker') AS display_name,
    p.avatar_url,
    COALESCE(SUM(v.bounty_amount), 0)::numeric AS total_earned,
    COUNT(*)::integer AS clips
  FROM public.bounty_videos v
  LEFT JOIN public.profiles p ON p.id = v.uploader_id
  GROUP BY v.uploader_id, p.display_name, p.avatar_url
  ORDER BY total_earned DESC, clips DESC
  LIMIT LEAST(GREATEST(COALESCE(_limit, 10), 1), 50);
$$;

GRANT EXECUTE ON FUNCTION public.top_reporters(integer) TO anon, authenticated;