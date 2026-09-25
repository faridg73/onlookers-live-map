CREATE OR REPLACE FUNCTION public.bill_stream_minute(_session_id uuid)
RETURNS TABLE(minutes_billed integer, credits_spent integer, host_earned integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _row public.stream_sessions;
  _rate integer;
  _fee integer;
  _net integer;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'You must be signed in.'; END IF;

  SELECT * INTO _row FROM public.stream_sessions WHERE id = _session_id;
  IF _row.id IS NULL THEN RAISE EXCEPTION 'That live session no longer exists.'; END IF;
  IF _row.viewer_id <> _uid THEN RAISE EXCEPTION 'Only the viewer can be charged for this session.'; END IF;
  IF _row.status <> 'live' THEN RAISE EXCEPTION 'This live session has ended.'; END IF;

  _rate := _row.credits_per_minute;
  _fee := floor(_rate * 0.2);
  _net := _rate - _fee;

  PERFORM public.adjust_wallet(_uid, -_rate, 'stream_minute', NULL,
    format('%s Credits for a minute of live video', _rate));
  PERFORM public.adjust_wallet(_row.host_id, _net, 'stream_earning', NULL,
    format('%s Credits earned streaming live', _net));

  INSERT INTO public.platform_earnings (request_id, spotter_id, gross_amount, fee_amount)
  VALUES (NULL, _row.host_id, _rate, _fee);

  UPDATE public.stream_sessions AS session
  SET minutes_billed = session.minutes_billed + 1,
      credits_spent = session.credits_spent + _rate,
      credits_earned = session.credits_earned + _net
  WHERE session.id = _session_id
  RETURNING session.minutes_billed, session.credits_spent, session.credits_earned
  INTO minutes_billed, credits_spent, host_earned;

  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.bill_stream_minute(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.bill_stream_minute(uuid) TO authenticated;