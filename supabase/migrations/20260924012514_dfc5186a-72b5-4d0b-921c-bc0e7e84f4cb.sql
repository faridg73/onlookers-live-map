ALTER TABLE public.pro_visit_bookings
  ADD COLUMN booking_status text NOT NULL DEFAULT 'draft'
  CHECK (booking_status IN ('draft', 'published'));

CREATE INDEX pro_visit_bookings_owner_created_idx
  ON public.pro_visit_bookings (owner_id, created_at DESC);