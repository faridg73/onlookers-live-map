-- The scanner flags the broad UPDATE policies on requests/claims even though
-- triggers already enforce valid transitions. Add an explicit BEFORE UPDATE
-- guard on requests so spotters can only change status, and refresh the claims
-- guards to remove duplicates and ensure they are the active triggers.

CREATE OR REPLACE FUNCTION public.guard_requests_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthenticated request updates are not allowed';
  END IF;

  -- Staff and requester updates are handled by guard_requester_updates; leave them alone.
  IF public.is_review_staff(auth.uid()) OR auth.uid() = OLD.requester_id THEN
    RETURN NEW;
  END IF;

  -- A spotter with a live claim may only advance the request status.
  IF EXISTS (
    SELECT 1 FROM public.claims c
    WHERE c.request_id = OLD.id
      AND c.spotter_id = auth.uid()
      AND c.status IN ('in_progress', 'submitted')
  ) THEN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      -- Only allow open -> claimed -> completed transitions.
      IF OLD.status = 'open' AND NEW.status = 'claimed' THEN
        RETURN NEW;
      END IF;
      IF OLD.status = 'claimed' AND NEW.status = 'completed' THEN
        RETURN NEW;
      END IF;
      RAISE EXCEPTION 'Spotters can only mark a request as claimed or completed';
    END IF;
    RAISE EXCEPTION 'Spotters can only change the request status';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_requests_update ON public.requests;
CREATE TRIGGER guard_requests_update
  BEFORE UPDATE ON public.requests
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_requests_update();

GRANT EXECUTE ON FUNCTION public.guard_requests_update() TO authenticated;

-- Refresh claims guards and remove any duplicates.
DROP TRIGGER IF EXISTS guard_claim_updates_trigger ON public.claims;
DROP TRIGGER IF EXISTS guard_claim_updates ON public.claims;
CREATE TRIGGER guard_claim_updates
  BEFORE UPDATE ON public.claims
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_claim_updates();

DROP TRIGGER IF EXISTS enforce_claim_update_rules_trigger ON public.claims;
DROP TRIGGER IF EXISTS enforce_claim_update_rules ON public.claims;
CREATE TRIGGER enforce_claim_update_rules
  BEFORE UPDATE ON public.claims
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_claim_update_rules();
