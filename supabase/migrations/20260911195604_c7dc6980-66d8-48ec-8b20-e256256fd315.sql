CREATE TABLE public.request_access_codes (
  request_id uuid PRIMARY KEY REFERENCES public.requests(id) ON DELETE CASCADE,
  requester_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code text NOT NULL CHECK (char_length(btrim(code)) BETWEEN 4 AND 40),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.request_access_codes TO authenticated;
GRANT ALL ON public.request_access_codes TO service_role;

ALTER TABLE public.request_access_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Requester manages their own access code"
ON public.request_access_codes FOR ALL
TO authenticated
USING (requester_id = auth.uid())
WITH CHECK (
  requester_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.requests r
    WHERE r.id = request_id AND r.requester_id = auth.uid()
  )
);

CREATE POLICY "Claiming spotter can read the access code"
ON public.request_access_codes FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.claims c
    WHERE c.request_id = request_access_codes.request_id
      AND c.spotter_id = auth.uid()
  )
);

CREATE TRIGGER update_request_access_codes_updated_at
BEFORE UPDATE ON public.request_access_codes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();