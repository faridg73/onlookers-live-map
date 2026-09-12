import { supabase } from "@/integrations/supabase/client";

export type ChatThread = {
  key: string;
  title: string;
  place: string;
  bounty: number;
  status: string;
  lastBody: string;
  lastAt: string;
  unread: number;
};

/**
 * Every bounty conversation the signed-in person takes part in, newest first.
 * Row access is already limited to participants by the database, so whatever
 * comes back is safe to show.
 */
export async function listChatThreads(): Promise<ChatThread[]> {
  const { data: auth } = await supabase.auth.getUser();
  const me = auth.user?.id;
  if (!me) return [];

  const { data: messages } = await supabase
    .from("request_messages")
    .select("request_key, sender_id, body, media_type, created_at")
    .order("created_at", { ascending: false })
    .limit(400);
  if (!messages || messages.length === 0) return [];

  const latest = new Map<string, (typeof messages)[number]>();
  for (const row of messages) {
    if (!latest.has(row.request_key)) latest.set(row.request_key, row);
  }
  const keys = [...latest.keys()];

  const [{ data: requests }, { data: reads }] = await Promise.all([
    supabase
      .from("requests")
      .select("id, prompt, location_name, bounty_amount, status")
      .in("id", keys),
    supabase.from("request_chat_reads").select("request_key, last_read_at").eq("user_id", me),
  ]);

  const readAt = new Map((reads ?? []).map((r) => [r.request_key, r.last_read_at]));
  const info = new Map((requests ?? []).map((r) => [r.id, r]));

  const threads = keys.map((key) => {
    const last = latest.get(key)!;
    const request = info.get(key);
    const since = readAt.get(key) ? new Date(readAt.get(key) as string).getTime() : 0;
    const unread = messages.filter(
      (m) =>
        m.request_key === key &&
        m.sender_id !== me &&
        new Date(m.created_at).getTime() > since,
    ).length;

    return {
      key,
      title: request?.prompt ?? "Bounty chat",
      place: request?.location_name ?? "",
      bounty: Number(request?.bounty_amount ?? 0),
      status: request?.status ?? "open",
      lastBody: last.body?.trim() || (last.media_type === "video" ? "Sent a clip" : "Sent a photo"),
      lastAt: last.created_at,
      unread,
    } satisfies ChatThread;
  });

  return threads.sort((a, b) => new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime());
}
