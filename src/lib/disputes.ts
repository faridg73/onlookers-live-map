import { supabase } from "@/integrations/supabase/client";

export type DisputeCase = {
  request_id: string;
  prompt: string;
  location_name: string;
  amount: number;
  status: string;
  dispute_reason: string;
  disputed_at: string | null;
  requester_id: string;
  spotter_id: string | null;
  is_moderator: boolean;
  evidence_count: number;
};

export type DisputeEvidence = {
  id: string;
  request_id: string;
  author_id: string;
  role: string;
  body: string;
  created_at: string;
};

/** Open disputes the signed-in person can see (their own, or all for moderators). */
export async function listDisputes(): Promise<DisputeCase[]> {
  const { data, error } = await supabase.rpc("list_disputes");
  if (error) throw error;
  return (data ?? []).map((row) => ({
    ...row,
    amount: Number(row.amount),
    evidence_count: Number(row.evidence_count ?? 0),
  })) as DisputeCase[];
}

export async function listEvidence(requestId: string): Promise<DisputeEvidence[]> {
  const { data, error } = await supabase
    .from("dispute_evidence")
    .select("id, request_id, author_id, role, body, created_at")
    .eq("request_id", requestId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as DisputeEvidence[];
}

export async function addEvidence(requestId: string, body: string, role: string): Promise<void> {
  const { data: session } = await supabase.auth.getUser();
  const userId = session.user?.id;
  if (!userId) throw new Error("Sign in to add evidence.");
  const { error } = await supabase
    .from("dispute_evidence")
    .insert({ request_id: requestId, author_id: userId, body, role });
  if (error) throw error;
}

/** Moderator decision: pay the reporter or refund the poster. */
export async function resolveDispute(requestId: string, awardSpotter: boolean): Promise<void> {
  const { error } = await supabase.rpc("resolve_dispute", {
    _request_id: requestId,
    _award_spotter: awardSpotter,
  });
  if (error) throw error;
}
