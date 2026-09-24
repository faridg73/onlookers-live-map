CREATE OR REPLACE FUNCTION public.mark_payout_email_sent(_video_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM set_config('app.trusted_write', 'on', true);
  UPDATE public.bounty_videos SET payout_email_sent_at = now()
  WHERE id = _video_id AND accepted_at IS NOT NULL AND payout_email_sent_at IS NULL;
END; $$;
REVOKE ALL ON FUNCTION public.mark_payout_email_sent(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mark_payout_email_sent(uuid) TO service_role;