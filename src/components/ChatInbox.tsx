// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ArrowRight, CircleDollarSign, Inbox, Loader2, MapPin, MessageCircle, Radio, Users } from "lucide-react";
import { toast } from "sonner";
import { ChatDrawer, ChatStatusBadge, chatStage } from "@/components/ChatDrawer";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/hooks/use-auth";
import { listChatThreads, type ChatThread } from "@/lib/chat-threads";
import { sendMessage } from "@/lib/chat";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

type InboxTab = "bounties" | "streamers";

const QUICK_REPLIES = ["I'm heading there now", "ETA 5 mins"] as const;

function agoLabel(iso: string) {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  if (mins < 1440) return `${Math.floor(mins / 60)}h`;
  const days = Math.floor(mins / 1440);
  if (days < 7) return `${days}d`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
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
  const navigate = useNavigate();
  const { user } = useAuth();
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<ChatThread | null>(null);
  const [tab, setTab] = useState<InboxTab>("bounties");
  const [sendingQuick, setSendingQuick] = useState<string | null>(null);

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
      .channel(`inbox-messages-${Math.random().toString(36).slice(2, 10)}`)
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

  const activeThreads = useMemo(
    () => threads.filter((thread) => chatStage(thread.status) === "active"),
    [threads],
  );
  const shownThreads = tab === "streamers" ? activeThreads : threads;
  const unreadTotal = threads.reduce((total, thread) => total + thread.unread, 0);

  async function sendQuickReply(thread: ChatThread, body: (typeof QUICK_REPLIES)[number]) {
    const pendingKey = `${thread.key}:${body}`;
    setSendingQuick(pendingKey);
    try {
      await sendMessage(thread.key, body);
      toast.success("Update sent to the chat.");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "That update could not be sent.");
    } finally {
      setSendingQuick(null);
    }
  }

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
            <div className="flex items-start justify-between gap-3 pr-7">
              <div>
                <SheetTitle className="flex items-center gap-2 font-display text-lg font-extrabold tracking-tight text-foreground">
                  <Inbox className="size-4 text-signal" /> Live Inbox
                </SheetTitle>
                <p className="mt-1 text-xs text-muted-foreground">
                  Coordinate bounties as they happen.
                </p>
              </div>
              {user && unreadTotal > 0 && (
                <span className="rounded-full bg-signal px-2.5 py-1 text-[0.62rem] font-extrabold text-signal-foreground">
                  {unreadTotal} new
                </span>
              )}
            </div>

            <div className="mt-4 grid grid-cols-2 rounded-lg bg-background p-1">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setTab("bounties")}
                className={cn(
                  "h-9 rounded-md px-2 text-xs font-bold",
                  tab === "bounties" && "bg-surface-raised text-signal",
                )}
              >
                <MessageCircle className="size-3.5" /> Bounty Discussions
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setTab("streamers")}
                className={cn(
                  "h-9 rounded-md px-2 text-xs font-bold",
                  tab === "streamers" && "bg-surface-raised text-live",
                )}
              >
                <Radio className="size-3.5" /> Active Streamers
                <span className="relative ml-0.5 flex size-1.5" aria-hidden>
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-live opacity-70" />
                  <span className="relative inline-flex size-1.5 rounded-full bg-live" />
                </span>
              </Button>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]">
            {loading ? (
              <div className="flex justify-center py-10 text-muted-foreground">
                <Loader2 className="size-5 animate-spin" />
              </div>
            ) : !user ? (
              <SignedOutInboxPreview
                tab={tab}
                onSignIn={() => {
                  onOpenChange(false);
                  void navigate({ to: "/auth" });
                }}
              />
            ) : shownThreads.length === 0 ? (
              <div className="flex min-h-64 flex-col items-center justify-center px-5 text-center">
                <span className="grid size-12 place-items-center rounded-full border border-border bg-surface-raised text-signal">
                  {tab === "streamers" ? <Radio className="size-5" /> : <MessageCircle className="size-5" />}
                </span>
                <p className="mt-4 text-sm font-bold text-foreground">
                  {tab === "streamers" ? "No active stream chats" : "No bounty discussions yet"}
                </p>
                <p className="mt-1 max-w-64 text-xs leading-relaxed text-muted-foreground">
                  {tab === "streamers"
                    ? "Live coordination appears here when a hunter claims your bounty."
                    : "Your first conversation opens when a bounty is claimed."}
                </p>
              </div>
            ) : (
              <ul className="space-y-2">
                {shownThreads.map((thread) => (
                  <li key={thread.key}>
                    <article className="rounded-xl border border-border bg-surface-raised p-3 transition-colors hover:border-signal/70">
                      <button
                        type="button"
                        onClick={() => setActive(thread)}
                        className="grid w-full grid-cols-[auto_minmax(0,1fr)_auto] gap-3 text-left"
                      >
                        <span className="relative grid size-10 shrink-0 place-items-center rounded-full bg-background font-display text-sm font-extrabold text-foreground">
                          {thread.title.trim().charAt(0).toUpperCase() || "B"}
                          {chatStage(thread.status) === "active" && (
                            <span className="absolute bottom-0 right-0 size-3 rounded-full border-2 border-surface-raised bg-live" aria-label="Live now" />
                          )}
                        </span>
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

                      {chatStage(thread.status) === "active" && (
                        <div className="mt-3 flex gap-2 overflow-x-auto border-t border-border pt-3">
                          {QUICK_REPLIES.map((reply) => {
                            const pendingKey = `${thread.key}:${reply}`;
                            return (
                              <Button
                                key={reply}
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={sendingQuick !== null}
                                onClick={() => void sendQuickReply(thread, reply)}
                                className="h-8 shrink-0 rounded-full border-border bg-background px-3 text-[0.68rem] font-bold text-foreground hover:border-signal hover:text-signal"
                              >
                                {sendingQuick === pendingKey && <Loader2 className="size-3 animate-spin" />}
                                {reply}
                              </Button>
                            );
                          })}
                        </div>
                      )}
                    </article>
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

function SignedOutInboxPreview({ tab, onSignIn }: { tab: InboxTab; onSignIn: () => void }) {
  return (
    <div className="mx-auto flex min-h-full max-w-sm flex-col px-1 py-2">
      <section className="overflow-hidden rounded-xl border border-border bg-surface-raised">
        <div className="border-b border-border bg-background px-4 py-3">
          <p className="flex items-center gap-2 text-[0.65rem] font-extrabold uppercase tracking-[0.12em] text-live">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-live opacity-70" />
              <span className="relative inline-flex size-2 rounded-full bg-live" />
            </span>
            {tab === "streamers" ? "Live coordination" : "Bounty activity"}
          </p>
          <h3 className="mt-2 font-display text-xl font-extrabold text-foreground">
            Stay close to the action.
          </h3>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            Message hunters, share arrival updates, and follow every live request from claim to payout.
          </p>
        </div>

        <div className="grid grid-cols-2 divide-x divide-border">
          <div className="p-4">
            <CircleDollarSign className="size-5 text-signal" />
            <p className="mt-3 text-xs font-bold text-foreground">Bounty updates</p>
            <p className="mt-1 text-[0.68rem] leading-relaxed text-muted-foreground">
              Confirm details and keep the request moving.
            </p>
          </div>
          <div className="p-4">
            <Users className="size-5 text-live" />
            <p className="mt-3 text-xs font-bold text-foreground">Live presence</p>
            <p className="mt-1 text-[0.68rem] leading-relaxed text-muted-foreground">
              See when an onlooker is active and heading there.
            </p>
          </div>
        </div>
      </section>

      <div className="mt-5 px-2 text-center">
        <div className="flex flex-wrap items-center justify-center gap-1.5" aria-hidden>
          {["Stream is live", "Heading there now", "ETA 5 mins"].map((chip) => (
            <span
              key={chip}
              className="inline-flex h-7 items-center gap-1.5 rounded-full border border-border bg-background px-3 text-[0.65rem] font-bold text-muted-foreground"
            >
              <span
                className={cn(
                  "size-1.5 rounded-full",
                  chip === "Stream is live" ? "bg-live" : "bg-signal",
                )}
              />
              {chip}
            </span>
          ))}
        </div>
        <p className="mt-4 font-display text-base font-extrabold text-foreground">Your live inbox is waiting</p>
        <p className="mx-auto mt-1 max-w-xs text-xs leading-relaxed text-muted-foreground">
          Sign in to join bounty discussions and coordinate with active streamers in real time.
        </p>
        <Button type="button" onClick={onSignIn} className="mt-4 h-11 w-full rounded-lg font-extrabold">
          Sign in to join the conversation <ArrowRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}
