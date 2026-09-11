DO $$
DECLARE t text;
BEGIN
  FOR t IN
    SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r'
      AND c.relname NOT IN ('posts','video_comments','video_reviews','support_tickets')
  LOOP
    EXECUTE format('REVOKE ALL ON public.%I FROM anon', t);
  END LOOP;
END $$;

REVOKE ALL ON public.posts FROM anon;
GRANT SELECT ON public.posts TO anon;
REVOKE ALL ON public.video_comments FROM anon;
GRANT SELECT ON public.video_comments TO anon;
REVOKE ALL ON public.video_reviews FROM anon;
GRANT SELECT ON public.video_reviews TO anon;
REVOKE ALL ON public.support_tickets FROM anon;
GRANT INSERT ON public.support_tickets TO anon;