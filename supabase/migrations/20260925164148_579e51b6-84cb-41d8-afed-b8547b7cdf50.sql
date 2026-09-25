CREATE OR REPLACE FUNCTION public.award_xp(_user_id uuid, _amount integer, _reason text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$ BEGIN PERFORM public.award_xp(_user_id, _amount); END; $$;
REVOKE EXECUTE ON FUNCTION public.award_xp(uuid, integer, text) FROM PUBLIC, anon, authenticated;