CREATE OR REPLACE FUNCTION public.tipping_enabled()
RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path = public AS $$ SELECT false $$;
GRANT EXECUTE ON FUNCTION public.tipping_enabled() TO anon, authenticated, service_role;

DO $mig$
DECLARE f record; def text;
BEGIN
  FOR f IN SELECT p.oid, p.proname FROM pg_proc p
    WHERE p.pronamespace = 'public'::regnamespace
      AND p.proname IN ('accept_bounty_video','settle_escrows','resolve_dispute','resolve_dispute_split','decline_site_pin_authorization','tip_hunter','tip_credits')
  LOOP
    def := pg_get_functiondef(f.oid);
    def := replace(def, '* 0.15', '* public.platform_fee_rate()');
    def := replace(def, '''Looker Coins earned (after 15% app fee)''', '''Credits earned (after platform fee)''');
    IF f.proname = 'tip_hunter' THEN
      def := replace(def, 'RAISE EXCEPTION ''Sign in to tip''; END IF;',
        'RAISE EXCEPTION ''Sign in to tip''; END IF;
  IF NOT public.tipping_enabled() THEN RAISE EXCEPTION ''Tipping is currently paused''; END IF;');
    ELSIF f.proname = 'tip_credits' THEN
      def := replace(def, 'RAISE EXCEPTION ''Invalid transaction type''; END IF;',
        'RAISE EXCEPTION ''Invalid transaction type''; END IF;
  IF _transaction_type = ''direct_tip'' AND NOT public.tipping_enabled() THEN RAISE EXCEPTION ''Tipping is currently paused''; END IF;');
    END IF;
    EXECUTE def;
  END LOOP;
END $mig$;