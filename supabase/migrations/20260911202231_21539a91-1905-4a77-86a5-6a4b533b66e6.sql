CREATE OR REPLACE FUNCTION public.enforce_claim_update_rules()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.id IS DISTINCT FROM OLD.id
    OR NEW.request_id IS DISTINCT FROM OLD.request_id
    OR NEW.spotter_id IS DISTINCT FROM OLD.spotter_id
    OR NEW.claimed_at IS DISTINCT FROM OLD.claimed_at
    OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Claim ownership and request cannot be changed';
  END IF;

  IF public.is_review_staff(auth.uid()) THEN
    RETURN NEW;
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