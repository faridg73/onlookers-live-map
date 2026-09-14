ALTER TABLE public.requests
  ADD COLUMN IF NOT EXISTS custom_deadline_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS duration_minutes integer NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS bounty_type text NOT NULL DEFAULT 'live_stream',
  ADD COLUMN IF NOT EXISTS scheduled_start_at timestamptz NULL;

ALTER TABLE public.requests
  ADD CONSTRAINT requests_bounty_type_check
  CHECK (bounty_type IN ('live_stream', 'pre_recorded_clip'));

ALTER TABLE public.requests
  ADD CONSTRAINT requests_duration_minutes_check
  CHECK (duration_minutes BETWEEN 1 AND 1440);