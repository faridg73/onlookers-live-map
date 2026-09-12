CREATE TABLE IF NOT EXISTS public.alert_preferences (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  push_enabled boolean NOT NULL DEFAULT true,
  sms_enabled boolean NOT NULL DEFAULT false,
  email_enabled boolean NOT NULL DEFAULT false,
  phone text NOT NULL DEFAULT '',
  radius_miles numeric NOT NULL DEFAULT 5,
  area_label text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.alert_preferences TO authenticated;
GRANT ALL ON public.alert_preferences TO service_role;

ALTER TABLE public.alert_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own alert preferences"
ON public.alert_preferences FOR ALL TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_alert_preferences_updated_at
BEFORE UPDATE ON public.alert_preferences
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.notify_nearby_hunters()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _preview text;
BEGIN
  _preview := '📍 New Bounty Nearby! ' || NEW.prompt
    || COALESCE(' at ' || NULLIF(NEW.location_name, ''), '')
    || COALESCE(' (' || NULLIF(NEW.category, '') || ')', '')
    || ' is available for $' || trim(to_char(NEW.bounty_amount, 'FM999999990.00')) || '.';

  INSERT INTO public.notifications (user_id, kind, request_key, sender_id, preview)
  SELECT h.user_id, 'bounty_nearby', NEW.id::text, NEW.requester_id, _preview
  FROM public.hunter_locations h
  LEFT JOIN public.alert_preferences p ON p.user_id = h.user_id
  WHERE h.user_id <> NEW.requester_id
    AND h.updated_at > now() - interval '7 days'
    AND COALESCE(p.push_enabled, true)
    AND (
      3958.8 * 2 * asin(
        sqrt(
          power(sin(radians(h.latitude - NEW.latitude) / 2), 2)
          + cos(radians(NEW.latitude)) * cos(radians(h.latitude))
            * power(sin(radians(h.longitude - NEW.longitude) / 2), 2)
        )
      )
    ) <= COALESCE(p.radius_miles, 5);

  RETURN NEW;
END;
$$;