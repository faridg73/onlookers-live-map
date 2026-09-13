CREATE TABLE IF NOT EXISTS public.service_tokens (
  name text PRIMARY KEY,
  token text NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.service_tokens TO service_role;
ALTER TABLE public.service_tokens ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER service_tokens_updated_at
  BEFORE UPDATE ON public.service_tokens
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.service_tokens (name)
VALUES ('media_lifecycle')
ON CONFLICT (name) DO NOTHING;

CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_cron;