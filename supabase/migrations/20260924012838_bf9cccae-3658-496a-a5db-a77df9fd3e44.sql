ALTER TABLE public.pro_visit_bookings
  DROP CONSTRAINT pro_visit_bookings_booking_status_check;

ALTER TABLE public.pro_visit_bookings
  ADD CONSTRAINT pro_visit_bookings_booking_status_check
  CHECK (booking_status IN ('draft', 'published', 'cancelled'));

ALTER TABLE public.pro_visit_bookings
  ADD CONSTRAINT pro_visit_bookings_lifecycle_check
  CHECK (
    (booking_status = 'draft' AND request_id IS NULL)
    OR (booking_status = 'published' AND request_id IS NOT NULL)
    OR (booking_status = 'cancelled' AND request_id IS NULL)
  );

CREATE OR REPLACE FUNCTION public.preserve_cancelled_pro_visit_booking()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.pro_visit_bookings
  SET booking_status = 'cancelled', request_id = NULL
  WHERE request_id = OLD.id;
  RETURN OLD;
END;
$$;

REVOKE ALL ON FUNCTION public.preserve_cancelled_pro_visit_booking() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.preserve_cancelled_pro_visit_booking() TO service_role;

CREATE TRIGGER preserve_cancelled_pro_visit_booking
BEFORE DELETE ON public.requests
FOR EACH ROW EXECUTE FUNCTION public.preserve_cancelled_pro_visit_booking();

DROP POLICY "Professionals update own visit bookings" ON public.pro_visit_bookings;
CREATE POLICY "Professionals update own visit bookings"
ON public.pro_visit_bookings FOR UPDATE TO authenticated
USING (auth.uid() = owner_id)
WITH CHECK (
  auth.uid() = owner_id
  AND (
    (booking_status = 'draft' AND request_id IS NULL)
    OR (
      booking_status = 'published'
      AND request_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.requests r
        WHERE r.id = request_id
          AND r.requester_id = auth.uid()
          AND r.category = 'realestate'
      )
    )
  )
);