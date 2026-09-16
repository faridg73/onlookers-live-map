import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  Camera,
  Lock,
  MapPin,
  Mic,
  MicOff,
  Radio,
  ShieldCheck,
  SwitchCamera,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useHumanCheck } from "@/components/HumanCheck";
import { usePhoneGate } from "@/components/PhoneGate";
import { LocationPreviewMap, type PickedLocation } from "@/components/LocationPreviewMap";
import { LiveBroadcastStage } from "@/components/LiveBroadcastStage";
import {
  BROADCAST_AUDIENCES,
  BROADCAST_SAFETY_NOTICE,
  BROADCAST_WINDOWS,
  fetchBroadcastEligibility,
  startFreeBroadcast,
  type BroadcastAudience,
  type BroadcastEligibility,
} from "@/lib/broadcast";
import { COMMUNITY_CATEGORIES, type CommunityCategory } from "@/lib/community";
import { requestCurrentPosition } from "@/lib/geolocation";
import { reverseGeocode } from "@/lib/geocode.functions";
import { BLOCKED_REQUEST_MESSAGE, isRequestAllowed } from "@/lib/moderation";
import { verifyHumanCheck } from "@/lib/turnstile.functions";

/**
 * Free Social Broadcast composer: a verified creator names what they are
 * showing, drops a pin and goes live for followers and nearby people with no
 * credits held anywhere.
 */
