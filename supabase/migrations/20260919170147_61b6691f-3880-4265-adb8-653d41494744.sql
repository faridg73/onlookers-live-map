CREATE OR REPLACE FUNCTION public.award_xp(_user_id uuid, _amount integer)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total integer;
  v_award integer;
BEGIN
  IF _user_id IS NULL OR COALESCE(_amount, 0) <= 0 THEN RETURN NULL; END IF;

  -- Existing protected completion paths historically pass 100. Translate that
  -- legacy completion award to the current 10 XP reward.
  v_award := CASE WHEN _amount = 100 THEN 10 ELSE _amount END;

  UPDATE public.profiles
  SET xp = xp + v_award,
      hunter_level = 1 + ((xp + v_award) / 500)
  WHERE id = _user_id
  RETURNING hunter_level INTO total;

  RETURN total;
END;
$$;

REVOKE ALL ON FUNCTION public.award_xp(uuid, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.award_xp(uuid, integer) TO service_role;

UPDATE public.profiles
SET hunter_level = 1 + (xp / 500)
WHERE hunter_level IS DISTINCT FROM 1 + (xp / 500);