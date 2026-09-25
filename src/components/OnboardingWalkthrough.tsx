// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Coins, ShieldCheck, Zap } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import {
  fetchMyProfile,
  hasSeenOnboarding,
  markOnboardingCompleted,
  rememberOnboardingSeen,
  REPLAY_ONBOARDING_EVENT,
} from "@/lib/profile";
import browseArt from "@/assets/onboarding-browse.png";
import creditsArt from "@/assets/onboarding-credits.png";
import captureArt from "@/assets/onboarding-capture.png";

const SLIDES = [
  {
    eyebrow: "Earn nearby",
    title: "Get paid to be someone's eyes nearby",
    body: "Find a nearby bounty, capture what someone needs to see, and earn when your proof is approved.",
    art: browseArt,
    icon: Coins,
    alt: "Onlooker finding paid requests nearby",
  },
  {
    eyebrow: "See it for real",
    title: "Post a task, get verified proof back",
    body: "Ask for an on-demand real-world check. Someone nearby captures the exact place, detail, or moment you requested.",
    art: creditsArt,
    icon: Zap,
    alt: "A bounty connecting a poster with a nearby onlooker",
  },
  {
    eyebrow: "Protected by design",
    title: "Your money's protected either way",
    body: "Credits stay held until approval. On-site PIN and identity checks verify the right person, with real dispute review if something goes wrong.",
    art: captureArt,
    icon: ShieldCheck,
    alt: "Protected credits and verified real-world proof",
  },
] as const;

type Destination = "post" | "earn";

/** First-open introduction whose local completion synchronizes to a member account after sign-in. */
export function OnboardingWalkthrough() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [replaying, setReplaying] = useState(false);
  const touchStart = useRef<number | null>(null);

  useEffect(() => {
    const onReplay = () => {
      setStep(0);
      setReplaying(true);
      setOpen(true);
    };
    window.addEventListener(REPLAY_ONBOARDING_EVENT, onReplay);
    return () => window.removeEventListener(REPLAY_ONBOARDING_EVENT, onReplay);
  }, []);

  useEffect(() => {
    let alive = true;
    if (loading) return;
    const seenHere = hasSeenOnboarding();
    setReplaying(false);

    if (!user) {
      setOpen(!seenHere);
      return;
    }

    fetchMyProfile(user.id)
      .then(async (profile) => {
        if (!alive || !profile) return;
        if (profile.onboarding_completed) {
          rememberOnboardingSeen();
          setOpen(false);
          return;
        }
        if (seenHere) {
          await markOnboardingCompleted();
          if (alive) setOpen(false);
          return;
        }
        setOpen(true);
      })
      .catch(() => {
        if (alive) setOpen(!seenHere);
      });

    return () => {
      alive = false;
    };
  }, [loading, user?.id]);

  const finish = useCallback(async (destination?: Destination) => {
    setBusy(true);
    try {
      if (!replaying) {
        rememberOnboardingSeen();
        if (user) await markOnboardingCompleted().catch(() => undefined);
      }
      setOpen(false);
      if (destination === "post") await navigate({ to: "/post", search: { mode: "bounty" } });
      if (destination === "earn") await navigate({ to: "/hunt" });
    } finally {
      setBusy(false);
    }
  }, [navigate, replaying, user]);

  const move = (direction: -1 | 1) => {
    setStep((current) => Math.max(0, Math.min(SLIDES.length - 1, current + direction)));
  };

  const finishSwipe = (clientX: number) => {
    if (touchStart.current === null) return;
    const distance = clientX - touchStart.current;
    touchStart.current = null;
    if (Math.abs(distance) >= 45) move(distance < 0 ? 1 : -1);
  };

  if (!open) return null;

  const slide = SLIDES[step];
  if (!slide) return null;
  const Icon = slide.icon;
  const last = step === SLIDES.length - 1;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-background/90 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur-sm sm:items-center sm:p-6">
      <section
        role="dialog"
        aria-modal="true"
        aria-label="Welcome to Onlooker"
        className="relative flex max-h-full w-full max-w-md touch-pan-y flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl"
        onPointerDown={(event) => {
          if (event.pointerType !== "mouse") touchStart.current = event.clientX;
        }}
        onPointerUp={(event) => finishSwipe(event.clientX)}
        onPointerCancel={() => { touchStart.current = null; }}
      >
        <Button
          type="button"
          variant="secondary"
          onClick={() => void finish()}
          disabled={busy}
          className="absolute right-3 top-3 z-20 h-10 rounded-full border border-border bg-background/85 px-4 font-bold text-foreground backdrop-blur"
        >
          Skip
        </Button>

        <div key={step} className="min-h-0 overflow-y-auto animate-in fade-in slide-in-from-right-8 duration-300 motion-reduce:animate-none">
          <div className="relative">
            <img src={slide.art} alt={slide.alt} width={1024} height={768} className="aspect-[4/3] max-h-[40dvh] w-full object-cover" />
            <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-surface to-transparent" />
            <div className="absolute bottom-3 left-4 flex items-center gap-2 rounded-full border border-border bg-background/80 px-3 py-1.5 backdrop-blur">
              <Icon className="size-4 text-signal" />
              <span className="text-xs font-extrabold uppercase text-foreground">{slide.eyebrow}</span>
            </div>
          </div>
          <div className="px-5 pb-5 pt-4 text-left sm:px-6">
            <h2 className="font-display text-2xl font-extrabold text-foreground">{slide.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{slide.body}</p>
          </div>
        </div>

        <div className="shrink-0 border-t border-border px-5 py-4 sm:px-6">
          <div className="flex items-center justify-center gap-2" aria-label={`Slide ${step + 1} of ${SLIDES.length}`}>
            {SLIDES.map((item, index) => (
              <button
                type="button"
                key={item.title}
                onClick={() => setStep(index)}
                aria-label={`Go to slide ${index + 1}`}
                aria-current={index === step ? "step" : undefined}
                className="grid size-8 place-items-center rounded-full"
              >
                <span className={`h-2 rounded-full transition-all ${index === step ? "w-7 bg-signal" : "w-2 bg-border"}`} />
              </button>
            ))}
          </div>

          {last ? (
            <div className="mt-2 grid grid-cols-2 gap-2">
              <Button type="button" disabled={busy} onClick={() => void finish("post")} className="h-auto min-h-12 whitespace-normal rounded-lg px-3 py-2 font-extrabold">
                Post a bounty
              </Button>
              <Button type="button" variant="outline" disabled={busy} onClick={() => void finish("earn")} className="h-auto min-h-12 whitespace-normal rounded-lg border-signal px-3 py-2 font-extrabold text-signal">
                Start earning
              </Button>
            </div>
          ) : (
            <div className="mt-2 grid grid-cols-[3rem_minmax(0,1fr)] gap-2">
              <Button type="button" variant="secondary" size="icon" onClick={() => move(-1)} disabled={step === 0} aria-label="Previous slide" className="size-12 rounded-lg">
                <ArrowLeft className="size-5" />
              </Button>
              <Button type="button" onClick={() => move(1)} className="h-12 rounded-lg text-sm font-extrabold uppercase">
                Next <ArrowRight className="size-4" />
              </Button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