export function BroadcastComposer({ onSwitchToBounty }: { onSwitchToBounty: () => void }) {
  const navigate = useNavigate();
  const [gate, setGate] = useState<BroadcastEligibility | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [place, setPlace] = useState("");
  const [spot, setSpot] = useState<PickedLocation | null>(null);
  const [category, setCategory] = useState<CommunityCategory>("meetups");
  const [hours, setHours] = useState<number>(1);
  const [gpsBusy, setGpsBusy] = useState(false);
  const [posting, setPosting] = useState(false);
  /** Set once the broadcast is published, which opens the live camera stage. */
  const [liveNow, setLiveNow] = useState<{ title: string; place: string } | null>(null);
  const human = useHumanCheck("community-post");
  // Live actions need a mobile number confirmed by text, social sign-ins included.
  const phoneGate = usePhoneGate("before you go live");

  useEffect(() => {
    let active = true;
    void fetchBroadcastEligibility().then((next) => {
      if (active) setGate(next);
    });
    return () => {
      active = false;
    };
  }, []);

  const useCurrentSpot = async () => {
    setGpsBusy(true);
    try {
      const position = await requestCurrentPosition();
      const { latitude, longitude } = position.coords;
      const found = await reverseGeocode({ data: { latitude, longitude } }).catch(() => null);
      const formatted = found?.formatted ?? "My current location";
      setPlace(formatted);
      setSpot({ latitude, longitude, formatted });
    } catch {
      toast.error("Allow location access to broadcast from where you are.");
    } finally {
      setGpsBusy(false);
    }
  };

  const goLive = async () => {
    if (title.trim().length < 4) {
      toast.error("Give your broadcast a short title people can read at a glance.");
      return;
    }
    if (!spot || !place.trim()) {
      toast.error("Pick where you're streaming from, use your location or tap the map.");
      return;
    }
    if (!isRequestAllowed(title, body, place)) {
      toast.error(BLOCKED_REQUEST_MESSAGE, { duration: 12000 });
      return;
    }
    if (!human.ready) {
      toast.error("Finish the quick human check before going live.");
      return;
    }
    if (!(await phoneGate.ensureVerified(() => void goLive()))) return;
    setPosting(true);
    try {
      const check = await verifyHumanCheck({
        data: { token: human.token ?? "", action: "community-post" },
      });
      if (!check.ok) throw new Error("The human check didn't pass. Please try again.");
      await startFreeBroadcast({
        category,
        title: title.trim(),
        body: body.trim(),
        place: place.trim(),
        hours,
        latitude: spot.latitude,
        longitude: spot.longitude,
      });
      toast.success("You're broadcasting", {
        description: "Followers and people nearby can see it on Discover. No credits held.",
      });
      // Open the live camera view so the creator sees their own feed while live.
      setLiveNow({ title: title.trim(), place: place.trim() });
    } catch (error) {
      human.reset();
      toast.error(error instanceof Error ? error.message : "Couldn't start the broadcast.");
    } finally {
      setPosting(false);
    }
  };

  if (liveNow) {
    return (
      <LiveBroadcastStage
        title={liveNow.title}
        place={liveNow.place}
        onEnd={() => {
          setLiveNow(null);
          toast.success("Broadcast ended");
          void navigate({ to: "/community" });
        }}
      />
    );
  }

  if (gate && !gate.allowed) {
    return (
      <div className="mx-auto max-w-xl animate-rise space-y-4">
        <div className="rounded-xl border border-border bg-background p-4">
          <p className="flex items-center gap-2 text-sm font-extrabold text-foreground">
            <ShieldCheck className="size-4 text-signal" /> Free broadcasting isn&apos;t open yet
          </p>
          <p className="mt-2 text-sm text-muted-foreground">{gate.reason}</p>
        </div>
        {gate.signedIn ? (
          <Button type="button" className="w-full" onClick={onSwitchToBounty}>
            Post a paid flash bounty instead
          </Button>
        ) : (
          <Button type="button" className="w-full" onClick={() => void navigate({ to: "/auth" })}>
            Sign in
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl animate-rise space-y-5">
      <div className="flex items-start gap-3 rounded-xl border border-signal/40 bg-signal/5 p-3">
        <Radio className="mt-0.5 size-5 shrink-0 text-signal" />
        <p className="text-xs font-medium text-muted-foreground">
          <span className="block font-extrabold text-foreground">Free social broadcast</span>
          Nothing is held from your wallet. Your followers and people nearby get it on Discover.
        </p>
      </div>

      <label className="block space-y-1.5">
        <span className="text-[0.65rem] font-bold uppercase tracking-[0.18em] text-muted-foreground">
          What are you showing?
        </span>
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Sunset buskers on the boardwalk"
          className="field"
        />
      </label>

      <label className="block space-y-1.5">
        <span className="text-[0.65rem] font-bold uppercase tracking-[0.18em] text-muted-foreground">
          Details (optional)
        </span>
        <textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          rows={3}
          placeholder="Who should tune in, and what they'll see."
          className="field resize-none"
        />
      </label>

      <div>
        <p className="text-xs font-bold uppercase text-muted-foreground">Lane</p>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {COMMUNITY_CATEGORIES.map((option) => (
            <Button
              key={option.id}
              type="button"
              variant="outline"
              aria-pressed={category === option.id}
              onClick={() => setCategory(option.id)}
              className={`h-11 whitespace-normal text-xs font-extrabold ${
                category === option.id ? "border-signal bg-signal/10 text-signal" : ""
              }`}
            >
              {option.label}
            </Button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs font-bold uppercase text-muted-foreground">Stay on the feed for</p>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {BROADCAST_WINDOWS.map((option) => (
            <Button
              key={option.label}
              type="button"
              variant="outline"
              aria-pressed={hours === option.hours}
              onClick={() => setHours(option.hours)}
              className={`h-auto flex-col gap-0.5 py-2.5 text-xs font-extrabold ${
                hours === option.hours ? "border-signal bg-signal text-signal-foreground" : ""
              }`}
            >
              {option.label}
              <span
                className={`text-[0.6rem] font-bold uppercase tracking-[0.08em] ${
                  hours === option.hours ? "text-signal-foreground/80" : "text-muted-foreground"
                }`}
              >
                {option.tier}
              </span>
            </Button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs font-bold uppercase text-muted-foreground">Where you are</p>
        <div className="mt-2 flex gap-2">
          <input
            value={place}
            onChange={(event) => setPlace(event.target.value)}
            placeholder="Balboa Pier, north end"
            className="field flex-1"
          />
          <Button
            type="button"
            variant="secondary"
            onClick={() => void useCurrentSpot()}
            disabled={gpsBusy}
            className="shrink-0 gap-1.5"
          >
            <MapPin className="size-3.5 text-signal" />
            {gpsBusy ? "Locating…" : "My location"}
          </Button>
        </div>
        <div className="mt-3">
          <LocationPreviewMap
            address={place}
            selectedLocation={spot}
            onPick={(next) => {
              setSpot(next);
              setPlace(next.formatted);
            }}
          />
        </div>
      </div>

      {human.widget}

      <Button
        type="button"
        disabled={posting}
        onClick={() => void goLive()}
        className="h-12 w-full gap-2 text-sm font-extrabold uppercase tracking-[0.14em]"
      >
        <Radio className="size-4" />
        {posting ? "Starting…" : "Go live free"}
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        Want targeted eyes on a place instead?{" "}
        <button type="button" onClick={onSwitchToBounty} className="font-bold text-signal underline">
          Post a paid flash bounty
        </button>
      </p>
      {phoneGate.gate}
    </div>
  );
}
