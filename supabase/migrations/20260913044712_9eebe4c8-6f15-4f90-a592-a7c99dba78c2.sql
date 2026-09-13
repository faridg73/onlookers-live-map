-- 1. Lifecycle columns
ALTER TABLE public.bounty_videos
  ADD COLUMN IF NOT EXISTS expired_at timestamptz,
  ADD COLUMN IF NOT EXISTS purged_at timestamptz;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS warning_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS banned_at timestamptz;

-- 2. Queue of storage objects awaiting deletion
CREATE TABLE IF NOT EXISTS public.media_purge_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket text NOT NULL,
  path text NOT NULL,
  video_id uuid,
  error_message text NOT NULL DEFAULT '',
  purged_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (bucket, path)
);

GRANT ALL ON public.media_purge_queue TO service_role;
ALTER TABLE public.media_purge_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can review the purge queue"
  ON public.media_purge_queue FOR SELECT
  TO authenticated
  USING (public.is_review_staff(auth.uid()));

CREATE TRIGGER media_purge_queue_updated_at
  BEFORE UPDATE ON public.media_purge_queue
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Hide expired clips from public reads
DROP POLICY IF EXISTS "Public clips are readable" ON public.bounty_videos;
CREATE POLICY "Public clips are readable"
  ON public.bounty_videos FOR SELECT
  TO authenticated
  USING (is_public = true AND expired_at IS NULL);

-- 4. Hourly lifecycle sweep: mark expired, enqueue files, expire stale requests
CREATE OR REPLACE FUNCTION public.expire_stale_media()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _videos integer := 0;
  _queued integer := 0;
  _requests integer := 0;
BEGIN
  WITH stale AS (
    UPDATE public.bounty_videos
       SET expired_at = now(),
           is_public = false,
           updated_at = now()
     WHERE expired_at IS NULL
       AND created_at < now() - interval '24 hours'
    RETURNING id, storage_path, thumb_path
  ), paths AS (
    SELECT id, storage_path AS path FROM stale WHERE coalesce(storage_path, '') <> ''
    UNION ALL
    SELECT id, thumb_path FROM stale WHERE coalesce(thumb_path, '') <> ''
  ), inserted AS (
    INSERT INTO public.media_purge_queue (bucket, path, video_id)
    SELECT 'bounty-videos', path, id FROM paths
    ON CONFLICT (bucket, path) DO NOTHING
    RETURNING 1
  )
  SELECT (SELECT count(*) FROM stale), (SELECT count(*) FROM inserted)
    INTO _videos, _queued;

  UPDATE public.requests
     SET status = 'expired', updated_at = now()
   WHERE status = 'open'
     AND (expires_at < now() OR created_at < now() - interval '24 hours');
  GET DIAGNOSTICS _requests = ROW_COUNT;

  RETURN jsonb_build_object('videos', _videos, 'queued', _queued, 'requests', _requests);
END;
$$;

REVOKE ALL ON FUNCTION public.expire_stale_media() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.expire_stale_media() TO service_role;

-- 5. Admin moderation actions
CREATE OR REPLACE FUNCTION public.admin_warn_user(_user_id uuid, _reason text DEFAULT '')
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _count integer;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can issue warnings';
  END IF;

  UPDATE public.profiles
     SET warning_count = warning_count + 1, updated_at = now()
   WHERE id = _user_id
  RETURNING warning_count INTO _count;

  IF _count IS NULL THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;

  INSERT INTO public.notifications (user_id, kind, request_key, preview)
  VALUES (_user_id, 'account_warning', 'moderation',
          coalesce(nullif(_reason, ''), 'Your request broke the Onlooker content rules.'));

  RETURN _count;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_ban_user(_user_id uuid, _reason text DEFAULT '')
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can ban profiles';
  END IF;

  UPDATE public.profiles
     SET banned_at = now(), is_incognito = false, updated_at = now()
   WHERE id = _user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;

  INSERT INTO public.notifications (user_id, kind, request_key, preview)
  VALUES (_user_id, 'account_banned', 'moderation',
          coalesce(nullif(_reason, ''), 'Your Onlooker account has been suspended.'));

  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_unban_user(_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can restore profiles';
  END IF;
  UPDATE public.profiles SET banned_at = NULL, updated_at = now() WHERE id = _user_id;
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_warn_user(uuid, text) FROM anon;
REVOKE ALL ON FUNCTION public.admin_ban_user(uuid, text) FROM anon;
REVOKE ALL ON FUNCTION public.admin_unban_user(uuid) FROM anon;

-- 6. Banned accounts cannot create work
CREATE OR REPLACE FUNCTION public.block_banned_users()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND banned_at IS NOT NULL) THEN
    RAISE EXCEPTION 'This account has been suspended for breaking the Onlooker content rules.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS block_banned_on_requests ON public.requests;
