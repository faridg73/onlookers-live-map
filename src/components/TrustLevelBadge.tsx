// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import { useEffect, useState } from "react";
import { Check, ChevronLeft, ChevronRight, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  awardReputation,
  fetchMyReputation,
  hasCompletedSafetyTutorial,
} from "@/lib/reputation";
import { fetchMyTrustLevel, trustTier, type TrustLevel } from "@/lib/trust-tiers";

/** Shows the member's trust level, what it unlocks and the next step up. */
export function TrustLevelBadge({ className = "" }: { className?: string }) {
  const [level, setLevel] = useState<TrustLevel | null>(null);
  const [points, setPoints] = useState(0);
  const [tutorialOpen, setTutorialOpen] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(0);
  const [tutorialComplete, setTutorialComplete] = useState(false);
  const [awarding, setAwarding] = useState(false);

  useEffect(() => {
    let active = true;
    void Promise.all([
      fetchMyTrustLevel(),
      fetchMyReputation(),
      hasCompletedSafetyTutorial(),
    ]).then(([next, total, completed]) => {
      if (!active) return;
      setLevel(next);
      setPoints(total);
      setTutorialComplete(completed);
    });
    return () => {
      active = false;
    };
  }, []);

  if (level === null) return null;
  const tier = trustTier(level);
  const isLevelThree = level === 3;
  const tutorialSteps = [
    {
      title: "Protect yourself first",
      body: "Keep a safe distance, follow official instructions, and never enter a restricted or dangerous area for footage.",
    },
    {
      title: "Report what you can verify",
      body: "Share only what you directly observe. Avoid assumptions, identify approximate locations, and never expose private personal details.",
    },
    {
      title: "Emergencies come first",
      body: "Onlooker LLC reports do not replace emergency services. For immediate danger or a life-threatening emergency, call 911 first.",
    },
  ];

  async function completeTutorial() {
    setAwarding(true);
    try {
      const total = await awardReputation("safety_tutorial", "v1");
      if (total === null) throw new Error("Sign in to save your tutorial progress.");
      setPoints(total);
      setTutorialComplete(true);
      setTutorialOpen(false);
      setTutorialStep(0);
      setLevel(await fetchMyTrustLevel());
      toast.success("Safety tutorial complete. You earned 10 points.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save your progress.");
    } finally {
      setAwarding(false);
    }
  }

  return (
    <div className={`rounded-2xl border border-border bg-surface p-4 ${className}`}>
      <div className="flex items-center justify-between gap-3">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.68rem] font-extrabold uppercase tracking-[0.1em] ${tier.badge} ${isLevelThree ? "text-foreground" : ""}`}
        >
          <ShieldCheck className="size-3.5" /> Level {tier.level} · {tier.name}
        </span>
        <span className={`shrink-0 text-xs font-bold ${isLevelThree ? "text-foreground" : "text-muted-foreground"}`}>
          {points} pts
        </span>
      </div>
      <p className="mt-2 text-sm text-foreground">{tier.unlocks}</p>
      {tier.nextStep && <p className="mt-1 text-xs text-muted-foreground">{tier.nextStep}</p>}
      <Button
        type="button"
        variant="outline"
        disabled={tutorialComplete}
        onClick={() => {
          setTutorialStep(0);
          setTutorialOpen(true);
        }}
        className="mt-3 h-11 w-full rounded-xl border-signal/50 bg-transparent text-xs font-bold uppercase tracking-[0.1em] text-signal hover:bg-signal/10 hover:text-signal"
      >
        {tutorialComplete ? <><Check /> Safety tutorial completed</> : "Finish safety tutorial (+10 pts)"}
      </Button>

      <Dialog open={tutorialOpen} onOpenChange={setTutorialOpen}>
        <DialogContent className="flex max-h-[calc(100dvh-2rem)] flex-col overflow-hidden pt-safe sm:max-w-md sm:pt-6">
          <DialogHeader className="shrink-0 pr-12 text-left">
            <DialogTitle>Safety tutorial</DialogTitle>
            <DialogDescription>
              Step {tutorialStep + 1} of {tutorialSteps.length}
            </DialogDescription>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto py-4">
            <div className="mb-5 flex gap-2" aria-hidden="true">
              {tutorialSteps.map((step, index) => (
                <span
                  key={step.title}
                  className={`h-1.5 flex-1 rounded-full ${index <= tutorialStep ? "bg-signal" : "bg-surface-raised"}`}
                />
              ))}
            </div>
            <ShieldCheck className="size-10 text-signal" />
            <h3 className="mt-4 font-display text-xl text-foreground">
              {tutorialSteps[tutorialStep]?.title}
            </h3>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              {tutorialSteps[tutorialStep]?.body}
            </p>
          </div>
          <div className="grid shrink-0 grid-cols-[auto_minmax(0,1fr)] gap-3 pb-[max(env(safe-area-inset-bottom),0.25rem)]">
            <Button
              type="button"
              variant="secondary"
              disabled={tutorialStep === 0 || awarding}
              onClick={() => setTutorialStep((step) => Math.max(0, step - 1))}
              aria-label="Previous tutorial step"
              className="size-11 rounded-full p-0"
            >
              <ChevronLeft />
            </Button>
            {tutorialStep < tutorialSteps.length - 1 ? (
              <Button
                type="button"
                onClick={() => setTutorialStep((step) => Math.min(tutorialSteps.length - 1, step + 1))}
                className="h-11 rounded-xl"
              >
                Continue <ChevronRight />
              </Button>
            ) : (
              <Button
                type="button"
                disabled={awarding}
                onClick={() => void completeTutorial()}
                className="h-11 rounded-xl"
              >
                {awarding ? "Saving…" : "Complete & earn 10 points"}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
