import { supabase } from "@/integrations/supabase/client";

export type ChatNotification = {
  id: string;
  request_key: string;
  sender_id: string | null;
  preview: string;
  read_at: string | null;
  created_at: string;
};

/** Unread chat alerts for the signed-in person, newest first. */
export async function listUnreadChatAlerts(): Promise<ChatNotification[]> {
  const { data, error } = await supabase
    .from("notifications")
    .select("id, request_key, sender_id, preview, read_at, created_at")
    .is("read_at", null)
    .eq("kind", "chat_message")
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) return [];
  return (data ?? []) as ChatNotification[];
}

/** Clears the alerts for one conversation once it has been opened. */
export async function markChatAlertsRead(requestKey: string) {
  await supabase.rpc("mark_chat_notifications_read", { _request_key: requestKey });
}
