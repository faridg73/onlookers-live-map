CREATE OR REPLACE FUNCTION public.normalize_username_for_reservation(_username text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT translate(
    regexp_replace(lower(btrim(coalesce(_username, ''))), '[^a-z0-9]', '', 'g'),
    '013457$@',
    'oieast sa'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_reserved_username(_username text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT public.normalize_username_for_reservation(_username) = ANY (ARRAY[
    -- brand protection
    'onlooker','onlookerofficial','onlookerapp','onlookerlive','onlookerteam',
    'onlookerllc','onlookerhq','onlookerco',
    -- staff / system sounding
    'admin','administrator','moderator','mod','support','help','official','staff',
    'security','billing','verified','team','system','root','superuser',
    -- route collisions
    'settings','profile','terms','rules','login','signup','logout','api','discover',
    'earn','post','home','feed','community','events','auth','dashboard','account',
    -- impersonation risk
    'police','fbi','irs','government','gov'
  ]::text[]);
$$;

GRANT EXECUTE ON FUNCTION public.normalize_username_for_reservation(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_reserved_username(text) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.is_username_available(_username text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NOT public.is_reserved_username(_username)
    AND NOT EXISTS (
      SELECT 1 FROM public.profiles
      WHERE lower(username) = lower(btrim(_username))
        AND id <> COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid)
    );
$$;

CREATE OR REPLACE FUNCTION public.guard_reserved_username()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.username IS NOT NULL
     AND (TG_OP = 'INSERT' OR NEW.username IS DISTINCT FROM OLD.username)
     AND public.is_reserved_username(NEW.username) THEN
    RAISE EXCEPTION 'That username is already claimed.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_reserved_username_on_profiles ON public.profiles;
CREATE TRIGGER guard_reserved_username_on_profiles
BEFORE INSERT OR UPDATE OF username ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.guard_reserved_username();