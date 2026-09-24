CREATE TABLE public.pro_visit_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES public.pro_accounts(user_id) ON DELETE CASCADE,
  request_id uuid UNIQUE REFERENCES public.requests(id) ON DELETE SET NULL,
  address text NOT NULL CHECK (char_length(address) BETWEEN 5 AND 200),
  purpose text NOT NULL CHECK (char_length(purpose) BETWEEN 10 AND 1000),
  scheduled_start_at timestamptz,
  contact_name text NOT NULL CHECK (char_length(contact_name) BETWEEN 1 AND 120),
  contact_phone text NOT NULL DEFAULT '' CHECK (char_length(contact_phone) <= 30),
  contact_email text NOT NULL DEFAULT '' CHECK (char_length(contact_email) <= 255),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (contact_phone <> '' OR contact_email <> '')
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pro_visit_bookings TO authenticated;
GRANT ALL ON public.pro_visit_bookings TO service_role;

ALTER TABLE public.pro_visit_bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Professionals read own visit bookings"
ON public.pro_visit_bookings FOR SELECT TO authenticated
USING (auth.uid() = owner_id);

CREATE POLICY "Professionals create own visit bookings"
ON public.pro_visit_bookings FOR INSERT TO authenticated
WITH CHECK (auth.uid() = owner_id AND request_id IS NULL);

CREATE POLICY "Professionals update own visit bookings"
ON public.pro_visit_bookings FOR UPDATE TO authenticated
USING (auth.uid() = owner_id)
WITH CHECK (
  auth.uid() = owner_id
  AND (
    request_id IS NULL
    OR EXISTS (
      SELECT 1 FROM public.requests r
      WHERE r.id = request_id AND r.requester_id = auth.uid()
    )
  )
);

CREATE POLICY "Professionals delete own unconfirmed visit bookings"
ON public.pro_visit_bookings FOR DELETE TO authenticated
USING (auth.uid() = owner_id AND request_id IS NULL);

CREATE OR REPLACE FUNCTION public.set_pro_visit_booking_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_pro_visit_booking_updated_at
BEFORE UPDATE ON public.pro_visit_bookings
FOR EACH ROW EXECUTE FUNCTION public.set_pro_visit_booking_updated_at();