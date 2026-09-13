CREATE OR REPLACE FUNCTION public.enforce_request_content_moderation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  banned text[] := ARRAY['ticketmaster','stubhub','live nation','seatgeek','screen record','screenshot','broadcast','livestream feed','ticket barcode','qr code'];
  haystack text := lower(coalesce(NEW.prompt, ''));
  hits text[] := ARRAY(SELECT k FROM unnest(banned) AS k WHERE position(lower(k) IN haystack) > 0);
BEGIN
  IF array_length(hits, 1) > 0 THEN
    INSERT INTO public.moderation_logs (user_id, request_payload, triggered_keywords)
    VALUES (NEW.requester_id, jsonb_build_object('prompt', NEW.prompt), hits);
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'request_moderation_blocked: Requests for screen captures, broadcasts, ticket codes, or ticketing-platform content are not allowed. Ask for a physical, on-the-ground view instead.',
      DETAIL = array_to_string(hits, ', ');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS moderate_request_content ON public.requests;
CREATE TRIGGER moderate_request_content
BEFORE INSERT OR UPDATE ON public.requests
FOR EACH ROW
EXECUTE FUNCTION public.enforce_request_content_moderation();