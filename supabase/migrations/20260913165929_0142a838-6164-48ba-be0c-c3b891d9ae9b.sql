CREATE OR REPLACE FUNCTION public.guard_request_updates()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NOT NULL AND auth.uid() <> OLD.requester_id THEN
    IF NEW.id <> OLD.id
       OR NEW.requester_id <> OLD.requester_id
       OR NEW.bounty_amount <> OLD.bounty_amount
       OR NEW.expires_at <> OLD.expires_at
       OR NEW.latitude <> OLD.latitude
       OR NEW.longitude <> OLD.longitude
       OR NEW.prompt <> OLD.prompt
       OR COALESCE(NEW.category, '') <> COALESCE(OLD.category, '')
       OR NEW.checklist <> OLD.checklist
       OR NEW.created_at <> OLD.created_at
       OR COALESCE(NEW.location_name, '') <> COALESCE(OLD.location_name, '') THEN
      RAISE EXCEPTION 'Only the request status may be changed by a spotter';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

DROP POLICY IF EXISTS "Spotters can mark claimed requests" ON public.requests;
CREATE POLICY "Spotters can mark claimed requests"
ON public.requests
FOR UPDATE
TO authenticated
USING (
  status <> 'completed'::request_status
  AND EXISTS (
    SELECT 1 FROM public.claims c
    WHERE c.request_id = requests.id AND c.spotter_id = auth.uid()
  )
)
WITH CHECK (
  status IN ('claimed'::request_status, 'completed'::request_status)
  AND EXISTS (
    SELECT 1 FROM public.claims c
    WHERE c.request_id = requests.id AND c.spotter_id = auth.uid()
  )
);