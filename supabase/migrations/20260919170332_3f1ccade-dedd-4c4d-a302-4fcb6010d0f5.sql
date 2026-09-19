ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS location text,
  ADD COLUMN IF NOT EXISTS bio text;

COMMENT ON COLUMN public.profiles.location IS 'User-provided public profile location';
COMMENT ON COLUMN public.profiles.bio IS 'User-provided public profile biography';