CREATE OR REPLACE FUNCTION public.mark_payout_method_changed()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT'
     OR NEW.stripe_account_id IS DISTINCT FROM OLD.stripe_account_id
     OR (NEW.payouts_enabled AND NOT COALESCE(OLD.payouts_enabled,false)) THEN
    PERFORM set_config('app.trusted_write', 'on', true);
    UPDATE public.profiles SET payout_method_changed_at = now() WHERE id = NEW.user_id;
    PERFORM set_config('app.trusted_write', 'off', true);
    INSERT INTO public.payout_security_logs (user_id, event_type, details)
      VALUES (NEW.user_id, 'payout_method_changed', jsonb_build_object('account', NEW.stripe_account_id));
  END IF;
  RETURN NEW;
END $function$;

INSERT INTO public.payout_accounts (user_id, stripe_account_id, environment, payouts_enabled, details_submitted, requirements_note)
VALUES ('e6b39d51-9026-4662-8950-738c09b929be', 'acct_1UKlwYDgcWIWuAlt', 'sandbox', true, true, '')
ON CONFLICT (user_id) DO UPDATE SET stripe_account_id = EXCLUDED.stripe_account_id, environment = 'sandbox', payouts_enabled = true, details_submitted = true, requirements_note = '';