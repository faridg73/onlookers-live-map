// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import { useCallback, useEffect, useState } from "react";
import { ArrowRight, BadgeCheck, LockKeyhole, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { fetchMyProfile, markOnboardingCompleted, REPLAY_ONBOARDING_EVENT } from "@/lib/profile";
import browseArt from "@/assets/onboarding-browse.png";
import creditsArt from "@/assets/onboarding-credits.png";
import captureArt from "@/assets/onboarding-capture.png";

const SLIDES = [
  {
    step: "Standard video apps",
    title: "Conversation, without a commitment",
    body: "Most video apps are built for casual chatting. There is no clear task, no locked value, and no shared way to confirm what happened.",
    art: browseArt,
    icon: MessageCircle,
    alt: "Illustration representing ordinary video conversations",
  },
  {
    step: "The Onlooker LLC network",
    title: "A real request, backed by locked credits",
    body: "Post a bounty for something happening in the real world. Your credits stay protected while an onlooker claims the request and captures what you asked to see.",
    art: creditsArt,
    icon: LockKeyhole,
    alt: "Illustration of credits protected while a bounty is active",
  },
  {
    step: "Verified result",
    title: "Proof first, then credits are released",
    body: "The requester reviews the live proof before the bounty is completed. Once it is verified, the onlooker earns and everyone can see how the result was reached.",
    art: captureArt,
    icon: BadgeCheck,
    alt: "Illustration of a verified real-world capture",
  },
] as const;

/**
 * First-run walkthrough shown once per account after the profile setup gate.
 * Completing it flips profiles.onboarding_completed so it never shows again.
 */
export function OnboardingWalkthrough() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);

  // Manual replay from the profile guide button — works signed out too.
  useEffect(() => {
    const onReplay = () => {
      setStep(0);
      setOpen(true);
    };
    window.addEventListener(REPLAY_ONBOARDING_EVENT, onReplay);
    return () => window.removeEventListener(REPLAY_ONBOARDING_EVENT, onReplay);
  }, []);

  useEffect(() => {
    let alive = true;
    if (!user) {
      setOpen(false);
      return;
    }
    fetchMyProfile(user.id)
      .then((profile) => {
        if (!alive || !profile) return;
        // Only after the profile setup gate is done, and only once.
        if (!profile.onboarded || profile.onboarding_completed) return;
        setOpen(true);
      })
      .catch(() => {
        /* profile unavailable — do not block the app */
      });
    return () => {
      alive = false;
    };
  }, [user?.id]);

  const finish = useCallback(async () => {
    setBusy(true);
    try {
      // Signed-out viewers can replay the guide too — nothing to persist.
      await markOnboardingCompleted().catch(() => undefined);
      setOpen(false);
    } finally {
      setBusy(false);
    }
  }, []);

  if (!open) return null;

  const slide = SLIDES[step];
  if (!slide) return null;
  const Icon = slide.icon;
  const last = step === SLIDES.length - 1;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-background/90 px-4 pb-6 pt-16 sm:items-center">
      <div className="w-full max-w-md overflow-hidden rounded-3xl border border-border bg-surface">
        <div key={step} className="animate-in fade-in slide-in-from-right-8 duration-300">
          <div className="relative">
            <img
              src={slide.art}
              alt={slide.alt}
              width={1024}
              height={768}
              loading="lazy"
                  className="aspect-[4/3] max-h-[30dvh] w-full object-cover"
            />
            <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-surface to-transparent" />
            <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full border border-border bg-background/80 px-3 py-1.5 backdrop-blur">
              <Icon className="size-4 text-signal" />
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-foreground">
                Step {step + 1} · {slide.step}
              </span>
            </div>
          </div>

          <div className="px-6 pb-6 pt-4 text-center">
            <h2 className="font-display text-2xl tracking-tight text-foreground">
              {slide.title}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{slide.body}</p>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-border px-6 py-4">
          <div className="flex gap-1.5">
            {SLIDES.map((s, i) => (
              <span
                key={s.title}
                className={`h-1.5 rounded-full transition-all ${
                  i === step ? "w-6 bg-signal" : "w-1.5 bg-border"
                }`}
              />
            ))}
          </div>

          {last ? (
            <Button
              type="button"
              disabled={busy}
              onClick={() => void finish()}
              className="h-10 rounded-2xl px-5 text-sm font-semibold uppercase tracking-[0.14em]"
            >
              {busy ? "Saving…" : "Get Started"}
              <ArrowRight className="size-4" />
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => void finish()}
                disabled={busy}
                className="px-3 text-xs font-medium text-muted-foreground hover:text-foreground"
              >
                Skip
              </Button>
              <Button
                type="button"
                onClick={() => setStep((s) => Math.min(s + 1, SLIDES.length - 1))}
                className="h-10 rounded-2xl px-5 text-sm font-semibold uppercase tracking-[0.14em]"
              >
                Next
                <ArrowRight className="size-4" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
