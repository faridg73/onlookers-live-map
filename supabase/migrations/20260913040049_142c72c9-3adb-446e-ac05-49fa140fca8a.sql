CREATE TABLE public.moderation_flags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  title TEXT NOT NULL DEFAULT '',
  details TEXT NOT NULL DEFAULT '',
  matched_terms TEXT[] NOT NULL DEFAULT '{}',
  source TEXT NOT NULL DEFAULT 'request',
  reviewed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT ON public.moderation_flags TO authenticated;
GRANT ALL ON public.moderation_flags TO service_role;

ALTER TABLE public.moderation_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and moderators can read moderation flags"
ON public.moderation_flags FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

CREATE INDEX moderation_flags_created_at_idx ON public.moderation_flags (created_at DESC);