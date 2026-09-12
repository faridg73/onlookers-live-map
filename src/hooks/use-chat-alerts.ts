import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { listUnreadChatAlerts, markAlertRead, type ChatNotification } from "@/lib/notifications";

/**
 * Live count of unread chat messages waiting for the signed-in person, used for
 * the badge on the Chats tab. Nearby-bounty alerts pop up as a toast instead.
 */
export function useChatAlerts() {
  const { user } = useAuth();
  const [all, setAll] = useState<ChatNotification[]>([]);
  const announced = useRef<Set<string>>(new Set());

  const load = useCallback(async () => {
    if (!user) {
      setAll([]);
      return;
    }
    setAll(await listUnreadChatAlerts());
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`notifications-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        () => void load(),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user, load]);

  // Nearby bounty pings surface once, right away.
  useEffect(() => {
    for (const alert of all) {
      if (alert.kind !== "bounty_nearby" || announced.current.has(alert.id)) continue;
      announced.current.add(alert.id);
      toast(alert.preview, { duration: 8000 });
      void markAlertRead(alert.id);
    }
  }, [all]);

  const alerts = useMemo(() => all.filter((a) => a.kind === "chat_message"), [all]);

  return { alerts, unread: alerts.length, reload: load };
}
