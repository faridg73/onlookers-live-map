CREATE TABLE public.email_otp_codes (
  email text PRIMARY KEY,
  code_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  attempts integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.email_otp_codes TO service_role;
ALTER TABLE public.email_otp_codes ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.signup_verification_proofs (
  proof_hash text PRIMARY KEY,
  verification_kind text NOT NULL,
  destination text NOT NULL,
  binding_email text NOT NULL,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.signup_verification_proofs TO service_role;
ALTER TABLE public.signup_verification_proofs ENABLE ROW LEVEL SECURITY;

CREATE INDEX signup_verification_proofs_lookup_idx
  ON public.signup_verification_proofs (verification_kind, destination, binding_email, expires_at)
  WHERE consumed_at IS NULL;

CREATE OR REPLACE FUNCTION public.validate_signup_verification_row()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.verification_kind NOT IN ('email', 'phone') THEN
    RAISE EXCEPTION 'Invalid signup verification kind';
  END IF;
  IF NEW.expires_at <= NEW.created_at THEN
    RAISE EXCEPTION 'Signup verification expiry must follow creation';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.validate_signup_verification_row() FROM PUBLIC;

CREATE TRIGGER validate_signup_verification_row_trigger
BEFORE INSERT OR UPDATE ON public.signup_verification_proofs
FOR EACH ROW EXECUTE FUNCTION public.validate_signup_verification_row();