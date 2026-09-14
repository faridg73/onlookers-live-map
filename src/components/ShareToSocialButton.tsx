import { useState } from "react";
import { Check, Code2, Copy, Radio, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  SOCIAL_TARGETS,
  copyEmbedSnippet,
  copyShareLink,
  embedSnippet,
  shareCaption,
  shareLink,
  shareNatively,
  shareToPlatform,
  type ShareSubject,
} from "@/lib/social-share";
import { cn } from "@/lib/utils";

/**
 * Share to Social: platform buttons for a live stream or a funded map pin,
 * plus the embed code an external site can drop into an article.
 */
export function ShareToSocialButton({
  subject,
  label = "Share to social",
  className,
}: {
  subject: ShareSubject;
  label?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [showEmbed, setShowEmbed] = useState(false);
  const snippet = embedSnippet(subject);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          onClick={(event) => event.stopPropagation()}
          className={cn(
            "inline-flex items-center justify-center gap-2 rounded-xl border border-signal/60 bg-signal/10 px-3 py-2 text-xs font-bold uppercase tracking-[0.12em] text-signal transition-colors hover:bg-signal/20",
            className,
          )}
        >
          <Share2 className="size-4" /> {label}
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {subject.kind === "live" && <Radio className="size-4 text-signal" />}
            Share {subject.kind === "live" ? "this live stream" : "this pin"}
          </DialogTitle>
          <DialogDescription>
            Anywhere you paste this link it shows a preview card with the title, the location pin
            and Onlooker branding.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-2xl border border-border bg-surface-raised p-3">
          <p className="whitespace-pre-line text-xs leading-relaxed text-muted-foreground">
            {shareCaption(subject)}
          </p>
          <p className="mt-2 break-all text-[0.65rem] text-signal/80">{shareLink(subject)}</p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {SOCIAL_TARGETS.map((target) => (
            <button
              key={target.id}
              type="button"
              onClick={() => void shareToPlatform(subject, target)}
              className="rounded-xl border border-border bg-surface px-3 py-2.5 text-left transition-colors hover:border-signal/60"
            >
              <span className="block text-xs font-bold uppercase tracking-[0.1em] text-foreground">
                {target.label}
              </span>
              <span className="mt-0.5 block text-[0.65rem] text-muted-foreground">
                {target.hint}
              </span>
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => void shareNatively(subject)}
            className="flex-1 rounded-xl text-xs font-bold uppercase tracking-[0.1em]"
          >
            <Share2 className="size-4" /> More apps
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => void copyShareLink(subject)}
            className="flex-1 rounded-xl text-xs font-bold uppercase tracking-[0.1em]"
          >
            <Copy className="size-4" /> Copy link
          </Button>
        </div>

        <div className="rounded-2xl border border-border bg-surface-raised p-3">
          <button
            type="button"
            onClick={() => setShowEmbed((value) => !value)}
            className="flex w-full items-center gap-2 text-xs font-bold uppercase tracking-[0.1em] text-foreground"
          >
            <Code2 className="size-4 text-signal" />
            Embed on a news site or blog
          </button>
          {showEmbed && (
            <>
              <pre className="mt-2 max-h-32 overflow-auto rounded-xl bg-black/60 p-2 text-[0.6rem] leading-relaxed text-muted-foreground">
                {snippet}
              </pre>
              <Button
                type="button"
                variant="outline"
                onClick={() => void copyEmbedSnippet(snippet)}
                className="mt-2 w-full rounded-xl text-xs font-bold uppercase tracking-[0.1em]"
              >
                <Check className="size-4" /> Copy embed code
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
