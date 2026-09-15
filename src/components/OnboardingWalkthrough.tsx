import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { CalendarPlus, LocateFixed, MapPin, Radio, Search } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { fetchMyProfile, markOnboardingCompleted, REPLAY_ONBOARDING_EVENT } from "@/lib/profile";
import { requestCurrentPosition } from "@/lib/geolocation";
import { PlaceSearchInput } from "@/components/PlaceSearchInput";
import { Button } from "@/components/ui/button";

const MAP_CONTEXT_EVENT = "onlooker:set-map-context";

const GOALS = [
  { id: "find", label: "Find a Live View", icon: Search, destination: "/" },
  { id: "post", label: "Post an Event", icon: CalendarPlus, destination: "/post" },
  { id: "earn", label: "Explore Bounties", icon: Radio, destination: "/hunt" },
] as const;

type Goal = (typeof GOALS)[number];

/**
 * First-run walkthrough shown once per account after the profile setup gate.
 * Completing it flips profiles.onboarding_completed so it never shows again.
 */
export function OnboardingWalkthrough() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"goal" | "location">("goal");
  const [goal, setGoal] = useState<Goal | null>(null);
  const [busy, setBusy] = useState(false);
  const [manual, setManual] = useState(false);

  // Manual replay from the profile guide button — works signed out too.
  useEffect(() => {
    const onReplay = () => {
      setStep("goal");
      setGoal(null);
      setManual(false);
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

  const finish = useCallback(async (position?: { lat: number; lng: number }) => {
    setBusy(true);
    try {
      await markOnboardingCompleted().catch(() => undefined);
      if (position) window.dispatchEvent(new CustomEvent(MAP_CONTEXT_EVENT, { detail: position }));
      setOpen(false);
      if (goal?.destination && goal.destination !== "/") {
        await navigate({ to: goal.destination });
      }
    } finally {
      setBusy(false);
    }
  }, [goal, navigate]);

  const useLocation = async () => {
    setBusy(true);
    try {
      const position = await requestCurrentPosition();
      await finish({ lat: position.coords.latitude, lng: position.coords.longitude });
    } catch (error) {
      setBusy(false);
      toast.error(error instanceof Error ? error.message : "Your location could not be found.");
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-background/45 px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-20 backdrop-blur-[2px] sm:items-center">
      <section className="w-full max-w-sm animate-rise rounded-[2rem] border border-border bg-surface p-6 shadow-2xl">
        {step === "goal" ? (
          <>
            <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-signal text-signal-foreground">
              <MapPin className="size-7" />
            </div>
            <h2 className="mt-5 text-center font-display text-2xl font-bold text-foreground">What do you want to see?</h2>
            <p className="mt-2 text-center text-sm text-muted-foreground">Pick one goal to set up your map.</p>
            <div className="mt-6 space-y-3">
              {GOALS.map((item) => {
                const Icon = item.icon;
                return (
                  <Button
                    key={item.id}
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setGoal(item);
                      setStep("location");
                    }}
                    className="h-14 w-full justify-start rounded-2xl border-border bg-background px-4 text-base font-semibold"
                  >
                    <Icon className="size-5 text-signal" />
                    {item.label}
                  </Button>
                );
              })}
            </div>
          </>
        ) : (
          <>
            <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-signal text-signal-foreground">
              <LocateFixed className="size-7" />
            </div>
            <h2 className="mt-5 text-center font-display text-2xl font-bold text-foreground">Where are you looking?</h2>
            <p className="mt-2 text-center text-sm text-muted-foreground">We’ll show what’s happening near that spot.</p>
            {manual ? (
              <div className="mt-6">
                <PlaceSearchInput
                  autoFocus
                  placeholder="City, venue, landmark or address"
                  onPick={(place) => void finish({ lat: place.latitude, lng: place.longitude })}
                />
                <Button type="button" variant="ghost" onClick={() => setManual(false)} className="mt-3 w-full">Use my current location instead</Button>
              </div>
            ) : (
              <div className="mt-6 space-y-3">
                <Button type="button" disabled={busy} onClick={() => void useLocation()} className="h-14 w-full rounded-2xl text-base font-bold">
                  <LocateFixed className="size-5" /> {busy ? "Finding you…" : "Allow Location"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setManual(true)} className="h-14 w-full rounded-2xl text-base font-semibold">
                  <MapPin className="size-5" /> Enter Location Manually
                </Button>
              </div>
            )}
          </>
        )}
        <div className="mt-6 flex justify-center gap-2" aria-label={`Step ${step === "goal" ? 1 : 2} of 2`}>
          <span className={`h-1.5 rounded-full ${step === "goal" ? "w-8 bg-signal" : "w-1.5 bg-border"}`} />
          <span className={`h-1.5 rounded-full ${step === "location" ? "w-8 bg-signal" : "w-1.5 bg-border"}`} />
        </div>
      </section>
    </div>
  );
}
