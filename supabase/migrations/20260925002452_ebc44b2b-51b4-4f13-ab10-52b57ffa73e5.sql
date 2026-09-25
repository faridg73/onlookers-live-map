CREATE OR REPLACE FUNCTION public.escrow_submit_on_bounty_video()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE rid uuid;
BEGIN
  BEGIN rid := regexp_replace(NEW.request_id, '^db-', '')::uuid; EXCEPTION WHEN others THEN rid := NULL; END;
  IF rid IS NOT NULL THEN
    UPDATE public.escrows
    SET status = 'submitted',
        spotter_id = COALESCE(spotter_id, NEW.uploader_id),
        auto_release_at = now() + interval '2 hours',
        updated_at = now()
    WHERE request_id = rid AND status IN ('held','reserved');

    PERFORM set_config('app.trusted_write', 'on', true);
    UPDATE public.claims
    SET status = 'submitted', updated_at = now()
    WHERE request_id = rid AND spotter_id = NEW.uploader_id AND status = 'in_progress';
    PERFORM set_config('app.trusted_write', 'off', true);
  END IF;
  RETURN NEW;
END;
$function$;