CREATE TABLE public.dmca_notices (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  email text NOT NULL,
  content_url text NOT NULL,
  description text NOT NULL,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.dmca_notices TO authenticated;
GRANT ALL ON public.dmca_notices TO service_role;
ALTER TABLE public.dmca_notices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can review dmca notices" ON public.dmca_notices FOR SELECT TO authenticated USING (public.is_review_staff(auth.uid()));
CREATE TRIGGER update_dmca_notices_updated_at BEFORE UPDATE ON public.dmca_notices FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();