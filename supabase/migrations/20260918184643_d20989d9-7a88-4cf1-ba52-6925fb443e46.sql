-- 1. Trigger functions must never be directly callable by clients
DO $$
DECLARE f record;
BEGIN
  FOR f IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    WHERE p.pronamespace = 'public'::regnamespace
      AND p.prorettype = 'trigger'::regtype
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', f.sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', f.sig);
  END LOOP;
END $$;

-- 2. Non-trigger helpers: drop blanket PUBLIC/anon access, keep service_role
DO $$
DECLARE f record;
BEGIN
  FOR f IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    WHERE p.pronamespace = 'public'::regnamespace
      AND p.prorettype <> 'trigger'::regtype
      AND p.prokind = 'f'
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon', f.sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', f.sig);
  END LOOP;
END $$;

-- 2b. Re-grant only the genuinely public read helpers to anonymous visitors
GRANT EXECUTE ON FUNCTION public.explore_clips(integer, integer) TO anon;
GRANT EXECUTE ON FUNCTION public.global_feed_clips(integer) TO anon;
GRANT EXECUTE ON FUNCTION public.public_community_feed(text, integer) TO anon;
GRANT EXECUTE ON FUNCTION public.public_request_markers() TO anon;
GRANT EXECUTE ON FUNCTION public.public_profile_card(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.top_reporters(integer) TO anon;
GRANT EXECUTE ON FUNCTION public.top_reporters_weekly(integer) TO anon;
GRANT EXECUTE ON FUNCTION public.hunter_trust(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.increment_clip_views(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.is_username_available(text) TO anon;
GRANT EXECUTE ON FUNCTION public.request_is_live(uuid) TO anon;

-- 2c. Privileged / backend-only helpers: not callable by signed-in members either
DO $$
DECLARE f record;
BEGIN
  FOR f IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    WHERE p.pronamespace = 'public'::regnamespace
      AND p.proname IN (
        'adjust_wallet','award_xp','credit_purchase','credit_coin_purchase','credit_topup',
        'mark_creator_verified','settle_escrows','expire_stale_media','close_expired_requests',
        'consume_rate_limit','guard_cashout_velocity','ensure_coin_wallet','tip_coins',
        'request_coin_cashout','payout_hold_on_request'
      )
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', f.sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', f.sig);
  END LOOP;
END $$;

-- 3. Claims: neither side may change anything but the status
CREATE OR REPLACE FUNCTION public.enforce_claim_update_rules()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  old_j jsonb;
  new_j jsonb;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  IF public.is_review_staff(auth.uid()) THEN
    RETURN NEW;
  END IF;

  -- everything except status/updated_at must be byte-for-byte identical
  old_j := (to_jsonb(OLD) - 'status' - 'updated_at');
  new_j := (to_jsonb(NEW) - 'status' - 'updated_at');
  IF old_j IS DISTINCT FROM new_j THEN
    RAISE EXCEPTION 'Only the claim status may be changed';
  END IF;

  IF auth.uid() = OLD.spotter_id THEN
    IF OLD.status = 'in_progress' AND NEW.status IN ('in_progress', 'submitted') THEN
      RETURN NEW;
    END IF;
    RAISE EXCEPTION 'A spotter can only submit an in-progress claim';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.requests r
    WHERE r.id = OLD.request_id AND r.requester_id = auth.uid()
  ) THEN
    IF OLD.status = 'submitted' AND NEW.status = 'approved' THEN
      RETURN NEW;
    END IF;
    RAISE EXCEPTION 'A requester can only approve a submitted claim';
  END IF;

  RAISE EXCEPTION 'You cannot update this claim';
END;
$function$;

CREATE OR REPLACE FUNCTION public.guard_claim_updates()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  IF (to_jsonb(OLD) - 'status' - 'updated_at') IS DISTINCT FROM (to_jsonb(NEW) - 'status' - 'updated_at') THEN
    RAISE EXCEPTION 'Only the claim status may be changed';
  END IF;
  RETURN NEW;
END;
$function$;

-- 4. Requests: a claiming spotter may only change the status, never any other column
CREATE OR REPLACE FUNCTION public.guard_request_updates()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  IF COALESCE(current_setting('app.trusted_write', true), '') = 'on' THEN
    RETURN NEW;
  END IF;

  IF auth.uid() IS NULL OR auth.uid() = OLD.requester_id OR public.is_review_staff(auth.uid()) THEN
    RETURN NEW;
  END IF;

  IF (to_jsonb(OLD) - 'status' - 'updated_at') IS DISTINCT FROM (to_jsonb(NEW) - 'status' - 'updated_at') THEN
    RAISE EXCEPTION 'Only the request status may be changed by a spotter';
  END IF;

  RETURN NEW;
END;
$function$;
