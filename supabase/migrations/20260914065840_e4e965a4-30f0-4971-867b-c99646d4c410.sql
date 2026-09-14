ALTER TABLE public.requests
  ADD COLUMN IF NOT EXISTS custom_duration_minutes integer,
  ADD COLUMN IF NOT EXISTS weather_multiplier numeric NOT NULL DEFAULT 1.0,
  ADD COLUMN IF NOT EXISTS bounty_tier text;

-- Ensure scheduled_start_at exists (already added earlier; IF NOT EXISTS keeps it safe)
ALTER TABLE public.requests
  ADD COLUMN IF NOT EXISTS scheduled_start_at timestamp with time zone;

-- Optional sanity check: weather multiplier should not be negative
ALTER TABLE public.requests
  ADD CONSTRAINT requests_weather_multiplier_nonnegative
  CHECK (weather_multiplier >= 0);