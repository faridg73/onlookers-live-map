CREATE TABLE public.pro_teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL UNIQUE REFERENCES public.pro_accounts(user_id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.pro_teams TO authenticated;
GRANT ALL ON public.pro_teams TO service_role;
ALTER TABLE public.pro_teams ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.pro_team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.pro_teams(id) ON DELETE CASCADE,
  email text NOT NULL,
  user_id uuid,
  member_type text NOT NULL DEFAULT 'staff',
  status text NOT NULL DEFAULT 'invited',
  joined_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pro_team_members_type_chk CHECK (member_type IN ('staff','hunter')),
  CONSTRAINT pro_team_members_status_chk CHECK (status IN ('invited','active')),
  UNIQUE (team_id, email, member_type)
);
CREATE INDEX pro_team_members_user_idx ON public.pro_team_members(user_id);
GRANT SELECT ON public.pro_team_members TO authenticated;
GRANT ALL ON public.pro_team_members TO service_role;
ALTER TABLE public.pro_team_members ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_team_owner(_team_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.pro_teams WHERE id = _team_id AND owner_id = auth.uid())
$$;
CREATE OR REPLACE FUNCTION public.is_team_member(_team_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.pro_team_members WHERE team_id = _team_id AND user_id = auth.uid() AND status = 'active')
$$;
REVOKE EXECUTE ON FUNCTION public.is_team_owner(uuid), public.is_team_member(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_team_owner(uuid), public.is_team_member(uuid) TO authenticated;

CREATE POLICY "Team owner or self sees members" ON public.pro_team_members FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_team_owner(team_id));
CREATE POLICY "Owner and members see team" ON public.pro_teams FOR SELECT TO authenticated
  USING (owner_id = auth.uid() OR public.is_team_member(id));

CREATE TRIGGER pro_teams_updated_at BEFORE UPDATE ON public.pro_teams FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER pro_team_members_updated_at BEFORE UPDATE ON public.pro_team_members FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.escrows ADD COLUMN payer_id uuid;

