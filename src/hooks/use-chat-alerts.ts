import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { listUnreadChatAlerts, type ChatNotification } from "@/lib/notifications";

/**
 * Live count of unread chat messages waiting for the signed-in person, used for
 * the badge on the Profile tab.
 */
export function useChatAlerts() {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<ChatNotification[]>([]);

  const load = useCallback(async () => {
    if (!user) {
      setAlerts([]);
      return;
    }
    setAlerts(await listUnreadChatAlerts());
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

  return { alerts, unread: alerts.length, reload: load };
}
