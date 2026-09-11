CREATE OR REPLACE FUNCTION public.top_reporters(_limit integer DEFAULT 10)
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
    WHERE wt.kind = 'bounty_payout' AND wt.amount > 0
    GROUP BY wt.user_id
  ),
  uploaded AS (
    SELECT v.uploader_id AS user_id, COUNT(*)::integer AS uploads
    FROM public.bounty_videos v
    GROUP BY v.uploader_id
  ),
  people AS (
    SELECT user_id FROM paid
    UNION
    SELECT user_id FROM uploaded
  )
  SELECT
    pe.user_id,
    COALESCE(p.display_name, 'onlooker') AS display_name,
    p.avatar_url,
    COALESCE(paid.earned, 0)::numeric AS total_earned,
    GREATEST(COALESCE(paid.paid_clips, 0), COALESCE(uploaded.uploads, 0))::integer AS clips
  FROM people pe
  LEFT JOIN paid ON paid.user_id = pe.user_id
  LEFT JOIN uploaded ON uploaded.user_id = pe.user_id
  LEFT JOIN public.profiles p ON p.id = pe.user_id
  ORDER BY total_earned DESC, clips DESC
  LIMIT LEAST(GREATEST(COALESCE(_limit, 10), 1), 50);
$function$;