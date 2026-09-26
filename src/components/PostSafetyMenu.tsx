// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import { useState } from "react";
import { Ban, Flag, MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/use-auth";
import { REPORT_REASONS, blockUser, reportCommunityPost } from "@/lib/community";

/** Report / Block controls required on every piece of user content (App Store 1.2). */
export function PostSafetyMenu({
  postId,
  authorId,
  authorName,
  onChanged,
}: {
  postId: string;
  authorId: string;
  authorName: string;
  onChanged: () => void;
}) {
  const { user } = useAuth();
  const [reporting, setReporting] = useState(false);
  const [reason, setReason] = useState<string>("spam");
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);

  const needSignIn = () => {
    toast.error("Sign in to report or block.");
  };

  const submitReport = async () => {
    setBusy(true);
    try {
      await reportCommunityPost(postId, reason, details);
      toast.success("Thanks — our team will review this post.");
      setReporting(false);
      setDetails("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't send that report.");
    } finally {
      setBusy(false);
    }
  };

  const block = async () => {
    if (!user) return needSignIn();
    if (!authorId) return;
    if (!window.confirm(`Block ${authorName}? You won't see their posts anymore.`)) return;
    try {
      await blockUser(authorId);
      toast.success(`${authorName} is blocked. Undo anytime from your profile.`);
      onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't block.");
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" variant="outline" size="icon" aria-label="Report or block" className="size-8 rounded-lg text-muted-foreground">
            <MoreHorizontal className="size-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => (user ? setReporting(true) : needSignIn())}>
            <Flag className="size-4" /> Report post
          </DropdownMenuItem>
          {authorId && (
            <DropdownMenuItem onSelect={() => void block()}>
              <Ban className="size-4" /> Block {authorName}
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {reporting && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-background/80 sm:items-center" onClick={() => setReporting(false)}>
          <div
            className="w-full max-w-md rounded-t-3xl border border-border bg-surface p-5 pb-[max(1.25rem,calc(env(safe-area-inset-bottom)+1rem))] sm:rounded-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-extrabold text-foreground">Report this post</h2>
            <p className="mt-1 text-xs text-muted-foreground">Reports are private. Posts with several reports are hidden until reviewed.</p>
            <div className="mt-4 space-y-2">
              {REPORT_REASONS.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setReason(r.id)}
                  className={`w-full rounded-xl border px-3 py-2.5 text-left text-sm font-semibold ${
                    reason === r.id ? "border-signal bg-signal/10 text-signal" : "border-border text-foreground"
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              rows={2}
              maxLength={500}
              placeholder="Anything else we should know? (optional)"
              className="mt-3 w-full rounded-xl border border-border bg-surface-raised px-3 py-2 text-sm text-foreground outline-none focus:border-signal"
            />
            <div className="mt-4 flex gap-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setReporting(false)}>Cancel</Button>
              <Button type="button" className="flex-1" disabled={busy} onClick={() => void submitReport()}>
                {busy ? "Sending…" : "Send report"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
