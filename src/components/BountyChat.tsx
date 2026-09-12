import { useEffect, useRef, useState } from "react";
import { ImagePlus, Loader2, Lock, MessageCircle, Send, Sparkles, Video, X } from "lucide-react";
import { toast } from "sonner";
import { Confetti } from "@/components/Confetti";
import { VideoRecorder } from "@/components/VideoRecorder";
import { useAuth } from "@/hooks/use-auth";
import { useBountyChat } from "@/hooks/use-bounty-chat";
import { uploadChatAttachment } from "@/lib/chat";
import { compressVideo, MAX_CLIP_SECONDS, videoDuration } from "@/lib/video-compress";
import { isApprovalMessage, isSystemMessage } from "@/lib/chat-review";
import { cn } from "@/lib/utils";

function timeLabel(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

/**
 * SMS-style thread between the requester and the reporter on the bounty. It
 * only unlocks once the bounty is claimed or a clip has been submitted.
 *
 * `bare` drops the card chrome so the thread can fill the chat drawer.
 */
export function BountyChat({
  requestKey,
  bare = false,
  readOnly = false,
}: {
  requestKey: string;
  bare?: boolean;
  /** Approved bounties become a historical log: no typing, no attachments. */
  readOnly?: boolean;
}) {
  const { user } = useAuth();
  const key = requestKey;
  const { messages, mediaLinks, unread, loading, locked, send, seen } = useBountyChat(
    key,
    user?.id,
  );
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [pending, setPending] = useState<{ file: File; preview: string } | null>(null);
  const [celebrate, setCelebrate] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const lastApproval = useRef<string | null>(null);
  const settled = useRef(false);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "nearest" });
    if (!locked && messages.length > 0 && unread > 0) void seen();
  }, [messages, locked, unread, seen]);

  // Fire the celebration on both screens the moment the approval notice lands.
  useEffect(() => {
    if (loading) return;
    const firstPass = !settled.current;
    settled.current = true;
    const approval = [...messages].reverse().find((m) => isApprovalMessage(m.body));
    if (!approval || lastApproval.current === approval.id) return;
    lastApproval.current = approval.id;
    if (!firstPass) setCelebrate(true);
  }, [messages, loading]);

  if (!user || loading) return null;

  if (locked) {
    return (
      <div className="mt-3 flex items-center gap-2 rounded-2xl border border-border bg-surface-raised px-3 py-2.5 text-xs text-muted-foreground">
        <Lock className="size-3.5" /> Chat opens once a reporter claims this bounty.
      </div>
    );
  }

  function pickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 200 * 1024 * 1024) {
      toast.error("That file is larger than 200 MB.");
      return;
    }
    setPending((prev) => {
      if (prev) URL.revokeObjectURL(prev.preview);
      return { file, preview: URL.createObjectURL(file) };
    });
  }

  function clearPending() {
    setPending((prev) => {
      if (prev) URL.revokeObjectURL(prev.preview);
      return null;
    });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const body = draft.trim();
    if ((!body && !pending) || sending) return;
    setSending(true);
    try {
      const media = pending ? await uploadChatAttachment(key, pending.file) : null;
      await send(body, media);
      setDraft("");
      clearPending();
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
      className={cn(
        bare ? "pt-3" : "mt-3 rounded-2xl border border-border bg-surface-raised p-3",
      )}
    >
      {!bare && (
        <div className="flex items-center gap-2 text-[0.65rem] font-bold uppercase tracking-[0.14em] text-foreground">
          <MessageCircle className="size-3.5 text-signal" /> Messages
          {unread > 0 && (
            <span className="rounded-full bg-signal px-2 py-0.5 text-[0.6rem] font-extrabold text-signal-foreground">
              {unread} new
            </span>
          )}
        </div>
      )}

      <div className={cn("mt-3 space-y-2 pr-1", bare ? "" : "max-h-56 overflow-y-auto")}>
        {messages.length === 0 && (
          <p className="py-4 text-center text-xs text-muted-foreground">
            No messages yet — say hello and share the details.
          </p>
        )}
        {messages.map((m) => {
          const mine = m.sender_id === user.id;
          if (isSystemMessage(m.body)) {
            return (
              <div key={m.id} className="flex justify-center px-2 py-1">
                <p className="flex max-w-[92%] items-start gap-2 rounded-2xl border border-border bg-surface-raised px-3 py-2 text-center text-xs font-medium text-foreground">
                  <Sparkles className="mt-0.5 size-3.5 shrink-0 text-signal" />
                  <span className="whitespace-pre-wrap break-words text-left">{m.body}</span>
                </p>
              </div>
            );
          }
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
                {m.media_url &&
                  (mediaLinks[m.media_url] ? (
                    m.media_type === "video" ? (
                      <video
                        src={mediaLinks[m.media_url]}
                        controls
                        playsInline
                        className="mb-2 w-full max-w-56 rounded-xl bg-black"
                      />
                    ) : (
                      <img
                        src={mediaLinks[m.media_url]}
                        alt={m.body || "Shared photo"}
                        loading="lazy"
                        className="mb-2 w-full max-w-56 rounded-xl object-cover"
                      />
                    )
                  ) : (
                    <div className="mb-2 flex h-24 w-56 items-center justify-center rounded-xl bg-black/20">
                      <Loader2 className="size-4 animate-spin" />
                    </div>
                  ))}
                {m.body && <p className="whitespace-pre-wrap break-words">{m.body}</p>}
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

      {celebrate && <Confetti onDone={() => setCelebrate(false)} />}

      {pending && !readOnly && (
        <div className="mt-3 flex items-center gap-3 rounded-2xl border border-border bg-surface p-2">
          {pending.file.type.startsWith("video/") ? (
            <video src={pending.preview} className="size-12 rounded-lg bg-black object-cover" />
          ) : (
            <img
              src={pending.preview}
              alt="Attachment preview"
              className="size-12 rounded-lg object-cover"
            />
          )}
          <p className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
            {pending.file.name}
          </p>
          <button
            type="button"
            aria-label="Remove attachment"
            onClick={clearPending}
            className="text-muted-foreground hover:text-destructive"
          >
            <X className="size-4" />
          </button>
        </div>
      )}

      {readOnly ? (
        <div className="mt-3 flex items-center gap-2 rounded-2xl border border-border bg-surface-raised px-3 py-2.5 text-xs text-muted-foreground">
          <Lock className="size-3.5" /> This chat is closed — view only, kept as a record of the
          bounty.
        </div>
      ) : (
      <form onSubmit={submit} className="mt-3 flex items-center gap-2">
        <input
          ref={fileRef}
          type="file"
          accept="image/*,video/*"
          onChange={pickFile}
          className="hidden"
        />
        <button
          type="button"
          aria-label="Attach a photo or clip"
          onClick={() => fileRef.current?.click()}
          className="inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-border text-foreground"
        >
          <ImagePlus className="size-4" />
        </button>
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
          disabled={sending || (draft.trim().length === 0 && !pending)}
          className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-signal text-signal-foreground disabled:opacity-40"
        >
          {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
        </button>
      </form>
      )}
    </div>
  );
}
