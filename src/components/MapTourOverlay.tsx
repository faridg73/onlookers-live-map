import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Coins, Globe2, Radio, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "onlooker-map-tour-seen";

const steps = [
  {
    icon: Radio,
    title: "Get live eyes anywhere",
    body: "Post a bounty on any place in the world. A nearby onlooker goes live and streams it back to you within minutes.",
  },
  {
    icon: Coins,
    title: "Pins are live requests",
    body: "Every pin on the map is someone paying to see that spot right now. Gold pins are high bounties — tap any pin to watch or claim it.",
  },
  {
    icon: Globe2,
    title: "Request a view anywhere",
    body: "Use the REQUEST button to drop a pin on any location and fund a live stream there — a concert, a street, a beach.",
  },
  {
    icon: Zap,
    title: "Flash — happening here now",
    body: "Standing somewhere interesting? Hit FLASH to instantly alert nearby onlookers to go live at your exact spot and earn.",
  },
];

export function MapTourOverlay() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    try {
      if (!window.localStorage.getItem(STORAGE_KEY)) setOpen(true);
    } catch {
      // storage unavailable — stay closed
    }
  }, []);

  const dismiss = () => {
    try {
      window.localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // ignore
    }
    setOpen(false);
  };

  if (!open) return null;

  const current = steps[step]!;
  const Icon = current.icon;
  const last = step === steps.length - 1;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Welcome to Onlooker"
      className="fixed inset-0 z-50 flex items-end justify-center bg-background/80 backdrop-blur-sm sm:items-center"
    >
      <div className="pointer-events-auto mx-4 mb-[calc(env(safe-area-inset-bottom)+1.5rem)] w-full max-w-md rounded-2xl border border-border bg-surface p-5 shadow-2xl sm:mb-0">
        <div className="flex items-start gap-4">
          <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-signal/15 text-signal">
            <Icon className="size-6" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-lg font-extrabold tracking-tight text-foreground">
              {current.title}
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{current.body}</p>
          </div>
        </div>

        <div className="mt-5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5" aria-label={`Step ${step + 1} of ${steps.length}`}>
            {steps.map((s, i) => (
              <span
                key={s.title}
                className={`h-1.5 rounded-full transition-all ${
                  i === step ? "w-6 bg-signal" : "w-1.5 bg-muted-foreground/30"
                }`}
              />
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={dismiss}
              className="px-2 py-1 text-xs font-bold uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
            >
              Skip
            </button>
            <Button
              type="button"
              size="sm"
              className="h-9 rounded-lg bg-signal px-4 text-xs font-extrabold uppercase tracking-wider text-signal-foreground hover:bg-signal/90"
              onClick={() => (last ? dismiss() : setStep((s) => s + 1))}
            >
              {last ? "Got it" : "Next"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
