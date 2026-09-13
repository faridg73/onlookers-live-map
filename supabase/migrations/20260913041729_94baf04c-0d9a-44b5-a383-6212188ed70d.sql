CREATE TABLE public.moderation_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  request_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  triggered_keywords text[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'flagged_and_blocked',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT ON public.moderation_logs TO authenticated;
GRANT ALL ON public.moderation_logs TO service_role;

ALTER TABLE public.moderation_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own moderation logs"
  ON public.moderation_logs
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Staff can review all moderation logs"
  ON public.moderation_logs
  FOR SELECT
  TO authenticated
  USING (public.is_review_staff(auth.uid()));

CREATE TRIGGER update_moderation_logs_updated_at
  BEFORE UPDATE ON public.moderation_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();