CREATE TABLE public.venue_cache (
  cache_key text PRIMARY KEY,
  places jsonb NOT NULL DEFAULT '[]'::jsonb,
  fetched_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.venue_cache TO service_role;
ALTER TABLE public.venue_cache ENABLE ROW LEVEL SECURITY;