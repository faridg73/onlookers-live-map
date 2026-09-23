CREATE TABLE public.sms_delivery_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider TEXT NOT NULL DEFAULT 'signalhouse',
  message_id TEXT,
  status TEXT,
  recipient TEXT,
  error_code TEXT,
  error_message TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
GRANT ALL ON public.sms_delivery_events TO service_role;
ALTER TABLE public.sms_delivery_events ENABLE ROW LEVEL SECURITY;
CREATE INDEX sms_delivery_events_message_id_idx ON public.sms_delivery_events (message_id);
CREATE INDEX sms_delivery_events_created_at_idx ON public.sms_delivery_events (created_at DESC);