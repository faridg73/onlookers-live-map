CREATE OR REPLACE FUNCTION public.get_member_tiers(_user_ids uuid[])
RETURNS TABLE(user_id uuid, tier text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT w.user_id, w.subscription_tier
  FROM public.user_wallets w
  WHERE w.user_id = ANY(_user_ids[1:100])
    AND w.subscription_tier IN ('observer','hunter','operative');
$$;
REVOKE ALL ON FUNCTION public.get_member_tiers(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_member_tiers(uuid[]) TO anon, authenticated;