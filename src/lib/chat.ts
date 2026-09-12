import { supabase } from "@/integrations/supabase/client";
import type { LiveRequest } from "@/lib/onlooker";

export type ChatMessage = {
  id: string;
  request_key: string;
  sender_id: string;
  body: string;
  created_at: string;
  media_url: string | null;
  media_type: string | null;
};

const BUCKET = "chat-attachments";

/** Uploads a photo or video clip for a chat message and returns its stored path. */
export async function uploadChatAttachment(key: string, file: File) {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Sign in to send an attachment.");
  if (file.size > 200 * 1024 * 1024) throw new Error("That file is larger than 200 MB.");

  const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
  const path = `${auth.user.id}/${key}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw error;
  return { path, kind: file.type.startsWith("video/") ? "video" : "image" };
}

/** Short-lived viewing links for every message that carries an attachment. */
export async function attachmentUrls(messages: ChatMessage[]) {
  const paths = messages.filter((m) => m.media_url).map((m) => m.media_url as string);
  if (paths.length === 0) return {};
  const { data } = await supabase.storage.from(BUCKET).createSignedUrls(paths, 60 * 60);
  const out: Record<string, string> = {};
  for (const row of data ?? []) {
    if (row.path && row.signedUrl) out[row.path] = row.signedUrl;
  }
  return out;
}

/**
 * A bounty conversation is keyed by the saved request when there is one, so
 * both sides (requester and reporter) land in the same thread.
 */
export function chatKey(request: Pick<LiveRequest, "id" | "dbId">) {
  return request.dbId ?? request.id;
}

/** True once this person is a participant on the bounty (requester or reporter). */
export async function canChat(key: string, userId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc("can_chat_on_request", {
    _request_key: key,
    _user_id: userId,
  });
  if (error) return false;
  return Boolean(data);
}

export async function listMessages(key: string): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from("request_messages")
    .select("*")
    .eq("request_key", key)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as ChatMessage[];
}

export async function sendMessage(key: string, body: string) {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Sign in to send a message.");
  const { error } = await supabase
    .from("request_messages")
    .insert({ request_key: key, sender_id: auth.user.id, body: body.trim() });
  if (error) throw error;
}

/** Timestamp of the last time this person opened the thread. */
export async function readMarker(key: string): Promise<string | null> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;
  const { data } = await supabase
    .from("request_chat_reads")
    .select("last_read_at")
    .eq("request_key", key)
    .eq("user_id", auth.user.id)
    .maybeSingle();
  return data?.last_read_at ?? null;
}

export async function markRead(key: string) {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return;
  await supabase
    .from("request_chat_reads")
    .upsert(
      { user_id: auth.user.id, request_key: key, last_read_at: new Date().toISOString() },
      { onConflict: "user_id,request_key" },
    );
}

export function countUnread(messages: ChatMessage[], myId: string, lastReadAt: string | null) {
  const since = lastReadAt ? new Date(lastReadAt).getTime() : 0;
  return messages.filter(
    (m) => m.sender_id !== myId && new Date(m.created_at).getTime() > since,
  ).length;
}
