ALTER TABLE public.requests
  ADD COLUMN IF NOT EXISTS location_type text;

ALTER TABLE public.requests
  ADD CONSTRAINT requests_location_type_check
  CHECK (location_type IS NULL OR location_type IN ('public','commercial','owner_authorized','event_venue'));