ALTER TABLE public.bounty_videos ADD COLUMN IF NOT EXISTS payout_email_sent_at timestamptz;
SELECT set_config('app.trusted_write', 'on', true);
UPDATE public.bounty_videos SET payout_email_sent_at = now() WHERE accepted_at IS NOT NULL AND payout_email_sent_at IS NULL;