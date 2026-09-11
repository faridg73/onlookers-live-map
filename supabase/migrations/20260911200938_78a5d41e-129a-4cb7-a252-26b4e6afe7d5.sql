CREATE OR REPLACE FUNCTION public.is_review_staff(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('admin'::app_role, 'moderator'::app_role)
  );
$$;
REVOKE ALL ON FUNCTION public.is_review_staff(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_review_staff(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.can_view_dispute(_request_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_review_staff(_user_id) OR EXISTS (
    SELECT 1 FROM public.escrows e
    WHERE e.request_id = _request_id
      AND (e.requester_id = _user_id OR e.spotter_id = _user_id)
  ) OR EXISTS (
    SELECT 1 FROM public.bounty_videos v
    WHERE v.request_id::text = _request_id::text AND v.uploader_id = _user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.list_disputes()
RETURNS TABLE(
  request_id uuid,
  prompt text,
  location_name text,
  amount numeric,
  status text,
  dispute_reason text,
  disputed_at timestamptz,
  requester_id uuid,
  spotter_id uuid,
  is_moderator boolean,
  evidence_count integer
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT e.request_id, r.prompt, r.location_name, e.amount, e.status,
         COALESCE(e.dispute_reason, ''), e.disputed_at, e.requester_id, e.spotter_id,
         public.is_review_staff(auth.uid()),
         (SELECT count(*)::int FROM public.dispute_evidence d WHERE d.request_id = e.request_id)
  FROM public.escrows e
  JOIN public.requests r ON r.id = e.request_id
  WHERE e.status = 'disputed'
    AND (public.is_review_staff(auth.uid())
         OR e.requester_id = auth.uid()
         OR e.spotter_id = auth.uid())
  ORDER BY e.disputed_at DESC NULLS LAST;
$$;

CREATE OR REPLACE FUNCTION public.resolve_dispute(_request_id uuid, _award_spotter boolean)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $function$
DECLARE e RECORD; fee numeric; net numeric;
BEGIN
  IF NOT public.is_review_staff(auth.uid()) THEN RAISE EXCEPTION 'Moderators only'; END IF;

  SELECT * INTO e FROM public.escrows WHERE request_id = _request_id AND status = 'disputed' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'No open dispute for this request'; END IF;

  IF _award_spotter THEN
    fee := ROUND(e.amount * 0.15, 2);
    net := e.amount - fee;
    IF net > 0 THEN
      PERFORM public.adjust_wallet(e.spotter_id, net, 'bounty_payout', e.request_id, 'Bounty earned (dispute settled)');
    END IF;
    INSERT INTO public.platform_earnings (request_id, spotter_id, gross_amount, fee_amount)
    VALUES (e.request_id, e.spotter_id, e.amount, fee);
    UPDATE public.escrows SET status = 'released', updated_at = now() WHERE id = e.id;
    UPDATE public.claims SET status = 'approved' WHERE request_id = e.request_id AND status = 'submitted';
    UPDATE public.requests SET status = 'completed' WHERE id = e.request_id;
  ELSE
    IF e.amount > 0 THEN
      PERFORM public.adjust_wallet(e.requester_id, e.amount, 'escrow_refund', e.request_id, 'Dispute settled - bounty refunded');
    END IF;
    UPDATE public.escrows SET status = 'refunded', updated_at = now() WHERE id = e.id;
    UPDATE public.requests SET status = 'expired' WHERE id = e.request_id;
  END IF;
  RETURN true;
END;
$function$;

CREATE POLICY "Review staff can watch disputed clips"
ON public.bounty_videos FOR SELECT TO authenticated
USING (public.is_review_staff(auth.uid()));

CREATE POLICY "Review staff can read bounty video files"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'bounty-videos' AND public.is_review_staff(auth.uid()));

CREATE OR REPLACE FUNCTION public.set_moderator(_email text, _enabled boolean)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Admins only'; END IF;
  SELECT id INTO uid FROM auth.users WHERE lower(email) = lower(_email);
  IF uid IS NULL THEN RAISE EXCEPTION 'No account with that email'; END IF;
  IF _enabled THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (uid, 'moderator')
    ON CONFLICT (user_id, role) DO NOTHING;
  ELSE
    DELETE FROM public.user_roles WHERE user_id = uid AND role = 'moderator';
  END IF;
  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.set_moderator(text, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_moderator(text, boolean) TO authenticated;