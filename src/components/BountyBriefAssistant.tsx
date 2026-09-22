import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Sparkle, ShieldCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { suggestBountyBrief, type BountyBriefSuggestion } from "@/lib/bounty-brief.functions";

type Props = {
  /** The poster's own words from step 1. */
  request: string;
  category?: string;
  locationType?: string | null;
  place?: string | null;
  onApplyTitle: (title: string) => void;
  onApplyInstructions: (instructions: string) => void;
};

/**
 * Asks a model to turn the poster's rough photo request into a clearer title,
 * sharper camera instructions and a short safety checklist. Nothing is applied
 * automatically — the poster taps to use each suggestion.
 */
export function BountyBriefAssistant({
  request,
  category,
  locationType,
  place,
  onApplyTitle,
  onApplyInstructions,
}: Props) {
  const run = useServerFn(suggestBountyBrief);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<BountyBriefSuggestion | null>(null);

  const ready = request.trim().length >= 8;

  const generate = async () => {
    if (!ready || busy) return;
    setBusy(true);
    try {
      const suggestion = await run({
        data: {
          request: request.trim().slice(0, 1200),
          ...(category ? { category } : {}),
          ...(locationType ? { locationType } : {}),
          ...(place ? { place: place.slice(0, 200) } : {}),
        },
      });
      setResult(suggestion);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not generate suggestions right now.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-xl border border-border bg-background p-3 sm:p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Sparkle className="size-4 shrink-0 text-signal" />
        <p className="flex-1 text-xs font-bold uppercase text-muted-foreground">Sharpen this request</p>
        <Button
          type="button"
          size="sm"
          onClick={() => void generate()}
          disabled={!ready || busy}
          className="bg-signal font-extrabold text-signal-foreground"
        >
          {busy ? (
            <>
              <Loader2 className="mr-1.5 size-3.5 animate-spin" />
              Thinking…
            </>
          ) : result ? (
            "Try again"
          ) : (
            "Suggest details"
          )}
        </Button>
      </div>
      <p className="mt-2 text-xs font-medium leading-relaxed text-muted-foreground">
        {ready
          ? "Get a clearer title, better camera instructions and safety notes based on what you typed. You choose what to keep."
          : "Describe what you want captured on the first step to get suggestions."}
      </p>

      {result && (
        <div className="mt-3 space-y-3">
          <div className="rounded-lg border border-border bg-surface-raised p-3">
            <p className="text-xs font-bold uppercase text-muted-foreground">Suggested title</p>
            <p className="mt-1 text-sm font-bold text-foreground">{result.title}</p>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="mt-2"
              onClick={() => {
                onApplyTitle(result.title);
                toast.success("Title updated.");
              }}
            >
              Use this title
            </Button>
          </div>

          <div className="rounded-lg border border-border bg-surface-raised p-3">
            <p className="text-xs font-bold uppercase text-muted-foreground">Suggested camera instructions</p>
            <p className="mt-1 whitespace-pre-line text-sm font-medium leading-relaxed text-foreground">
              {result.instructions}
            </p>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="mt-2"
              onClick={() => {
                onApplyInstructions(result.instructions);
                toast.success("Camera instructions updated.");
              }}
            >
              Use these instructions
            </Button>
          </div>

          {result.safety.length > 0 && (
            <div className="rounded-lg border border-border bg-surface-raised p-3">
              <p className="flex items-center gap-1.5 text-xs font-bold uppercase text-muted-foreground">
                <ShieldCheck className="size-3.5 text-signal" />
                Safety considerations
              </p>
              <ul className="mt-2 space-y-1.5">
                {result.safety.map((item) => (
                  <li key={item} className="flex gap-2 text-xs font-medium leading-relaxed text-muted-foreground">
                    <span aria-hidden className="mt-1.5 size-1.5 shrink-0 rounded-full bg-border" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-[11px] font-medium text-muted-foreground">
                AI guidance — Onlooker's rules against filming private residences, minors and active emergencies still apply.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
