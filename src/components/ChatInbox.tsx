import { useCallback, useEffect, useState } from "react";
import { Inbox, Loader2, MapPin } from "lucide-react";
import { ChatDrawer, ChatStatusBadge, chatStage } from "@/components/ChatDrawer";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/hooks/use-auth";
import { listChatThreads, type ChatThread } from "@/lib/chat-threads";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

function agoLabel(iso: string) {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  if (mins < 1440) return `${Math.floor(mins / 60)}h`;
  return `${Math.floor(mins / 1440)}d`;
}

/** Overview of every bounty conversation, opened from the nav chat button. */
export function ChatInbox({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<ChatThread | null>(null);

  const load = useCallback(async () => {
    if (!user) {
      setThreads([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      setThreads(await listChatThreads());
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (open) void load();
  }, [open, load]);

  // Keep the list fresh while it is on screen.
  useEffect(() => {
    if (!open || !user) return;
    const channel = supabase
      .channel("inbox-messages")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "request_messages" },
        () => void load(),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [open, user, load]);

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side={isMobile ? "bottom" : "right"}
          className={cn(
            "flex flex-col gap-0 border-border bg-surface p-0",
            isMobile ? "h-[80dvh] rounded-t-3xl" : "h-full w-full !max-w-md sm:!max-w-md",
          )}
        >
          <div className="shrink-0 border-b border-border px-4 pb-3 pt-4">
            {isMobile && (
              <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-border" aria-hidden />
            )}
            <SheetTitle className="flex items-center gap-2 font-display text-lg font-extrabold tracking-tight text-foreground">
              <Inbox className="size-4 text-signal" /> Inbox
            </SheetTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              Your conversations with requesters and hunters.
            </p>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]">
            {loading ? (
              <div className="flex justify-center py-10 text-muted-foreground">
                <Loader2 className="size-5 animate-spin" />
              </div>
            ) : !user ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                Sign in to see your messages.
              </p>
            ) : threads.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                No conversations yet. Chat opens as soon as a bounty is claimed.
              </p>
            ) : (
              <ul className="space-y-2">
                {threads.map((thread) => (
                  <li key={thread.key}>
                    <button
                      type="button"
                      onClick={() => setActive(thread)}
                      className="grid w-full grid-cols-[minmax(0,1fr)_auto] gap-3 rounded-2xl border border-border bg-surface-raised p-3 text-left transition-colors hover:border-signal"
                    >
                      <span className="min-w-0">
                        <span className="flex items-center gap-2">
                          <span className="truncate text-sm font-bold text-foreground">
                            {thread.title}
                          </span>
                          {thread.unread > 0 && (
                            <span className="min-w-4 rounded-full bg-destructive px-1 text-center text-[0.6rem] font-extrabold leading-4 text-destructive-foreground">
                              {thread.unread > 9 ? "9+" : thread.unread}
                            </span>
                          )}
                        </span>
                        {thread.place && (
                          <span className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                            <MapPin className="size-3 shrink-0" />
                            <span className="truncate">{thread.place}</span>
                          </span>
                        )}
                        <span className="mt-1 block truncate text-xs text-muted-foreground">
                          {thread.lastBody}
                        </span>
                        <span className="mt-2 block">
                          <ChatStatusBadge stage={chatStage(thread.status)} />
                        </span>
                      </span>
                      <span className="shrink-0 text-right">
                        <span className="block font-display text-base font-extrabold text-signal">
                          ${thread.bounty}
                        </span>
                        <span className="mt-1 block text-[0.68rem] text-muted-foreground">
                          {agoLabel(thread.lastAt)}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {active && (
        <ChatDrawer
          requestKey={active.key}
          title={active.title}
          bounty={active.bounty}
          status={active.status}
          open
          onOpenChange={(next) => {
            if (!next) {
              setActive(null);
              void load();
            }
          }}
        />
      )}
    </>
  );
}
