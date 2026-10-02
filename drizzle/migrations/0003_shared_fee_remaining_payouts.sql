DO $mig$
DECLARE f record;
BEGIN
  FOR f IN SELECT p.oid FROM pg_proc p
    WHERE p.pronamespace = 'public'::regnamespace
      AND p.proname IN ('qa_simulate_bounty_payout','escrow_release_on_approval','submit_instant_snippet')
  LOOP
    EXECUTE replace(pg_get_functiondef(f.oid), '* 0.15', '* public.platform_fee_rate()');
  END LOOP;
END $mig$;