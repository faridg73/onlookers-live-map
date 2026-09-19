import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useRef, useState } from "react";
import { format } from "date-fns";
import {
  ArrowLeft,
  Building2,
  CalendarClock,
  ChevronDown,
  CloudRain,
  CoinsIcon,
  GraduationCap,
  Home,
  Info,
  KeyRound,
  MapPin,
  Mic,
  MicOff,
  Radio,
  Search,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Store,
  Timer,
  Trees,
  Video,
  X,
  Zap,
} from "lucide-react";

import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";

import { BountyAmountPicker } from "@/components/BountyAmountPicker";
import { BountyPriceBreakdown } from "@/components/BountyPriceBreakdown";
import { BroadcastComposer } from "@/components/BroadcastComposer";
import { BountyTipPicker } from "@/components/BountyTipPicker";
import { BroadcastCategoryPicker } from "@/components/BroadcastCategoryPicker";
import { BuyCreditsSheet } from "@/components/BuyCreditsSheet";
import { ContentModerationAlertModal } from "@/components/ContentModerationAlertModal";
import { DeadlinePickerDialog } from "@/components/DeadlinePickerDialog";
import { LocationPreviewMap, type PickedLocation } from "@/components/LocationPreviewMap";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { PUBLIC_HAPPENINGS_DISCLAIMER, VENUE_EXTERIOR_DISCLAIMER } from "@/lib/camera-only";
import { lockBounty, MIN_BOUNTY, readWalletBalance } from "@/lib/bounty-escrow";
import {
  BOUNTY_TIERS,
  WEATHER_CONDITIONS,
  quoteBounty,
  type BountyTierId,
} from "@/lib/bounty-pricing";
import { formatCreditCash, formatCredits } from "@/lib/credits";
import { requestCurrentPosition } from "@/lib/geolocation";
import { BLOCKED_REQUEST_MESSAGE, isRequestAllowed } from "@/lib/moderation";
import {
  CAPTURE_OPTIONS,
  MAX_CAPTURE_MINUTES,
  captureDurationLabel,
  suggestedBountyForCapture,
  type CaptureDuration,
} from "@/lib/capture-format";
import {
  generateAccessCode,
  needsAccessCode,
  needsPermissionConfirmation,
  needsPublicSpacesNotice,
  type CategoryId,
} from "@/lib/onlooker";
import {
  broadcastCategoryById,
  type BroadcastCategoryId,
} from "@/lib/broadcast-categories";
import { useOnlooker } from "@/lib/onlooker-store";
import { usePhoneGate } from "@/components/PhoneGate";
import { readRecentPlaces, rememberRecentPlace, type RecentPlace } from "@/lib/recent-places";
import { useVoiceInput } from "@/lib/use-voice-input";
import { reverseGeocode } from "@/lib/geocode.functions";
import { searchRequestVenues, type DiscoveredPlace } from "@/lib/places.functions";
import {
  parseRequestIntent,
  VENUE_QUICK_SEARCHES,
  type RequestAction,
} from "@/lib/request-intent";

