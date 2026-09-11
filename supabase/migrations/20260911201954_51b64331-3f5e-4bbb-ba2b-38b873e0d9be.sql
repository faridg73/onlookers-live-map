CREATE OR REPLACE FUNCTION public.enforce_request_rules()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.latitude < -90 OR NEW.latitude > 90 THEN
    RAISE EXCEPTION 'Latitude must be between -90 and 90';
  END IF;
  IF NEW.longitude < -180 OR NEW.longitude > 180 THEN
    RAISE EXCEPTION 'Longitude must be between -180 and 180';
  END IF;
  IF NEW.bounty_amount < 0 THEN
    RAISE EXCEPTION 'Bounty cannot be negative';
  END IF;
  IF TG_OP = 'INSERT' AND NEW.expires_at <= now() THEN
    RAISE EXCEPTION 'Request expiry must be in the future';
  END IF;

  IF TG_OP = 'UPDATE'
     AND auth.uid() IS NOT NULL
     AND auth.uid() <> OLD.requester_id
     AND NOT public.is_review_staff(auth.uid()) THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.claims c
      WHERE c.request_id = OLD.id AND c.spotter_id = auth.uid()
    ) THEN
      RAISE EXCEPTION 'Only the requester or claiming spotter can update this request';
    END IF;

    IF OLD.status <> 'open' OR NEW.status <> 'claimed' THEN
      RAISE EXCEPTION 'A spotter can only mark an open request as claimed';
    END IF;

    IF NEW.id IS DISTINCT FROM OLD.id
      OR NEW.requester_id IS DISTINCT FROM OLD.requester_id
      OR NEW.prompt IS DISTINCT FROM OLD.prompt
      OR NEW.latitude IS DISTINCT FROM OLD.latitude
      OR NEW.longitude IS DISTINCT FROM OLD.longitude
      OR NEW.location_name IS DISTINCT FROM OLD.location_name
      OR NEW.bounty_amount IS DISTINCT FROM OLD.bounty_amount
      OR NEW.expires_at IS DISTINCT FROM OLD.expires_at
      OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
      RAISE EXCEPTION 'A spotter can only change the request status';
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;