import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Camera, Coins, MapPin } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { fetchMyProfile, markOnboardingCompleted } from "@/lib/profile";
import browseArt from "@/assets/onboarding-browse.png";
import coinsArt from "@/assets/onboarding-coins.png";
import captureArt from "@/assets/onboarding-capture.png";

const SLIDES = [
  {
    title: "Browse Live Views",
    body: "See real-time crowd sizes, line lengths, and atmospheres outside major events before you even arrive.",
    art: browseArt,
    icon: MapPin,
    alt: "Illustration of glowing map pins scattered across a dark city map",
  },
  {
    title: "Request a Bounty",
    body: "Can't find parking or want to check the merch line? Drop a coin bounty and get an onlooker on the ground to show you live video proof.",
    art: coinsArt,
    icon: Coins,
    alt: "Illustration of a glowing Looker Coin token with orbiting coins",
  },
  {
    title: "Capture & Earn",
    body: "Earn real money by responding to nearby requests. Remember: To protect creator rights, always keep your lens on physical logistics—never film inside the show or capture digital app screens.",
    art: captureArt,
    icon: Camera,
    alt: "Illustration of a phone camera framing a stadium entrance gate",
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

  useEffect(() => {
    let alive = true;
    if (!user) {
      setOpen(false);
      return;
    }
    fetchMyProfile()
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
  }, [user]);

  const finish = useCallback(async () => {
    setBusy(true);
    try {
      await markOnboardingCompleted();
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save. Try again.");
    } finally {
      setBusy(false);
    }
  }, []);

  if (!open) return null;

  const slide = SLIDES[step]!;
  const Icon = slide.icon;
  const last = step === SLIDES.length - 1;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/90 px-4 pb-6 pt-16 sm:items-center">
      <div className="w-full max-w-md overflow-hidden rounded-3xl border border-border bg-surface">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
          >
            <div className="relative">
              <img
                src={slide.art}
                alt={slide.alt}
                width={1024}
                height={768}
                loading="lazy"
                className="aspect-[4/3] w-full object-cover"
              />
              <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-surface to-transparent" />
              <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full border border-border bg-background/80 px-3 py-1.5 backdrop-blur">
                <Icon className="size-4 text-signal" />
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-foreground">
                  {slide.title}
                </span>
              </div>
            </div>

            <div className="px-6 pb-6 pt-4 text-center">
              <h2 className="font-display text-2xl tracking-tight text-foreground">
                {slide.title}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{slide.body}</p>
            </div>
          </motion.div>
        </AnimatePresence>

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
            <button
              type="button"
              disabled={busy}
              onClick={() => void finish()}
              className="flex items-center gap-2 rounded-2xl bg-signal px-5 py-2.5 text-sm font-semibold uppercase tracking-[0.14em] text-signal-foreground disabled:opacity-50"
            >
              {busy ? "Saving…" : "Get Started"}
              <ArrowRight className="size-4" />
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => void finish()}
                disabled={busy}
                className="px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground"
              >
                Skip
              </button>
              <button
                type="button"
                onClick={() => setStep((s) => Math.min(s + 1, SLIDES.length - 1))}
                className="flex items-center gap-2 rounded-2xl bg-signal px-5 py-2.5 text-sm font-semibold uppercase tracking-[0.14em] text-signal-foreground"
              >
                Next
                <ArrowRight className="size-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