export const Route = createFileRoute("/post")({
  validateSearch: (search: Record<string, unknown>): { mystery?: "1" } =>
    search["mystery"] === "1" ? { mystery: "1" } : {},
  head: () => ({
    meta: [
      { title: "Post a Live Request | Onlooker LLC" },
      {
        name: "description",
        content: "Describe what you need, choose the exact place, and post a secure live request.",
      },
      { property: "og:title", content: "Post a Live Request | Onlooker LLC" },
      {
        property: "og:description",
        content: "Describe what you need, choose the exact place, and post a secure live request.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PostScreen,
});

const DEADLINES = [
  { minutes: 15, label: "15 min" },
  { minutes: 30, label: "30 min" },
  { minutes: 60, label: "1 hour" },
  { minutes: 1440, label: "24 hours" },
] as const;

/** Every place type a bounty can target, with the lane and search each one uses. */
const PLACE_CATEGORIES = [
  {
    id: "real-estate",
    label: "Real Estate",
    blurb: "Open houses, listings, property tours",
    query: "homes for sale open houses apartment tours",
    icon: Home,
    lane: "real-estate" as BroadcastCategoryId,
  },
  {
    id: "malls-retail",
    label: "Malls & retail",
    blurb: "Shopping centers, stores, sales",
    query: "shopping malls and department stores",
    icon: Store,
    lane: "shopping-retail" as BroadcastCategoryId,
  },
  {
    id: "parks-outdoors",
    label: "Parks & outdoors",
    blurb: "Trails, beaches, recreation areas",
    query: "parks trailheads beaches recreation centers",
    icon: Trees,
    lane: "nature-wildlife" as BroadcastCategoryId,
  },
  {
    id: "schools-colleges",
    label: "Schools & colleges",
    blurb: "Campuses, games, public events",
    query: "high schools community colleges universities",
    icon: GraduationCap,
    lane: "events-sports" as BroadcastCategoryId,
  },
  {
    id: "community-hubs",
    label: "Community hubs",
    blurb: "Libraries, civic centers, plazas",
    query: "libraries civic centers public plazas",
    icon: Building2,
    lane: "community-culture" as BroadcastCategoryId,
  },
  {
    id: "emergency-safety",
    label: "Emergency / Safety",
    blurb: "Incidents, hazards, road closures",
    query: "emergency services hospitals fire stations",
    icon: ShieldAlert,
    lane: "breaking-incidents" as BroadcastCategoryId,
  },
] as const;

type PlaceCategoryId = (typeof PLACE_CATEGORIES)[number]["id"];


const ACTIONS: Array<{ id: RequestAction; label: string; copy: string; icon: typeof Radio }> = [
  { id: "live", label: "Go Live Now", copy: "Alert nearby hunters immediately", icon: Radio },
  { id: "clip", label: "Request Video Clip", copy: "Receive a short live-captured video", icon: Video },
  { id: "meetup", label: "Spontaneous Meetup", copy: "Broadcast a time-sensitive alert for nearby users to gather or meet up right now.", icon: Zap },
];

/** How the requester wants the shot framed. */
const CAMERA_ANGLES = [
  { id: "wide", label: "Wide establishing" },
  { id: "close", label: "Close-up detail" },
  { id: "walk", label: "Walkthrough" },
  { id: "crowd", label: "Crowd / people flow" },
] as const;

const ORIENTATIONS = [
  { id: "vertical", label: "Vertical" },
  { id: "horizontal", label: "Horizontal" },
] as const;

function PostScreen() {
  const { addRequest } = useOnlooker();
  const navigate = useNavigate();
  const { mystery } = Route.useSearch();
  const phoneGate = usePhoneGate("before credits go into escrow");
  const searchVenues = useServerFn(searchRequestVenues);
  const [mode, setMode] = useState<"broadcast" | "bounty" | null>(null);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [prompt, setPrompt] = useState("");
  const parsed = useMemo(() => parseRequestIntent(prompt), [prompt]);
  const [title, setTitle] = useState("");
  const titleRef = useRef<HTMLInputElement>(null);
  const [place, setPlace] = useState("");
  const [venueQuery, setVenueQuery] = useState("");
  const [venueResults, setVenueResults] = useState<DiscoveredPlace[]>([]);
  const [venueBusy, setVenueBusy] = useState(false);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [searchOrigin, setSearchOrigin] = useState<{ latitude: number; longitude: number } | null>(null);
  const [spot, setSpot] = useState<PickedLocation | null>(null);
  const [action, setAction] = useState<RequestAction>("clip");
  const [note, setNote] = useState("");
  const noteRef = useRef<HTMLTextAreaElement>(null);
  const [bounty, setBounty] = useState(20);
  const [tip, setTip] = useState(0);
  const [minutes, setMinutes] = useState(60);
  const [customDeadline, setCustomDeadline] = useState<Date | null>(null);
  const [deadlineOpen, setDeadlineOpen] = useState(false);
  const [scheduledStart, setScheduledStart] = useState<Date | null>(null);
  const [startOpen, setStartOpen] = useState(false);
  const [capture, setCapture] = useState<CaptureDuration>(5);
  const [customCapture, setCustomCapture] = useState(false);
  const [angle, setAngle] = useState<string>("wide");
  const [orientation, setOrientation] = useState<string>("vertical");
  const [tier, setTier] = useState<BountyTierId>("standard");
  const [weather, setWeather] = useState(1);
  const [categoryId, setCategoryId] = useState<BroadcastCategoryId>("breaking-incidents");
  const [subcategory, setSubcategory] = useState<string | null>(null);
  const [placeCategoryId, setPlaceCategoryId] = useState<PlaceCategoryId | null>(null);

  const [balance, setBalance] = useState<number | null>(null);
  const [posting, setPosting] = useState(false);
  const [moderationOpen, setModerationOpen] = useState(false);
  const [permissionOk, setPermissionOk] = useState(false);
  const [accessCode, setAccessCode] = useState("");
  const [recent, setRecent] = useState<RecentPlace[]>([]);
  const [gpsBusy, setGpsBusy] = useState(false);
  /** Refill panel, so a short wallet never ends the journey. */
  const [topUpOpen, setTopUpOpen] = useState(false);
  const voice = useVoiceInput((text) => setPrompt(text));
  const selectedCategory = broadcastCategoryById(categoryId);
  const category: CategoryId = selectedCategory.requestCategory;
  const permissionNeeded = needsPermissionConfirmation(category);
  const codeNeeded = needsAccessCode(category);

  /** Minutes from now until the hunter is due, used for the urgency premium. */
  const minutesUntilDue = useMemo(() => {
    const target = customDeadline
      ? customDeadline.getTime()
      : action === "clip" && scheduledStart
        ? scheduledStart.getTime()
        : Date.now() + minutes * 60_000;
    return Math.round((target - Date.now()) / 60_000);
  }, [action, customDeadline, minutes, scheduledStart]);

  const quote = useMemo(
    () =>
      quoteBounty({
        tier,
        customBase: Number.isFinite(bounty) ? bounty : 0,
        durationMinutes: capture ?? 30,
        minutesUntilDue,
        weatherMultiplier: weather,
      }),
    [bounty, capture, minutesUntilDue, tier, weather],
  );

  const total = quote.total + (Number.isFinite(tip) ? tip : 0);

  useEffect(() => {
    void readWalletBalance().then(setBalance);
    setRecent(readRecentPlaces());
  }, []);

  useEffect(() => {
    if (mystery !== "1") return;
    setMode("bounty");
    setPrompt("Request a live video of a strange sighting, unexplained light, or unusual aircraft");
    setTitle("Investigate a strange sighting");
    setNote("Capture a clear, steady view of the sighting and its surroundings without approaching anything unsafe.");
  }, [mystery]);

  useEffect(() => {
    if (voice.error) toast.error(voice.error);
  }, [voice.error]);

  useEffect(() => {
    let active = true;
    void supabase.auth
      .getSession()
      .then(({ data }) => {
        if (active) setSignedIn(Boolean(data.session));
      })
      .catch(() => {
        if (active) setSignedIn(false);
      });
    const { data: authSub } = supabase.auth.onAuthStateChange((_event, session) => {
      setSignedIn(Boolean(session));
    });
    return () => {
      active = false;
      authSub.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (step !== 1 || !signedIn || venueQuery.trim().length < 2) return;
    let active = true;
    const timer = window.setTimeout(() => {
      setVenueBusy(true);
      void searchVenues({
        data: {
          query: venueQuery.trim(),
          maxResults: 6,
          ...(searchOrigin ?? {}),
        },
      })
        .then((rows) => {
          if (active) setVenueResults(rows);
        })
        .catch((error: unknown) => {
          if (active) toast.error(error instanceof Error ? error.message : "Venue search failed.");
        })
        .finally(() => {
          if (active) setVenueBusy(false);
        });
    }, 400);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [searchOrigin, searchVenues, signedIn, step, venueQuery]);

  /** Locks in a capture length and scales the reward up to match it. */
  const applyCapture = (next: CaptureDuration, nextAction: RequestAction = action, keepAction = false) => {
    setCapture(next);
    if (next === null && nextAction !== "meetup") setAction("live");
    if (next !== null && nextAction === "live" && !keepAction) setAction("clip");
    setBounty((current) => Math.max(current, suggestedBountyForCapture(next)));
  };

  const continueFromPrompt = () => {
    if (prompt.trim().length < 8) {
      toast.error("Describe the live view you want in one short sentence.");
      return;
    }
    if (!spot || !place.trim()) {
      toast.error("Pick the exact place, search a venue, tap the map, or use your location.");
      return;
    }
    setAction(parsed.action);
    setTitle((current) => current || parsed.title.slice(0, 120));
    setNote((current) => current || parsed.instructions);
    if (parsed.action === "live") setMinutes(15);
    setCustomCapture(false);
    applyCapture(parsed.action === "live" ? null : (parsed.durationMinutes ?? 5), parsed.action);
    if (parsed.action === "meetup") {
      setMinutes(60);
      setCategoryId("community-culture");
      setSubcategory("Gatherings");
    }
    setStep(2);
  };

  const continueFromDetails = () => {
    if (title.trim().length < 4) {
      toast.error("Give the request a short title.");
      return;
    }
    if (note.trim().length < 10) {
      toast.error("Tell the hunter exactly what to film.");
      return;
    }
    if (action === "clip" && scheduledStart && scheduledStart.getTime() <= Date.now()) {
      toast.error("Pick a recording start time in the future.");
      return;
    }
    if (capture !== null && (capture < 1 || capture > MAX_CAPTURE_MINUTES)) {
      toast.error(`Pick a capture length between 1 and ${MAX_CAPTURE_MINUTES} minutes.`);
      return;
    }
    setStep(3);
  };

  const chooseVenue = (venue: DiscoveredPlace) => {
    const formatted = venue.address ? `${venue.name}, ${venue.address}` : venue.name;
    setPlace(formatted);
    setVenueQuery(venue.name);
    setSpot({ latitude: venue.latitude, longitude: venue.longitude, formatted });
    setRecent(
      rememberRecentPlace({
        formatted,
        latitude: venue.latitude,
        longitude: venue.longitude,
        label: venue.name,
      }),
    );
  };

  const chooseRecent = (entry: RecentPlace) => {
    setPlace(entry.formatted);
    setVenueQuery(entry.label);
    setSpot({ latitude: entry.latitude, longitude: entry.longitude, formatted: entry.formatted });
    setRecent(rememberRecentPlace(entry));
  };

  const useCurrentSpot = async () => {
    setGpsBusy(true);
    try {
      const position = await requestCurrentPosition();
      const { latitude, longitude } = position.coords;
      setSearchOrigin({ latitude, longitude });
      const found = await reverseGeocode({ data: { latitude, longitude } }).catch(() => null);
      const formatted = found?.formatted ?? "My current location";
      setPlace(formatted);
      setVenueQuery(formatted);
      setSpot({ latitude, longitude, formatted });
      setRecent(rememberRecentPlace({ formatted, latitude, longitude }));
    } catch {
      toast.error("Allow location access to use your current spot.");
    } finally {
      setGpsBusy(false);
    }
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    await runSubmit();
  }

  async function runSubmit() {
    if (total < MIN_BOUNTY) {
      toast.error(`Bounties start at ${MIN_BOUNTY} Credits.`);
      return;
    }
    if (note.trim().length < 10) {
      toast.error("Tell the hunter exactly what to film before going live.");
      return;
    }
    if (customDeadline && customDeadline.getTime() <= Date.now()) {
      toast.error("Pick a deadline in the future.");
      return;
    }
    if (permissionNeeded && !permissionOk) {
      toast.error("Confirm you have permission from the seller, agent or property manager first.");
      return;
    }
    if (codeNeeded && accessCode.trim().length < 4) {
      toast.error("Add a 6-digit code or word the onlooker can quote on site.");
      return;
    }
    if (!isRequestAllowed(title, note, place)) {
      setModerationOpen(true);
      return;
    }
    // Credits only leave a wallet once the number behind the account is confirmed.
    if (!(await phoneGate.ensureVerified(() => void runSubmit()))) return;
    const funds = await readWalletBalance();
    setBalance(funds);
    if (funds !== null && funds < total) {
      toast.error(`You have ${Math.round(funds)} Credits in your wallet`, {
        description: `Buy Credits to lock a ${total} Credits bounty${tip > 0 ? " including your tip" : ""}.`,
        action: { label: "Buy credits", onClick: () => setTopUpOpen(true) },
      });
      setTopUpOpen(true);
      return;
    }
    setPosting(true);
    try {
      const actionLabel = ACTIONS.find((item) => item.id === action)?.label ?? "Request Video Clip";
      const angleLabel = CAMERA_ANGLES.find((item) => item.id === angle)?.label ?? "Wide establishing";
      const orientationLabel = ORIENTATIONS.find((item) => item.id === orientation)?.label ?? "Vertical";
      const detailLines = [
        `Format: ${actionLabel}`,
        `Requested capture: ${captureDurationLabel(capture, action === "live")}`,
        `Camera: ${angleLabel} · ${orientationLabel}`,
        scheduledStart ? `Start recording: ${format(scheduledStart, "EEE, MMM d 'at' h:mm a")}` : "",
        `Category: ${selectedCategory.label}`,
        subcategory ? `Vibe: ${subcategory}` : "",
        note.trim(),
        tip > 0 ? `Includes a ${tip} Credits tip from the requester's credit wallet.` : "",
      ].filter(Boolean);
      const details = detailLines.join("\n");
      const locked = await lockBounty({
        prompt: title.trim(),
        details,
        locationName: place.trim(),
        bounty: total,
        category,
        authorizationConfirmed: permissionNeeded && permissionOk,
        accessCode: codeNeeded ? accessCode.trim() : null,
        latitude: spot?.latitude,
        longitude: spot?.longitude,
        minutes,
        customDeadlineAt: customDeadline ? customDeadline.toISOString() : null,
        durationMinutes: capture ?? null,
        bountyType: action === "clip" ? "pre_recorded_clip" : "live_stream",
        scheduledStartAt: scheduledStart ? scheduledStart.toISOString() : null,
        customDurationMinutes: customCapture ? capture : null,
        weatherMultiplier: weather,
        bountyTier: tier,
      });
      setBalance(locked.balance);
      addRequest({
        title: title.trim(),
        place: place.trim(),
        note: details,
        bounty: total,
        category,
        instructions: details,
        accessCode: codeNeeded ? accessCode.trim() : undefined,
        dbId: locked.id,
        lat: spot?.latitude,
        lng: spot?.longitude,
        expiresInMin: customDeadline
          ? Math.max(1, Math.round((customDeadline.getTime() - Date.now()) / 60_000))
          : minutes,
      });
      const deadlineLabel = customDeadline
        ? format(customDeadline, "MMM d, h:mm a")
        : (DEADLINES.find((item) => item.minutes === minutes)?.label ?? `${minutes} min`);
      toast.success("Request is live", {
        description: `${total} Credits held in escrow. Expires ${customDeadline ? "at" : "in"} ${deadlineLabel} if nobody claims it.`,
      });
      await navigate({ to: "/feed" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (message === BLOCKED_REQUEST_MESSAGE) setModerationOpen(true);
      else toast.error(message || "Could not post the request.");
    } finally {
      setPosting(false);
    }
  }

  const pill = (on: boolean) =>
    `h-11 rounded-full text-xs font-extrabold ${on ? "border-signal bg-signal text-signal-foreground hover:bg-signal hover:text-signal-foreground" : "bg-surface-raised"}`;

  return (
    <main className="fixed inset-0 z-50 bg-background/90 backdrop-blur-sm">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="post-wizard-title"
        className="absolute inset-x-0 bottom-0 top-3 flex flex-col overflow-hidden rounded-t-2xl border border-border bg-surface shadow-2xl sm:inset-x-[max(1rem,calc(50%-28rem))] sm:bottom-5 sm:top-5 sm:rounded-2xl"
      >
        <header className="shrink-0 border-b border-border bg-surface px-4 pb-3 pt-[max(1rem,env(safe-area-inset-top))] sm:px-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[0.65rem] font-extrabold uppercase text-signal">
                {mode === "bounty" ? `Step ${step} of 3` : mode === "broadcast" ? "Free broadcast" : "Choose how you go live"}
              </p>
              <h1 id="post-wizard-title" className="font-display text-xl font-extrabold text-foreground">
                {mode === null
                  ? "Broadcast or bounty?"
                  : mode === "broadcast"
                    ? "Stream to your followers"
                    : step === 1
                      ? "What and where?"
                      : step === 2
                        ? "How should it be captured?"
                        : "Reward & escrow"}
              </h1>
            </div>
            <Button type="button" variant="secondary" size="icon" aria-label="Close post request" onClick={() => void navigate({ to: "/" })} className="size-11 shrink-0 rounded-full border border-border bg-secondary/80 shadow-sm">
              <X className="size-5" />
            </Button>
          </div>
          {mode === "bounty" && (
            <div className="mt-3 grid grid-cols-3 gap-1.5" aria-label={`Step ${step} of 3`}>
              {[1, 2, 3].map((item) => (
                <span key={item} className={`h-1 rounded-full ${item <= step ? "bg-signal" : "bg-border"}`} />
              ))}
            </div>
          )}
        </header>

        {mode === null && (
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-5 sm:px-6">
            <div className="mx-auto max-w-2xl animate-rise space-y-3">
              <button
                type="button"
                onClick={() => setMode("broadcast")}
                className="flex w-full items-start gap-3 rounded-xl border border-border bg-background p-4 text-left transition-colors hover:border-signal"
              >
                <Radio className="mt-0.5 size-6 shrink-0 text-signal" />
                <span>
                  <span className="block font-display text-lg font-extrabold text-foreground">
                    Free social broadcast
                  </span>
                  <span className="mt-1 block text-sm text-muted-foreground">
                    Verified creators stream to followers and people nearby. No credits, no escrow.
                  </span>
                </span>
              </button>
              <button
                type="button"
                onClick={() => setMode("bounty")}
                className="flex w-full items-start gap-3 rounded-xl border border-border bg-background p-4 text-left transition-colors hover:border-signal"
              >
                <Zap className="mt-0.5 size-6 shrink-0 text-signal" />
                <span>
                  <span className="block font-display text-lg font-extrabold text-foreground">
                    Paid flash bounty
                  </span>
                  <span className="mt-1 block text-sm text-muted-foreground">
                    Ask someone standing there for a live look. Fast Catch (500), Priority Hunt (1000)
                    or your own amount, held in escrow until you approve.
                  </span>
                </span>
              </button>
            </div>
          </div>
        )}

        {mode === "broadcast" && (
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-5 sm:px-6">
            <BroadcastComposer onSwitchToBounty={() => setMode("bounty")} />
            <div className="mx-auto mt-5 max-w-2xl">
              <Button type="button" variant="outline" className="w-full gap-2" onClick={() => setMode(null)}>
                <ArrowLeft className="size-4" /> Back to broadcast options
              </Button>
            </div>
          </div>
        )}

        {mode === "bounty" && (


        <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-5 sm:px-6">
            {step === 1 && (
              <div className="mx-auto max-w-2xl animate-rise space-y-5">
                <div className="rounded-lg border border-border bg-background p-3 focus-within:border-signal">
                  <div className="flex items-start gap-3">
                    <Search className="mt-1 size-5 shrink-0 text-signal" />
                    <textarea
                      value={prompt}
                      onChange={(event) => setPrompt(event.target.value)}
                      rows={4}
                      autoFocus
                      placeholder="I want a 5-minute live clip of Neiman Marcus at Fashion Island"
                      className="min-h-28 w-full resize-none bg-transparent text-lg font-bold leading-relaxed text-foreground outline-none placeholder:text-muted-foreground"
                    />
                    <Button
                      type="button"
                      variant={voice.listening ? "default" : "outline"}
                      size="icon"
                      aria-pressed={voice.listening}
                      aria-label={voice.listening ? "Stop voice input" : "Speak your request"}
                      title={voice.supported ? "Tap to speak" : "Voice input is not supported in this browser"}
                      onClick={voice.toggle}
                      disabled={!voice.supported}
                      className={`shrink-0 rounded-full ${voice.listening ? "animate-pulse bg-signal text-signal-foreground" : "text-signal"}`}
                    >
                      {voice.supported ? <Mic className="size-5" /> : <MicOff className="size-5" />}
                    </Button>
                  </div>
                  {voice.listening && (
                    <p className="mt-2 pl-8 text-xs font-bold text-signal">Listening… speak your request.</p>
                  )}
                </div>

                <div>
                  <p className="text-xs font-bold uppercase text-muted-foreground">Try one</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {[
                      "Show me the line at South Coast Plaza",
                      "I want a 5-minute clip of Fashion Island",
                      "Spontaneous meetup at Orange Coast College",
                    ].map((example) => (
                      <Button key={example} type="button" variant="outline" size="sm" onClick={() => setPrompt(example)} className="h-auto whitespace-normal py-2 text-left">
                        {example}
                      </Button>
                    ))}
                  </div>
                </div>

                {prompt.trim().length >= 8 && (
                  <div className="rounded-lg border border-border bg-background p-4">
                    <p className="text-xs font-bold uppercase text-muted-foreground">Understood</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="rounded-full bg-signal px-3 py-1 text-xs font-extrabold text-signal-foreground">
                        {ACTIONS.find((item) => item.id === parsed.action)?.label}
                      </span>
                      {parsed.durationMinutes && <span className="rounded-full border border-border px-3 py-1 text-xs font-bold text-foreground">{parsed.durationMinutes} min</span>}
                      {parsed.venue && <span className="rounded-full border border-border px-3 py-1 text-xs font-bold text-foreground">{parsed.venue}</span>}
                    </div>
                  </div>
                )}

                <div className="relative">
                  <Search className="absolute left-3 top-3.5 size-4 text-signal" />
                  <input
                    value={venueQuery}
                    onChange={(event) => setVenueQuery(event.target.value)}
                    placeholder="Search a mall, park, school, library…"
                    className="field pl-10"
                  />
                  {venueBusy && <span className="absolute right-3 top-3.5 size-4 animate-spin rounded-full border-2 border-signal border-t-transparent" />}
                </div>
                {signedIn === false && (
                  <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-background p-3 text-xs font-medium text-muted-foreground">
                    <ShieldCheck className="size-4 shrink-0 text-signal" />
                    <span className="flex-1">Sign in to search places by name. You can still drop a pin on the map or use your current location.</span>
                    <Button type="button" size="sm" variant="outline" onClick={() => void navigate({ to: "/auth" })}>Sign in</Button>
                  </div>
                )}
                <div className="space-y-3 rounded-xl border border-border bg-background p-3">
                  <p className="text-xs font-bold uppercase text-muted-foreground">Category</p>
                  <Select
                    value={placeCategoryId ?? undefined}
                    onValueChange={(next) => choosePlaceCategory(next as PlaceCategoryId)}
                  >
                    <SelectTrigger className="h-auto min-h-14 w-full py-2.5 text-left">
                      <SelectValue placeholder="Choose a category (Real Estate, Malls, Parks…)" />
                    </SelectTrigger>
                    <SelectContent className="max-h-72">
                      {PLACE_CATEGORIES.map(({ id, label, blurb, icon: Icon }) => (
                        <SelectItem key={id} value={id} className="py-2.5">
                          <span className="flex items-start gap-2.5 text-left">
                            <Icon className="mt-0.5 size-4 shrink-0 text-signal" />
                            <span>
                              <span className="block font-extrabold text-foreground">{label}</span>
                              <span className="block text-xs font-medium text-muted-foreground">{blurb}</span>
                            </span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs font-medium text-muted-foreground">
                    Picking a category sets the Flash lane and searches nearby places of that type.
                  </p>
                  {category === "realestate" && (
                    <div className="space-y-3">
                      <p className="flex gap-2 rounded-lg border border-signal/40 bg-signal/5 p-3 text-xs font-medium text-foreground">
                        <KeyRound className="mt-0.5 size-4 shrink-0 text-signal" />
                        <span>
                          <strong className="block">6-digit PIN handshake required</strong>
                          A unique 6-digit PIN is generated when you post. Give it to the on-site
                          seller or agent, the onlooker types it in on site, and footage plus payout
                          stay locked until it matches.
                        </span>
                      </p>
                      {permissionNeeded && (
                        <label className="flex cursor-pointer gap-3 rounded-lg border-2 border-signal/50 bg-signal/5 p-3 text-xs text-foreground">
                          <input
                            type="checkbox"
                            checked={permissionOk}
                            onChange={(event) => setPermissionOk(event.target.checked)}
                            className="mt-0.5 size-4 shrink-0 accent-signal"
                          />
                          <span>
                            <strong className="block">Authorization required</strong>
                            Confirm explicit authorization from the seller, listing agent, property
                            manager, or other authorized party to photograph or film this property.
                          </span>
                        </label>
                      )}
                    </div>
                  )}
                  {placeCategoryId === "emergency-safety" && (
                    <p className="flex gap-2 rounded-lg border border-live/50 bg-live/5 p-3 text-xs font-medium text-foreground">
                      <Timer className="mt-0.5 size-4 shrink-0 text-live" />
                      <span>
                        <strong className="block">Fast Catch priority timer on</strong>
                        This request goes live to nearby onlookers first with a 15-minute window. You
                        can change the tier and timer on the reward step.
                      </span>
                    </p>
                  )}
                </div>

                <div className="flex gap-2 overflow-x-auto pb-1">
                  {VENUE_QUICK_SEARCHES.map((venue) => (
                    <Button key={venue.label} type="button" variant="secondary" size="sm" onClick={() => setVenueQuery(venue.query)} className="shrink-0">
                      {venue.label}
                    </Button>
                  ))}
                </div>
                <div>
                  <p className="text-xs font-bold uppercase text-muted-foreground">Recent spots</p>
                  <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => void useCurrentSpot()}
                      disabled={gpsBusy}
                      className="shrink-0 gap-1.5"
                    >
                      <MapPin className="size-3.5 text-signal" />
                      {gpsBusy ? "Locating…" : "My location"}
                    </Button>
                    {recent.map((entry) => (
                      <Button
                        key={`${entry.latitude},${entry.longitude}`}
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => chooseRecent(entry)}
                        className="shrink-0 gap-1.5"
                      >
                        <MapPin className="size-3.5 text-signal" />
                        {entry.label}
                      </Button>
                    ))}
                  </div>
                </div>
                {venueResults.length > 0 && (
                  <div className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-background">
                    {venueResults.map((venue) => (
                      <Button key={venue.id} type="button" variant="ghost" onClick={() => chooseVenue(venue)} className="h-auto w-full justify-start rounded-none px-3 py-3 text-left">
                        <MapPin className="mr-3 size-4 shrink-0 text-signal" />
                        <span className="min-w-0">
                          <span className="block truncate font-bold text-foreground">{venue.name}</span>
                          <span className="block truncate text-xs text-muted-foreground">{venue.address ?? venue.primaryType ?? "Public place"}</span>
                        </span>
                      </Button>
                    ))}
                  </div>
                )}
                <LocationPreviewMap
                  address={place || venueQuery || [parsed.venue, parsed.locationContext].filter(Boolean).join(" ")}
                  selectedLocation={spot}
                  onPick={(next) => {
                    setSpot(next);
                    setPlace(next.formatted);
                    setRecent(rememberRecentPlace(next));
                  }}
                />
              </div>
            )}

            {step === 2 && (
              <div className="mx-auto max-w-2xl animate-rise space-y-5">
                <div className="grid gap-2 sm:grid-cols-3">
                  {ACTIONS.map(({ id, label, copy, icon: Icon }) => (
                    <Button
                      key={id}
                      type="button"
                      variant="outline"
                      aria-pressed={action === id}
                      onClick={() => {
                        setAction(id);
                        if (id === "live") {
                          setMinutes(15);
                          setCustomCapture(false);
                          setScheduledStart(null);
                          applyCapture(null, id);
                        }
                        if (id === "clip" && capture === null) {
                          setCustomCapture(false);
                          applyCapture(5, id);
                        }
                        if (id === "meetup") {
                          setMinutes(60);
                          setScheduledStart(null);
                          setCategoryId("community-culture");
                          setSubcategory("Gatherings");
                        }
                      }}
                      className={`h-auto items-start justify-start gap-3 whitespace-normal p-3 text-left transition-all ${action === id ? "border-signal bg-signal/10 shadow-lg shadow-signal/10" : ""}`}
                    >
                      <Icon className="mt-0.5 size-5 shrink-0 text-signal" />
                      <span><span className="block font-extrabold text-foreground">{label}</span><span className="mt-1 block text-xs font-medium text-muted-foreground">{copy}</span></span>
                    </Button>
                  ))}
                </div>

                <div>
                  <p className="text-xs font-bold uppercase text-muted-foreground">Category & focus</p>
                  <div className="mt-3">
                    <BroadcastCategoryPicker
                      categoryId={categoryId}
                      subcategory={subcategory}
                      onCategoryChange={(next) => {
                        if (next) {
                          setCategoryId(next);
                          setPermissionOk(false);
                        }
                      }}
                      onSubcategoryChange={setSubcategory}
                      laneLabel="Flash lane"
                      menuLabel="Choose a Flash lane"
                    />
                  </div>
                </div>

                <div className="rounded-xl border border-border bg-background p-3">
                  <p className="text-xs font-bold uppercase text-muted-foreground">
                    {action === "live" ? "Stream length" : "Clip length"}
                  </p>
                  <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5">
                    {CAPTURE_OPTIONS.map((option) => {
                      const on = !customCapture && capture === option.minutes;
                      return (
                        <Button
                          key={option.id}
                          type="button"
                          variant="outline"
                          aria-pressed={on}
                          onClick={() => {
                            setCustomCapture(false);
                            applyCapture(option.minutes);
                          }}
                          className={pill(on)}
                        >
                          {option.minutes === null && <Radio className="size-3.5" />}
                          {option.label}
                        </Button>
                      );
                    })}
                    <Button
                      type="button"
                      variant="outline"
                      aria-pressed={customCapture}
                      onClick={() => {
                        setCustomCapture(true);
                        applyCapture(capture ?? 10, action, true);
                      }}
                      className={pill(customCapture)}
                    >
                      Custom
                    </Button>
                  </div>
                  {customCapture && (
                    <label className="mt-3 flex items-center gap-2">
                      <input
                        type="number"
                        min={1}
                        max={MAX_CAPTURE_MINUTES}
                        value={capture ?? 10}
                        onChange={(event) => {
                          const next = Number(event.target.value);
                          if (!Number.isFinite(next)) return;
                          applyCapture(Math.max(1, Math.min(MAX_CAPTURE_MINUTES, Math.round(next))), action, true);
                        }}
                        className="field w-24"
                      />
                      <span className="text-xs font-medium text-muted-foreground">minutes (up to {MAX_CAPTURE_MINUTES})</span>
                    </label>
                  )}
                  <p className="mt-3 text-xs font-medium text-muted-foreground">
                    {captureDurationLabel(capture, action === "live")} · suggested reward {formatCredits(suggestedBountyForCapture(capture))} ({formatCreditCash(suggestedBountyForCapture(capture))})
                    {capture === null && ", the onlooker streams until you end the session."}
                  </p>
                </div>

                {action === "clip" && (
                  <div className="rounded-xl border border-border bg-background p-3">
                    <p className="text-xs font-bold uppercase text-muted-foreground">Scheduled start window (optional)</p>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <Button type="button" variant="outline" onClick={() => setStartOpen(true)} className="gap-2">
                        <CalendarClock className="size-4 text-signal" />
                        {scheduledStart ? format(scheduledStart, "EEE, MMM d 'at' h:mm a") : "Pick a start time"}
                      </Button>
                      {scheduledStart && (
                        <Button type="button" variant="ghost" size="sm" onClick={() => setScheduledStart(null)} className="text-signal">
                          Clear start time
                        </Button>
                      )}
                    </div>
                  </div>
                )}

                <div className="rounded-xl border border-border bg-background p-3">
                  <p className="text-xs font-bold uppercase text-muted-foreground">Camera angle</p>
                  <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {CAMERA_ANGLES.map((option) => (
                      <Button
                        key={option.id}
                        type="button"
                        variant="outline"
                        aria-pressed={angle === option.id}
                        onClick={() => setAngle(option.id)}
                        className={`${pill(angle === option.id)} whitespace-normal`}
                      >
                        {option.label}
                      </Button>
                    ))}
                  </div>
                  <p className="mt-4 text-xs font-bold uppercase text-muted-foreground">Orientation</p>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {ORIENTATIONS.map((option) => (
                      <Button
                        key={option.id}
                        type="button"
                        variant="outline"
                        aria-pressed={orientation === option.id}
                        onClick={() => setOrientation(option.id)}
                        className={`${pill(orientation === option.id)} gap-2`}
                      >
                        <Smartphone className={`size-3.5 ${option.id === "horizontal" ? "rotate-90" : ""}`} />
                        {option.label}
                      </Button>
                    ))}
                  </div>
                </div>

                <label className="block space-y-2">
                  <span className="text-xs font-bold uppercase text-muted-foreground">Request title</span>
                  <input ref={titleRef} value={title} onChange={(event) => setTitle(event.target.value)} required maxLength={120} className="field" />
                </label>
                <label className="block space-y-2">
                  <span className="text-xs font-bold uppercase text-muted-foreground">Camera instructions</span>
                  <textarea ref={noteRef} value={note} onChange={(event) => setNote(event.target.value)} rows={3} required minLength={10} className="field resize-none" />
                </label>

                <Collapsible defaultOpen={permissionNeeded}>
                  <CollapsibleTrigger className="group flex w-full items-center gap-2 rounded-lg border border-border bg-background px-3 py-3 text-left text-sm font-bold text-foreground">
                    <Info className="size-4 text-signal" /><span className="flex-1">Privacy & access</span><ChevronDown className="size-4 transition-transform group-data-[state=open]:rotate-180" />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-3 space-y-4">
                    <div className="rounded-lg border border-border bg-background p-3 text-xs text-muted-foreground">
                      <p className="flex gap-2"><ShieldCheck className="size-4 shrink-0 text-signal" />{VENUE_EXTERIOR_DISCLAIMER}</p>
                       {needsPublicSpacesNotice(category) && <p className="mt-2 flex gap-2"><ShieldCheck className="size-4 shrink-0 text-signal" />{PUBLIC_HAPPENINGS_DISCLAIMER}</p>}
                    </div>
                    {codeNeeded && (
                      <div className="flex gap-2">
                        <input value={accessCode} onChange={(event) => setAccessCode(event.target.value)} maxLength={40} placeholder="Private access passcode" className="field" />
                        <Button type="button" variant="outline" onClick={() => setAccessCode(generateAccessCode())}>Generate</Button>
                      </div>
                    )}
                  </CollapsibleContent>
                </Collapsible>
                {permissionNeeded && (
                  <label className="flex cursor-pointer gap-3 rounded-lg border-2 border-signal/50 bg-signal/5 p-3 text-xs text-foreground">
                    <input
                      type="checkbox"
                      required
                      checked={permissionOk}
                      onChange={(event) => setPermissionOk(event.target.checked)}
                      className="mt-0.5 size-4 shrink-0 accent-signal"
                    />
                    <span>
                      <strong className="block">Authorization required</strong>
                      Confirm explicit authorization from the seller, listing agent, property manager,
                      or other authorized party to photograph or film this property.
                    </span>
                  </label>
                )}
              </div>
            )}

            {step === 3 && (
              <div className="mx-auto max-w-2xl animate-rise space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-background p-3">
                  <p className="text-xs font-bold text-muted-foreground">
                    <CoinsIcon className="mr-1 inline size-3.5 text-signal" />
                    Wallet:{" "}
                    <span className="font-extrabold text-foreground">
                      {balance != null ? formatCredits(balance) : "sign in to see"}
                    </span>
                    {balance != null && balance < total ? (
                      <span className="ml-1 text-live">· {formatCredits(Math.ceil(total - balance))} short</span>
                    ) : null}
                  </p>
                  <Button type="button" variant="outline" size="sm" onClick={() => setTopUpOpen(true)} className="gap-1.5">
                    <CoinsIcon className="size-3.5 text-signal" /> Buy credits
                  </Button>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase text-muted-foreground">Reward tier</p>
                  <div className="mt-3 grid gap-2 sm:grid-cols-3">
                    {BOUNTY_TIERS.map((option) => (
                      <Button
                        key={option.id}
                        type="button"
                        variant="outline"
                        aria-pressed={tier === option.id}
                        onClick={() => setTier(option.id)}
                        className={`h-auto items-start justify-start gap-3 whitespace-normal p-3 text-left ${tier === option.id ? "border-signal bg-signal/10" : ""}`}
                      >
                        <Zap className="mt-0.5 size-4 shrink-0 text-signal" />
                        <span>
                          <span className="block font-extrabold text-foreground">{option.label}</span>
                          <span className="mt-1 block text-xs font-medium text-muted-foreground">
                            {option.baseCredits ? `${option.baseCredits} Credits · ${option.blurb}` : option.blurb}
                          </span>
                        </span>
                      </Button>
                    ))}
                  </div>
                </div>

                {tier === "standard" && (
                  <div>
                    <p className="text-xs font-bold uppercase text-muted-foreground">Your reward</p>
                    <div className="mt-3"><BountyAmountPicker value={bounty} onChange={setBounty} balance={balance} /></div>
                  </div>
                )}

                <div>
                  <p className="flex items-center gap-2 text-xs font-bold uppercase text-muted-foreground">
                    <CloudRain className="size-3.5 text-signal" /> Filming conditions
                  </p>
                  <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {WEATHER_CONDITIONS.map((condition) => (
                      <Button
                        key={condition.id}
                        type="button"
                        variant="outline"
                        aria-pressed={weather === condition.multiplier}
                        onClick={() => setWeather(condition.multiplier)}
                        className={`${pill(weather === condition.multiplier)} h-auto whitespace-normal py-2`}
                      >
                        {condition.label}
                        {condition.multiplier > 1 && ` +${Math.round((condition.multiplier - 1) * 100)}%`}
                      </Button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-xs font-bold uppercase text-muted-foreground">Request deadline</p>
                  <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5">
                    {DEADLINES.map((deadline) => {
                      const on = !customDeadline && minutes === deadline.minutes;
                      return (
                        <Button
                          key={deadline.minutes}
                          type="button"
                          variant="outline"
                          aria-pressed={on}
                          onClick={() => {
                            setCustomDeadline(null);
                            setMinutes(deadline.minutes);
                          }}
                          className={pill(on)}
                        >
                          {deadline.label}
                        </Button>
                      );
                    })}
                    <Button
                      type="button"
                      variant="outline"
                      aria-pressed={Boolean(customDeadline)}
                      onClick={() => setDeadlineOpen(true)}
                      className={`${pill(Boolean(customDeadline))} h-auto whitespace-normal py-2`}
                    >
                      {customDeadline ? format(customDeadline, "MMM d, h:mm a") : "Custom"}
                    </Button>
                  </div>
                </div>

                <Collapsible>
                  <CollapsibleTrigger className="group flex w-full items-center gap-2 text-sm font-bold text-muted-foreground">
                    <CoinsIcon className="size-4 text-signal" /><span className="flex-1 text-left">Add an optional tip</span><ChevronDown className="size-4 transition-transform group-data-[state=open]:rotate-180" />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-3"><BountyTipPicker value={tip} onChange={setTip} balance={balance} total={total} /></CollapsibleContent>
                </Collapsible>

                <BountyPriceBreakdown quote={quote} />
                {tip > 0 && (
                  <p className="text-xs font-medium text-muted-foreground">
                    Plus a {formatCredits(tip)} tip, {formatCredits(total)} leaves your wallet.
                  </p>
                )}
                <p className="flex gap-2 rounded-lg border border-border bg-background p-3 text-xs text-muted-foreground">
                  <ShieldCheck className="size-4 shrink-0 text-signal" />Your payment is held securely in escrow and released only after you approve the live capture.
                </p>
              </div>
            )}
          </div>

          <footer className="shrink-0 border-t border-border bg-surface px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 sm:px-6">
            {step === 3 && (
              <div className="mb-3 flex items-center justify-between gap-3 text-sm">
                <span className="font-bold text-muted-foreground">Total escrow</span>
                <span className="font-display text-lg font-extrabold text-signal">{formatCredits(total)} · {formatCreditCash(total)}</span>
              </div>
            )}
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="icon" aria-label="Previous step" onClick={() => (step > 1 ? setStep((step - 1) as 1 | 2) : setMode(null))}><ArrowLeft className="size-5" /></Button>
              {step === 1 && <Button type="button" onClick={continueFromPrompt} className="h-12 flex-1 bg-signal font-extrabold text-signal-foreground">Continue</Button>}
              {step === 2 && <Button type="button" onClick={continueFromDetails} className="h-12 flex-1 bg-signal font-extrabold text-signal-foreground">Set the reward</Button>}
              {step === 3 && <Button type="submit" disabled={posting || total < MIN_BOUNTY || note.trim().length < 10 || (permissionNeeded && !permissionOk) || (codeNeeded && accessCode.trim().length < 4)} className="h-12 flex-1 bg-signal font-extrabold text-signal-foreground">{posting ? "Posting…" : `Lock ${formatCredits(total)}`}</Button>}
            </div>
          </footer>
        </form>
        )}
      </section>

      <DeadlinePickerDialog
        open={deadlineOpen}
        value={customDeadline}
        title="Custom deadline"
        description="Pick the exact date and time the request is due."
        confirmLabel="Set deadline"
        onOpenChange={setDeadlineOpen}
        onPick={(date) => {
          setCustomDeadline(date);
          setDeadlineOpen(false);
        }}
      />
      <DeadlinePickerDialog
        open={startOpen}
        value={scheduledStart}
        title="Recording start"
        description="Pick the exact date and time the onlooker should start recording."
        confirmLabel="Set start"
        onOpenChange={setStartOpen}
        onPick={(date) => {
          setScheduledStart(date);
          setStartOpen(false);
        }}
      />

      <ContentModerationAlertModal
        open={moderationOpen}
        onOpenChange={setModerationOpen}
        onEditRequest={() => {
          setModerationOpen(false);
          window.setTimeout(() => {
            setStep(2);
            if (!isRequestAllowed("", note, "") && isRequestAllowed(title, "", "")) noteRef.current?.focus();
            else titleRef.current?.focus();
          }, 50);
        }}
      />
      <BuyCreditsSheet
        open={topUpOpen}
        balance={balance}
        needed={total}
        onClose={() => {
          setTopUpOpen(false);
          void readWalletBalance().then(setBalance);
        }}
      />
      {phoneGate.gate}
    </main>
  );
}