CREATE TRIGGER block_banned_on_requests
  BEFORE INSERT ON public.requests
  FOR EACH ROW EXECUTE FUNCTION public.block_banned_users();

DROP TRIGGER IF EXISTS block_banned_on_claims ON public.claims;
CREATE TRIGGER block_banned_on_claims
  BEFORE INSERT ON public.claims
  FOR EACH ROW EXECUTE FUNCTION public.block_banned_users();

DROP TRIGGER IF EXISTS block_banned_on_messages ON public.request_messages;
CREATE TRIGGER block_banned_on_messages
  BEFORE INSERT ON public.request_messages
  FOR EACH ROW EXECUTE FUNCTION public.block_banned_users();

DROP TRIGGER IF EXISTS block_banned_on_videos ON public.bounty_videos;
CREATE TRIGGER block_banned_on_videos
  BEFORE INSERT ON public.bounty_videos
  FOR EACH ROW EXECUTE FUNCTION public.block_banned_users();

-- 7. Platform metrics for the admin control center
CREATE OR REPLACE FUNCTION public.platform_metrics()
RETURNS TABLE (
  gross_usd numeric,
  platform_cut_usd numeric,
  active_pins integer,
  pending_payouts_usd numeric,
  expired_clips integer
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_review_staff(auth.uid()) THEN
    RAISE EXCEPTION 'Only admins can read platform metrics';
  END IF;

  RETURN QUERY
  SELECT
    round(
      coalesce((SELECT sum(amount) FROM public.topups), 0)
      + coalesce((SELECT sum(amount_cents) / 100.0 FROM public.coin_purchases), 0), 2),
    round(
      coalesce((SELECT sum(fee_amount) FROM public.platform_earnings), 0)
      + coalesce((SELECT sum(amount_platform_fee) / 10.0 FROM public.coin_transactions), 0), 2),
    (SELECT count(*)::int FROM public.requests
      WHERE status = 'open' AND expires_at > now()
        AND created_at > now() - interval '24 hours'),
    round(coalesce((SELECT sum(amount) FROM public.payout_requests
      WHERE status IN ('pending', 'requested')), 0), 2),
    (SELECT count(*)::int FROM public.bounty_videos WHERE expired_at IS NOT NULL);
END;
$$;

REVOKE ALL ON FUNCTION public.platform_metrics() FROM anon;

-- 8. Admin view of the moderation log with profile context
CREATE OR REPLACE FUNCTION public.admin_moderation_log(_limit integer DEFAULT 200)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  display_name text,
  title text,
  details text,
  matched_terms text[],
  warning_count integer,
  banned_at timestamptz,
  created_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_review_staff(auth.uid()) THEN
    RAISE EXCEPTION 'Only admins can read the moderation log';
  END IF;

  RETURN QUERY
  SELECT f.id, f.user_id, coalesce(p.display_name, 'Unknown'), f.title, f.details,
         f.matched_terms, coalesce(p.warning_count, 0), p.banned_at, f.created_at
    FROM public.moderation_flags f
    LEFT JOIN public.profiles p ON p.id = f.user_id
   ORDER BY f.created_at DESC
   LIMIT greatest(1, least(coalesce(_limit, 200), 500));
END;
$$;

REVOKE ALL ON FUNCTION public.admin_moderation_log(integer) FROM anon;

-- 9. Admin cash-out queue with coin balances
CREATE OR REPLACE FUNCTION public.admin_payout_queue()
RETURNS TABLE (
  id uuid,
  user_id uuid,
  display_name text,
  amount numeric,
  coins_redeemed integer,
  coin_balance integer,
  destination text,
  status text,
  stripe_transfer_id text,
  created_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can read the payout queue';
  END IF;

  RETURN QUERY
  SELECT r.id, r.user_id, coalesce(p.display_name, 'Onlooker'), r.amount,
         coalesce(r.coins_redeemed, 0), coalesce(w.coin_balance, 0),
         r.destination, r.status, r.stripe_transfer_id, r.created_at
    FROM public.payout_requests r
    LEFT JOIN public.profiles p ON p.id = r.user_id
    LEFT JOIN public.user_wallets w ON w.user_id = r.user_id
   ORDER BY (r.status IN ('pending', 'requested')) DESC, r.created_at DESC
   LIMIT 200;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_payout_queue() FROM anon;