CREATE OR REPLACE FUNCTION public.team_payer_for(_user_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT t.owner_id
  FROM public.pro_team_members m
  JOIN public.pro_teams t ON t.id = m.team_id
  JOIN public.pro_accounts a ON a.user_id = t.owner_id AND a.plan = 'team'
  WHERE m.user_id = _user_id AND m.status = 'active' AND m.member_type = 'staff'
    AND t.owner_id <> _user_id
  ORDER BY m.joined_at NULLS LAST
  LIMIT 1
$$;
REVOKE EXECUTE ON FUNCTION public.team_payer_for(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.team_payer_for(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.escrow_hold_on_request()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_payer uuid;
BEGIN
  v_payer := COALESCE(public.team_payer_for(NEW.requester_id), NEW.requester_id);
  IF NEW.bounty_amount > 0 THEN
    PERFORM public.adjust_wallet(v_payer, -NEW.bounty_amount, 'escrow_hold', NEW.id,
      CASE WHEN v_payer <> NEW.requester_id THEN 'Team bounty held in escrow' ELSE 'Bounty held in escrow' END);
  END IF;
  INSERT INTO public.escrows (request_id, requester_id, payer_id, amount, status)
  VALUES (NEW.id, NEW.requester_id, v_payer, NEW.bounty_amount, 'held');
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.enforce_pro_visit_limit()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_plan text; v_period_start timestamptz; v_limit integer; v_used integer;
BEGIN
  IF NEW.category IS DISTINCT FROM 'realestate' THEN RETURN NEW; END IF;
  IF public.team_payer_for(NEW.requester_id) IS NOT NULL THEN RETURN NEW; END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(NEW.requester_id::text || ':pro-visits', 0));

  SELECT plan, COALESCE(visit_period_start, plan_updated_at, created_at), visits_used
    INTO v_plan, v_period_start, v_used
  FROM public.pro_accounts WHERE user_id = NEW.requester_id FOR UPDATE;
  IF NOT FOUND THEN RETURN NEW; END IF;

  v_limit := CASE v_plan WHEN 'starter' THEN 5 WHEN 'pro' THEN 20 WHEN 'team' THEN NULL ELSE 2 END;

  IF v_limit IS NOT NULL AND v_used >= v_limit THEN
    IF v_plan IN ('starter','pro') THEN
      RAISE EXCEPTION 'Your % plan includes % verified visits this month. Upgrade your plan or wait for your next billing month.', initcap(v_plan), v_limit USING ERRCODE = 'P0001';
    ELSE
      RAISE EXCEPTION 'You have used both free trial verified visits. Choose a Verified Visits plan to keep scheduling.' USING ERRCODE = 'P0001';
    END IF;
  END IF;

  UPDATE public.pro_accounts SET visits_used = visits_used + 1, visit_period_start = v_period_start
  WHERE user_id = NEW.requester_id;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.team_save(_name text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.pro_accounts WHERE user_id = auth.uid() AND plan = 'team') THEN
    RAISE EXCEPTION 'Shared team billing needs an active Team plan.';
  END IF;
  INSERT INTO public.pro_teams (owner_id, name) VALUES (auth.uid(), left(btrim(COALESCE(_name,'')), 80))
  ON CONFLICT (owner_id) DO UPDATE SET name = EXCLUDED.name
  RETURNING id INTO v_id;
  RETURN v_id;
END $$;

CREATE OR REPLACE FUNCTION public.team_invite(_email text, _member_type text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_team uuid; v_email text := lower(btrim(COALESCE(_email,''))); v_id uuid; v_count int;
BEGIN
  IF _member_type NOT IN ('staff','hunter') THEN RAISE EXCEPTION 'Choose staff or Onlooker.'; END IF;
  IF v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' OR length(v_email) > 254 THEN RAISE EXCEPTION 'Enter a valid email address.'; END IF;
  SELECT t.id INTO v_team FROM public.pro_teams t
    JOIN public.pro_accounts a ON a.user_id = t.owner_id AND a.plan = 'team'
    WHERE t.owner_id = auth.uid();
  IF v_team IS NULL THEN RAISE EXCEPTION 'Set up your team first (Team plan required).'; END IF;
  SELECT count(*) INTO v_count FROM public.pro_team_members WHERE team_id = v_team;
  IF v_count >= 500 THEN RAISE EXCEPTION 'Team roster limit reached — contact support.'; END IF;
  INSERT INTO public.pro_team_members (team_id, email, member_type)
  VALUES (v_team, v_email, _member_type)
  ON CONFLICT (team_id, email, member_type) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_id;
  RETURN v_id;
END $$;

CREATE OR REPLACE FUNCTION public.team_remove_member(_member_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  DELETE FROM public.pro_team_members m USING public.pro_teams t
  WHERE m.id = _member_id AND m.team_id = t.id AND (t.owner_id = auth.uid() OR m.user_id = auth.uid());
  IF NOT FOUND THEN RAISE EXCEPTION 'Member not found.'; END IF;
END $$;

CREATE OR REPLACE FUNCTION public.team_accept_invites()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_email text; v_n int;
BEGIN
  SELECT lower(email) INTO v_email FROM auth.users WHERE id = auth.uid() AND email_confirmed_at IS NOT NULL;
  IF v_email IS NULL THEN RETURN 0; END IF;
  UPDATE public.pro_team_members SET user_id = auth.uid(), status = 'active', joined_at = now()
  WHERE email = v_email AND status = 'invited';
  GET DIAGNOSTICS v_n = ROW_COUNT;
  RETURN v_n;
END $$;

CREATE OR REPLACE FUNCTION public.team_my_invites()
RETURNS TABLE(member_id uuid, team_name text, member_type text) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT m.id, COALESCE(NULLIF(t.name,''), 'An agency'), m.member_type
  FROM public.pro_team_members m JOIN public.pro_teams t ON t.id = m.team_id
  WHERE m.status = 'invited'
    AND m.email = (SELECT lower(email) FROM auth.users WHERE id = auth.uid() AND email_confirmed_at IS NOT NULL)
$$;

CREATE OR REPLACE FUNCTION public.team_wallet_summary()
RETURNS TABLE(team_id uuid, team_name text, is_owner boolean, plan_active boolean, balance numeric, spent_this_month numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT t.id, t.name, t.owner_id = auth.uid(), a.plan = 'team', p.wallet_balance,
    COALESCE((SELECT sum(e.amount) FROM public.escrows e
      WHERE e.payer_id = t.owner_id AND e.status NOT IN ('refunded')
        AND e.created_at >= date_trunc('month', now())), 0)
  FROM public.pro_teams t
  JOIN public.pro_accounts a ON a.user_id = t.owner_id
  JOIN public.profiles p ON p.id = t.owner_id
  WHERE t.owner_id = auth.uid()
     OR EXISTS (SELECT 1 FROM public.pro_team_members m WHERE m.team_id = t.id AND m.user_id = auth.uid() AND m.status = 'active' AND m.member_type = 'staff')
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.team_statement(_since timestamptz DEFAULT date_trunc('month', now()))
RETURNS TABLE(request_id uuid, created_at timestamptz, title text, place text, amount numeric, status text,
  posted_by text, hunter text, hunter_on_roster boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT e.request_id, e.created_at, left(r.prompt, 120), r.location_name, e.amount, e.status,
    COALESCE(NULLIF(pp.display_name,''), 'Team member'),
    COALESCE(NULLIF(hp.display_name,''), CASE WHEN e.spotter_id IS NULL THEN '' ELSE 'Onlooker' END),
    EXISTS (SELECT 1 FROM public.pro_team_members m JOIN public.pro_teams t2 ON t2.id = m.team_id
            WHERE t2.owner_id = auth.uid() AND m.member_type = 'hunter' AND m.user_id = e.spotter_id)
  FROM public.escrows e
  JOIN public.requests r ON r.id = e.request_id
  LEFT JOIN public.profiles pp ON pp.id = e.requester_id
  LEFT JOIN public.profiles hp ON hp.id = e.spotter_id
  WHERE e.payer_id = auth.uid() AND e.created_at >= _since
    AND EXISTS (SELECT 1 FROM public.pro_teams t WHERE t.owner_id = auth.uid())
  ORDER BY e.created_at DESC
  LIMIT 500
$$;

REVOKE EXECUTE ON FUNCTION public.team_save(text), public.team_invite(text,text), public.team_remove_member(uuid),
  public.team_accept_invites(), public.team_my_invites(), public.team_wallet_summary(), public.team_statement(timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.team_save(text), public.team_invite(text,text), public.team_remove_member(uuid),
  public.team_accept_invites(), public.team_my_invites(), public.team_wallet_summary(), public.team_statement(timestamptz) TO authenticated;

DO $do$
DECLARE r record; def text; newdef text;
BEGIN
  FOR r IN SELECT p.oid FROM pg_proc p
    WHERE p.pronamespace = 'public'::regnamespace
      AND p.proname IN ('resolve_dispute','resolve_dispute_split','decline_site_pin_authorization','settle_escrows','escrow_refund_on_request_delete')
  LOOP
    def := pg_get_functiondef(r.oid);
    newdef := replace(def, 'adjust_wallet(e.requester_id', 'adjust_wallet(COALESCE(e.payer_id, e.requester_id)');
    newdef := replace(newdef, 'adjust_wallet(rec.requester_id', 'adjust_wallet(COALESCE(rec.payer_id, rec.requester_id)');
    newdef := replace(newdef, 'SELECT e.id, e.requester_id, e.amount, r.id AS request_id', 'SELECT e.id, e.requester_id, e.payer_id, e.amount, r.id AS request_id');
    IF newdef = def THEN RAISE EXCEPTION 'No refund path rewritten in function %', r.oid::regprocedure; END IF;
    EXECUTE newdef;
  END LOOP;
END
$do$;