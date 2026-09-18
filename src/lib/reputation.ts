import { supabase } from "@/integrations/supabase/client";

/** Passive, low-risk actions that earn reputation points. */
export type ReputationAction = "flag_outdated" | "validate_marker" | "safety_tutorial";

export const REPUTATION_POINTS: Record<ReputationAction, number> = {
  flag_outdated: 2,
  validate_marker: 3,
  safety_tutorial: 10,
};

export const REPUTATION_LABELS: Record<ReputationAction, string> = {
  flag_outdated: "Flagged an outdated post",
  validate_marker: "Validated a marker as accurate",
  safety_tutorial: "Finished the safety tutorial",
};

/**
 * Records one reputation award. The backend allows a single award per action per
 * item and caps the number of awards per day, so repeat taps are harmless.
 * Returns the new total, or null when nobody is signed in.
 */
export async function awardReputation(
  action: ReputationAction,
  subject = "",
): Promise<number | null> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;
  const { data, error } = await supabase.rpc("award_reputation", {
    _action: action,
    _subject: subject,
  });
  if (error) return null;
  const total = Number(data);
  return Number.isFinite(total) ? total : null;
}

/** Total reputation for the signed-in member. */
export async function fetchMyReputation(): Promise<number> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return 0;
  const { data, error } = await supabase.rpc("reputation_total", { _user_id: auth.user.id });
  const total = Number(data);
  if (error || !Number.isFinite(total)) return 0;
  return total;
}
