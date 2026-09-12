import { supabase } from "@/integrations/supabase/client";
import { acceptBountyVideo } from "@/lib/bounty-videos";
import { sendMessage } from "@/lib/chat";

/** Exact wording posted into the thread once a bounty is approved and paid. */
export const APPROVED_MESSAGE =
  "✅ Bounty approved! The payment has been released to the Hunter. This chat is now closed.";
export const REVISION_PREFIX = "🔁 Revision requested:";

/** System notices are ordinary messages that carry one of these markers. */
export function isSystemMessage(body: string) {
  return body.startsWith("✅ Bounty approved!") || body.startsWith(REVISION_PREFIX);
}

export function isApprovalMessage(body: string) {
  return body.startsWith("✅ Bounty approved!");
}

export type ChatReview = {
  /** True when the signed-in person posted the bounty (the one who approves). */
  isRequester: boolean;
  /** Clip waiting on a decision, if there is one. */
  videoId: string | null;
  bounty: number;
  status: string;
  /** Approved or otherwise finished — the thread becomes a read-only log. */
  closed: boolean;
};

/** Who the viewer is on this bounty and whether a clip is awaiting review. */
export async function fetchChatReview(requestKey: string): Promise<ChatReview> {
  const { data: auth } = await supabase.auth.getUser();
  const me = auth.user?.id;
  const empty: ChatReview = {
    isRequester: false,
    videoId: null,
    bounty: 0,
    status: "open",
    closed: false,
  };
  if (!me) return empty;

  const { data: request } = await supabase
    .from("requests")
    .select("requester_id, bounty_amount, status")
    .eq("id", requestKey)
    .maybeSingle();

  const { data: videos } = await supabase
    .from("bounty_videos")
    .select("id, accepted_at, uploader_id, bounty_amount, created_at")
    .eq("request_id", requestKey)
    .order("created_at", { ascending: false });

  const rows = videos ?? [];
  const paid = rows.find((v) => v.accepted_at);
  const pending = rows.find((v) => !v.accepted_at && v.uploader_id !== me);
  const status = paid ? "completed" : (request?.status ?? "open");

  return {
    isRequester: request?.requester_id === me,
    videoId: pending?.id ?? null,
    bounty: Number(request?.bounty_amount ?? pending?.bounty_amount ?? 0),
    status,
    closed: Boolean(paid) || status === "completed" || status === "expired",
  };
}

/** Releases escrow to the hunter, closes the bounty, and posts the notice. */
export async function approveAndPay(videoId: string, requestKey: string): Promise<number> {
  const paid = await acceptBountyVideo(videoId);
  try {
    await sendMessage(requestKey, APPROVED_MESSAGE);
  } catch {
    // The payout already went through; a missing notice must not look like a failure.
  }
  return paid;
}

/** Asks the hunter for another take without touching the escrowed money. */
export async function requestRevision(requestKey: string, note: string) {
  const detail = note.trim() || "Please send another take of this bounty.";
  await sendMessage(requestKey, `${REVISION_PREFIX} ${detail}`);
}
