import { useEffect, useRef, useState } from "react";
import { ImagePlus, Loader2, Lock, MessageCircle, Send, X } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { useBountyChat } from "@/hooks/use-bounty-chat";
import { chatKey, uploadChatAttachment } from "@/lib/chat";
import type { LiveRequest } from "@/lib/onlooker";
import { cn } from "@/lib/utils";

function timeLabel(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

/**
 * SMS-style thread between the requester and the reporter on the bounty. It
 * only unlocks once the bounty is claimed or a clip has been submitted.
 */
export function BountyChat({ request }: { request: LiveRequest }) {
  const { user } = useAuth();
  const key = chatKey(request);
  const { messages, unread, loading, locked, send, seen } = useBountyChat(key, user?.id);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "nearest" });
    if (!locked && messages.length > 0 && unread > 0) void seen();
  }, [messages, locked, unread, seen]);

  if (!user || loading) return null;

  if (locked) {
    return (
      <div className="mt-3 flex items-center gap-2 rounded-2xl border border-border bg-surface-raised px-3 py-2.5 text-xs text-muted-foreground">
        <Lock className="size-3.5" /> Chat opens once a reporter claims this bounty.
      </div>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    try {
      await send(body);
      setDraft("");
      await seen();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Message not sent.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className="mt-3 rounded-2xl border border-border bg-surface-raised p-3"
    >
      <div className="flex items-center gap-2 text-[0.65rem] font-bold uppercase tracking-[0.14em] text-foreground">
        <MessageCircle className="size-3.5 text-signal" /> Messages
        {unread > 0 && (
          <span className="rounded-full bg-signal px-2 py-0.5 text-[0.6rem] font-extrabold text-signal-foreground">
            {unread} new
          </span>
        )}
      </div>

      <div className="mt-3 max-h-56 space-y-2 overflow-y-auto pr-1">
        {messages.length === 0 && (
          <p className="py-4 text-center text-xs text-muted-foreground">
            No messages yet — say hello and share the details.
          </p>
        )}
        {messages.map((m) => {
          const mine = m.sender_id === user.id;
          return (
            <div key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
              <div
                className={cn(
                  "max-w-[80%] rounded-2xl px-3 py-2 text-sm",
                  mine
                    ? "bg-signal font-medium text-signal-foreground"
                    : "border border-border bg-surface text-foreground",
                )}
              >
                <p className="whitespace-pre-wrap break-words">{m.body}</p>
                <p
                  className={cn(
                    "mt-1 text-[0.6rem]",
                    mine ? "text-signal-foreground/70" : "text-muted-foreground",
                  )}
                >
                  {timeLabel(m.created_at)}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      <form onSubmit={submit} className="mt-3 flex items-center gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Type a message…"
          maxLength={2000}
          className="min-w-0 flex-1 rounded-full border border-border bg-surface px-4 py-2 text-sm text-foreground outline-none focus:border-signal"
        />
        <button
          type="submit"
          aria-label="Send message"
          disabled={sending || draft.trim().length === 0}
          className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-signal text-signal-foreground disabled:opacity-40"
        >
          {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
        </button>
      </form>
    </div>
  );
}
