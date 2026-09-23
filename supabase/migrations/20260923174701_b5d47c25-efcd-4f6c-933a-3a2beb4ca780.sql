CREATE TABLE public.phone_otp_codes (
  phone text PRIMARY KEY,
  code_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  attempts integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.phone_otp_codes TO service_role;
ALTER TABLE public.phone_otp_codes ENABLE ROW LEVEL SECURITY;