ALTER TABLE public.dmca_notices
ADD COLUMN reason_code text NOT NULL DEFAULT 'other_policy_violation'
CHECK (reason_code IN (
  'gps_mismatch',
  'timestamp_implausible',
  'duplicate_content',
  'individual_targeting_confirmed',
  'private_conversation_captured',
  'private_property_trespass',
  'minor_in_frame',
  'active_emergency_danger',
  'other_policy_violation'
));