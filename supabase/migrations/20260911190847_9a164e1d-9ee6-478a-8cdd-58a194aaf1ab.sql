CREATE OR REPLACE FUNCTION public.top_reporters_weekly(_limit integer DEFAULT 5)
 RETURNS TABLE(user_id uuid, display_name text, avatar_url text, total_earned numeric, clips integer)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH paid AS (
    SELECT wt.user_id,
           SUM(wt.amount)::numeric AS earned,
           COUNT(DISTINCT wt.request_id)::integer AS paid_clips
    FROM public.wallet_transactions wt
    WHERE wt.kind = 'bounty_payout'
      AND wt.amount > 0
      AND wt.created_at >= now() - interval '7 days'
    GROUP BY wt.user_id
  )
  SELECT
    paid.user_id,
    COALESCE(p.display_name, 'onlooker') AS display_name,
    p.avatar_url,
    paid.earned AS total_earned,
    paid.paid_clips AS clips
  FROM paid
  LEFT JOIN public.profiles p ON p.id = paid.user_id
  ORDER BY total_earned DESC, clips DESC
  LIMIT LEAST(GREATEST(COALESCE(_limit, 5), 1), 25);
$function$;

REVOKE ALL ON FUNCTION public.top_reporters_weekly(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.top_reporters_weekly(integer) TO anon, authenticated;