ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS legal_first_name text,
  ADD COLUMN IF NOT EXISTS legal_last_name text,
  ADD COLUMN IF NOT EXISTS username text;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_lower_key
  ON public.profiles (lower(username)) WHERE username IS NOT NULL;

CREATE OR REPLACE FUNCTION public.is_username_available(_username text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE lower(username) = lower(btrim(_username))
      AND id <> COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid)
  );
$$;

REVOKE ALL ON FUNCTION public.is_username_available(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_username_available(text) TO authenticated, anon, service_role;

CREATE TABLE IF NOT EXISTS public.profile_security_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question_key text NOT NULL,
  answer_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, question_key)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profile_security_answers TO authenticated;
GRANT ALL ON public.profile_security_answers TO service_role;

ALTER TABLE public.profile_security_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members manage their own recovery answers"
  ON public.profile_security_answers FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_profile_security_answers_updated_at
  BEFORE UPDATE ON public.profile_security_answers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();