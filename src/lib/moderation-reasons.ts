export const MODERATION_REASONS = [
  { code: "gps_mismatch", label: "Location does not match", description: "The capture appears to come from a different place than claimed." },
  { code: "timestamp_implausible", label: "Time does not match", description: "The capture time appears inconsistent with when it was posted." },
  { code: "duplicate_content", label: "Duplicate or reused content", description: "The same or substantially similar media has already been posted." },
  { code: "individual_targeting_confirmed", label: "Targeting an individual", description: "The content is focused on tracking, identifying or harassing a person." },
  { code: "private_conversation_captured", label: "Private conversation captured", description: "A conversation with a reasonable expectation of privacy was recorded." },
  { code: "private_property_trespass", label: "Private property or trespass", description: "The capture appears to involve unauthorized access to private property." },
  { code: "minor_in_frame", label: "Minor shown in the capture", description: "A child or teenager is identifiable in the content." },
  { code: "active_emergency_danger", label: "Active emergency or danger", description: "The content may show an immediate safety risk or active emergency." },
  { code: "other_policy_violation", label: "Other policy violation", description: "Another safety, privacy, authenticity or platform policy concern." },
] as const;

export type ModerationReasonCode = (typeof MODERATION_REASONS)[number]["code"];

export function moderationReasonLabel(code: string) {
  return MODERATION_REASONS.find((reason) => reason.code === code)?.label ?? "Other policy violation";
}