import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  attachmentUrls,
  canChat,
  countUnread,
  listMessages,
  markRead,
  readMarker,
  sendMessage,
  type ChatMessage,
} from "@/lib/chat";

/**
 * Live message history for one bounty thread. Returns `locked: true` when the
 * signed-in person is not a participant yet (nobody has claimed the bounty, or
 * they are just browsing), which is how the chat box stays hidden.
 */
export function useBountyChat(key: string, userId: string | null | undefined) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [lastReadAt, setLastReadAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [locked, setLocked] = useState(true);

  const load = useCallback(async () => {
    if (!userId) {
      setLocked(true);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const allowed = await canChat(key, userId);
      setLocked(!allowed);
      if (!allowed) {
        setMessages([]);
        return;
      }
      const [rows, marker] = await Promise.all([listMessages(key), readMarker(key)]);
      setMessages(rows);
      setLastReadAt(marker);
    } catch {
      setLocked(true);
    } finally {
      setLoading(false);
    }
  }, [key, userId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`request-messages-${key}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "request_messages",
          filter: `request_key=eq.${key}`,
        },
        (payload) => {
          const row = payload.new as ChatMessage;
          setMessages((prev) => (prev.some((m) => m.id === row.id) ? prev : [...prev, row]));
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [key, userId]);

  const send = useCallback(
    async (body: string) => {
      await sendMessage(key, body);
      const rows = await listMessages(key);
      setMessages(rows);
    },
    [key],
  );

  const seen = useCallback(async () => {
    await markRead(key);
    setLastReadAt(new Date().toISOString());
  }, [key]);

  const unread = userId ? countUnread(messages, userId, lastReadAt) : 0;

  return { messages, unread, loading, locked, send, seen, reload: load };
}
