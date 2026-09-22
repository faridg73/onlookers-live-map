// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { format } from "date-fns";
import { CalendarIcon, CloudRain, Radio, ShieldCheck, Timer, Video, Zap } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { BountyAmountPicker } from "@/components/BountyAmountPicker";
import { BountyConditionIcon } from "@/components/BountyConditionIcon";
import { BountyPriceBreakdown } from "@/components/BountyPriceBreakdown";
import { lockBounty, readWalletBalance, MIN_BOUNTY } from "@/lib/bounty-escrow";
import {
  BOUNTY_TIERS,
  WEATHER_CONDITIONS,
  quoteBounty,
  tierById,
  type BountyTierId,
} from "@/lib/bounty-pricing";
import { useOnlooker } from "@/lib/onlooker-store";
import { categoryById, needsPermissionConfirmation } from "@/lib/onlooker";
import { BLOCKED_REQUEST_MESSAGE, isRequestAllowed } from "@/lib/moderation";
import type { Venue } from "@/lib/venues";

type Mode = "live" | "clip";

const CLIP_DEADLINES = [
  { minutes: 15, label: "15 min" },
  { minutes: 30, label: "30 min" },
  { minutes: 60, label: "1 hour" },
  { minutes: 1440, label: "24 hours" },
];

const LIVE_WINDOWS = [
  { minutes: 60, label: "Within 1 hour" },
  { minutes: 120, label: "Within 2 hours" },
];

/** Live stream lengths a requester can ask for. */
const LIVE_DURATIONS = [5, 10, 15, 20, 30];

/**
 * Posts a bounty for one venue: either a live stream inside the next hour or
 * two, or a pre-recorded clip with a hard delivery deadline. The credit cost is
 * quoted line by line before any funds are locked in escrow.
 */
export function VenueBountyDialog({
  venue,
  children,
  defaultTitle,
  defaultNote,
}: {
  venue: Venue;
  children: ReactNode;
  /** Pre-filled request title, e.g. the event name tapped in Trending. */
  defaultTitle?: string;
  /** Pre-filled camera instructions for that event. */
  defaultNote?: string;
}) {
  const { addRequest } = useOnlooker();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("live");
  const [minutes, setMinutes] = useState(120);
  const [customDeadline, setCustomDeadline] = useState<Date | null>(null);
  const [customOpen, setCustomOpen] = useState(false);
  const [durationMin, setDurationMin] = useState(5);
  /** Set when the requester types their own capture length instead of a pill. */
  const [customDuration, setCustomDuration] = useState<number | null>(null);
  const [scheduledStart, setScheduledStart] = useState<Date | null>(null);
  const [startOpen, setStartOpen] = useState(false);
  const [tier, setTier] = useState<BountyTierId>("standard");
  const [weather, setWeather] = useState(1);
  const [title, setTitle] = useState(defaultTitle ?? "");
  const [note, setNote] = useState(defaultNote ?? "");
  const [bounty, setBounty] = useState(20);
  const [balance, setBalance] = useState<number | null>(null);
  const [posting, setPosting] = useState(false);
  const [permissionOk, setPermissionOk] = useState(false);
  const permissionNeeded = needsPermissionConfirmation(venue.category);

  useEffect(() => {
    if (!open) return;
    void readWalletBalance().then(setBalance);
    if (defaultTitle) setTitle(defaultTitle);
    if (defaultNote) setNote(defaultNote);
  }, [open, defaultTitle, defaultNote]);

  function pickMode(next: Mode) {
    setMode(next);
    setMinutes(next === "live" ? 120 : 60);
    setCustomDeadline(null);
    setScheduledStart(null);
  }

  /** True when the requester picked an exact calendar deadline. */
  const isCustom = customDeadline !== null;

  const windows = mode === "live" ? LIVE_WINDOWS : CLIP_DEADLINES;
  const windowLabel = isCustom
    ? `by ${format(customDeadline, "EEE, MMM d 'at' h:mm a")}`
    : (windows.find((w) => w.minutes === minutes)?.label ?? `${minutes} min`);

  /** Length of the capture we are actually pricing. */
  const captureMinutes = customDuration ?? durationMin;

  /** Minutes from now until the deadline (or scheduled start) the hunter faces. */
  const minutesUntilDue = useMemo(() => {
    const target = isCustom
      ? customDeadline.getTime()
      : mode === "clip" && scheduledStart
        ? scheduledStart.getTime()
        : Date.now() + minutes * 60_000;
    return Math.round((target - Date.now()) / 60_000);
  }, [isCustom, customDeadline, mode, scheduledStart, minutes]);

  const quote = useMemo(
    () =>
      quoteBounty({
        tier,
        customBase: bounty,
        durationMinutes: captureMinutes,
        minutesUntilDue,
        weatherMultiplier: weather,
      }),
    [tier, bounty, captureMinutes, minutesUntilDue, weather],
  );

  /** What actually leaves the wallet. */
  const total = quote.total;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (title.trim().length < 4) {
      toast.error("Give the request a short title.");
      return;
    }
    if (note.trim().length < 10) {
      toast.error("Say exactly what the hunter should capture.");
      return;
    }
    if (total < MIN_BOUNTY) {
      toast.error(`Bounties start at ${MIN_BOUNTY} Credits.`);
      return;
    }
    if (permissionNeeded && !permissionOk) {
      toast.error("Confirm explicit authorization from the seller, agent, or property manager first.");
      return;
    }
    if (!isRequestAllowed(title, note, venue.name)) {
      toast.error(BLOCKED_REQUEST_MESSAGE, { duration: 12000 });
      return;
    }
    if (isCustom && customDeadline.getTime() <= Date.now()) {
      toast.error("Pick a deadline in the future.");
      return;
    }
    if (mode === "clip" && scheduledStart && scheduledStart.getTime() <= Date.now()) {
      toast.error("Pick a recording start time in the future.");
      return;
    }
    if (captureMinutes < 1 || captureMinutes > 240) {
      toast.error("Capture length must be between 1 and 240 minutes.");
      return;
    }
    const funds = await readWalletBalance();
    setBalance(funds);
    if (funds !== null && funds < total) {
      toast.error(`You have ${Math.round(funds)} Credits in your wallet`, {
        description: `Buy Credits to lock a ${total} Credits bounty.`,
        action: { label: "Top up", onClick: () => void navigate({ to: "/profile" }) },
      });
      return;
    }

    const startNote = scheduledStart
      ? ` Recording starts ${format(scheduledStart, "EEE, MMM d 'at' h:mm a")}.`
      : "";
    const header =
      mode === "live"
        ? `Live: ${captureMinutes}-minute stream from ${venue.name}, starting ${windowLabel.toLowerCase()}.`
        : `Clip: ${captureMinutes}-minute live-captured video from ${venue.name}, delivered ${isCustom ? windowLabel : `within ${windowLabel.toLowerCase()}`}.${startNote}`;
    const details = `${header}\n${note.trim()}`;
    // The store still wants a countdown; derive one from the calendar pick.
    const effectiveMinutes = isCustom
      ? Math.max(15, Math.round((customDeadline.getTime() - Date.now()) / 60_000))
      : minutes;

    setPosting(true);
    try {
      const locked = await lockBounty({
        prompt: title.trim(),
        details: note.trim(),
        locationName: `${venue.name}, ${venue.area}`,
        // Listed venues are businesses or event grounds; private property only
        // rides along when the requester attested to owner permission.
        locationType: permissionNeeded && permissionOk ? "owner_authorized" : "commercial",
        bounty: total,
        category: venue.category,
        authorizationConfirmed: permissionNeeded && permissionOk,
        latitude: venue.latitude,
        longitude: venue.longitude,
        minutes: effectiveMinutes,
        customDeadlineAt: isCustom ? customDeadline.toISOString() : null,
        durationMinutes: captureMinutes,
        customDurationMinutes: customDuration,
        weatherMultiplier: weather,
        bountyTier: tier,
        bountyType: mode === "live" ? "live_stream" : "pre_recorded_clip",
        scheduledStartAt:
          mode === "clip" && scheduledStart ? scheduledStart.toISOString() : null,
      });
      setBalance(locked.balance);
      addRequest({
        title: title.trim(),
        place: `${venue.name}, ${venue.area}`,
        locationType: permissionNeeded && permissionOk ? "owner_authorized" : "commercial",
        note: details,
        bounty: total,
        category: venue.category,
        instructions: details,
        dbId: locked.id,
        expiresInMin: effectiveMinutes,
      });
      toast.success("Bounty is live", {
        description: `${total} Credits held in escrow · ${windowLabel}`,
      });
      setOpen(false);
      setTitle("");
      setNote("");
      setCustomDeadline(null);
      setScheduledStart(null);
      setDurationMin(5);
      setCustomDuration(null);
      setTier("standard");
      setWeather(1);
      setPermissionOk(false);
      void navigate({ to: "/feed" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not post the bounty.");
    } finally {
      setPosting(false);
    }
  }

  const modeCard = (active: boolean) =>
    `flex-1 rounded-2xl border-2 p-3 text-left transition-colors ${
      active
        ? "border-signal bg-signal/10"
        : "border-border bg-surface-raised hover:border-signal/50"
    }`;

  const pill = (active: boolean) =>
    `flex-1 rounded-xl border-2 px-3 py-2.5 text-center text-sm font-extrabold transition-colors ${
      active
        ? "border-signal bg-signal text-signal-foreground"
        : "border-border bg-surface-raised text-foreground hover:border-signal/60"
    }`;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-h-[92dvh] overflow-y-auto overscroll-contain sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Post a bounty</DialogTitle>
          <DialogDescription>
            {venue.name} · {venue.area} · {categoryById(venue.category)?.label}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4">
          <div className="flex gap-2">
            <button type="button" onClick={() => pickMode("live")} aria-pressed={mode === "live"} className={modeCard(mode === "live")}>
              <Radio className="size-4 text-signal" />
              <p className="mt-1.5 text-sm font-extrabold text-foreground">Live stream</p>
              <p className="text-xs text-muted-foreground">Watch it happen in real time, you pick the length</p>
            </button>
            <button type="button" onClick={() => pickMode("clip")} aria-pressed={mode === "clip"} className={modeCard(mode === "clip")}>
              <Video className="size-4 text-signal" />
              <p className="mt-1.5 text-sm font-extrabold text-foreground">Pre-recorded clip</p>
              <p className="text-xs text-muted-foreground">Delivered by a hard deadline</p>
            </button>
          </div>

          <label className="block space-y-1.5">
            <span className="text-[0.7rem] font-extrabold uppercase tracking-[0.16em] text-foreground">
              Title
            </span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={120}
              required
              placeholder={`How busy is ${venue.name} right now?`}
              className="field"
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-[0.7rem] font-extrabold uppercase tracking-[0.16em] text-foreground">
              Camera instructions
            </span>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              required
              minLength={10}
              placeholder="Where to stand, what to pan across, what detail matters most."
              className="field resize-none"
            />
          </label>

          <div className="space-y-2">
            <span className="text-[0.7rem] font-extrabold uppercase tracking-[0.16em] text-foreground">
              {mode === "live" ? "Start window" : "Delivery deadline"}
            </span>
            <div className="flex flex-wrap gap-2">
              {windows.map(({ minutes: m, label }) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => {
                    setMinutes(m);
                    setCustomDeadline(null);
                  }}
                  aria-pressed={!isCustom && minutes === m}
                  className={pill(!isCustom && minutes === m)}
                >
                  {label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setCustomOpen(true)}
                aria-pressed={isCustom}
                className={pill(isCustom)}
              >
                {isCustom ? format(customDeadline, "MMM d, h:mm a") : "Custom"}
              </button>
            </div>
            <p className="flex items-start gap-2 text-xs text-muted-foreground">
              <Timer className="mt-0.5 size-3.5 shrink-0 text-signal" />
              <span>
                If nobody claims it in time the bounty expires, leaves the live map, and your money
                returns to your wallet.
              </span>
            </p>
          </div>

          <div className="space-y-2">
            <span className="text-[0.7rem] font-extrabold uppercase tracking-[0.16em] text-foreground">
              {mode === "live" ? "Stream length" : "Clip length"}
            </span>
            <div className="flex flex-wrap gap-2">
              {LIVE_DURATIONS.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => {
                    setDurationMin(d);
                    setCustomDuration(null);
                  }}
                  aria-pressed={customDuration === null && durationMin === d}
                  className={pill(customDuration === null && durationMin === d)}
                >
                  {d} min
                </button>
              ))}
              <button
                type="button"
                onClick={() => setCustomDuration(customDuration ?? durationMin)}
                aria-pressed={customDuration !== null}
                className={pill(customDuration !== null)}
              >
                Custom
              </button>
            </div>
            {customDuration !== null && (
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                <input
                  type="number"
                  min={1}
                  max={240}
                  value={customDuration}
                  onChange={(e) => setCustomDuration(Math.max(0, Number(e.target.value)) || 0)}
                  aria-label="Custom capture length in minutes"
                  className="field w-24"
                />
                <span>minutes (1, 240)</span>
              </label>
            )}
          </div>

          {mode === "clip" && (
            <div className="space-y-2">
              <span className="text-[0.7rem] font-extrabold uppercase tracking-[0.16em] text-foreground">
                Recording start (optional)
              </span>
              <button
                type="button"
                onClick={() => setStartOpen(true)}
                className="flex w-full items-center gap-2 rounded-xl border-2 border-border bg-surface-raised px-3 py-2.5 text-left text-sm font-extrabold text-foreground transition-colors hover:border-signal/60"
              >
                <CalendarIcon className="size-4 shrink-0 text-signal" />
                {scheduledStart
                  ? format(scheduledStart, "EEE, MMM d 'at' h:mm a")
                  : "Pick when the recording should start"}
              </button>
              {scheduledStart && (
                <button
                  type="button"
                  onClick={() => setScheduledStart(null)}
                  className="text-xs font-semibold text-muted-foreground underline underline-offset-2"
                >
                  Clear start time, onlooker records as soon as claimed
                </button>
              )}
            </div>
          )}

          <div className="space-y-2">
            <span className="flex items-center gap-2 text-[0.7rem] font-extrabold uppercase tracking-[0.16em] text-foreground">
              <Zap className="size-3.5 text-signal" />
              Reward tier
            </span>
            <div className="flex flex-wrap gap-2">
              {BOUNTY_TIERS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTier(t.id)}
                  aria-pressed={tier === t.id}
                  className={`${pill(tier === t.id)} min-w-[8rem] leading-tight`}
                >
                  {t.label}
                  <span className="mt-0.5 block text-[0.65rem] font-semibold opacity-80">
                    {t.baseCredits ? `${t.baseCredits} credits` : "Your amount"}
                  </span>
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">{tierById(tier).blurb}</p>
          </div>

          {tierById(tier).baseCredits === null && (
            <div className="space-y-2">
              <span className="text-[0.7rem] font-extrabold uppercase tracking-[0.16em] text-foreground">
                Base reward
              </span>
              <BountyAmountPicker value={bounty} onChange={setBounty} balance={balance} />
            </div>
          )}

          <div className="space-y-2">
            <span className="flex items-center gap-2 text-[0.7rem] font-extrabold uppercase tracking-[0.16em] text-foreground">
              <CloudRain className="size-3.5 text-signal" />
              Filming conditions
            </span>
            <div className="flex flex-wrap gap-2">
              {WEATHER_CONDITIONS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setWeather(c.multiplier)}
                  aria-pressed={weather === c.multiplier}
                  className={`${pill(weather === c.multiplier)} min-w-[7.5rem] leading-tight`}
                >
                  <BountyConditionIcon id={c.id} className="mx-auto mb-1 size-4 shrink-0" />
                  {c.label}
                  <span className="mt-0.5 block text-[0.65rem] font-semibold opacity-80">
                    {c.multiplier === 1 ? "no extra" : `+${Math.round((c.multiplier - 1) * 100)}%`}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <BountyPriceBreakdown quote={quote} />
          <p className="flex items-start gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-signal" />
            <span>
              Held securely in escrow and only released once you review and approve the video.
            </span>
          </p>

          {permissionNeeded && (
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border-2 border-signal/50 bg-signal/5 p-3 text-xs text-foreground">
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

          <button
            type="submit"
            disabled={posting || total < MIN_BOUNTY || (permissionNeeded && !permissionOk)}
            className="w-full rounded-2xl bg-signal py-3.5 text-sm font-extrabold uppercase tracking-[0.16em] text-signal-foreground disabled:opacity-40"
          >
            {posting ? "Locking bounty…" : `Lock ${Number.isFinite(total) ? total : 0} Credits`}
          </button>
        </form>
      </DialogContent>

      <CustomDeadlinePicker
        open={customOpen}
        value={customDeadline}
        title="Custom deadline"
        description="Pick the exact date and time the clip is due."
        onOpenChange={setCustomOpen}
        onPick={(date) => {
          setCustomDeadline(date);
          setCustomOpen(false);
        }}
      />
      <CustomDeadlinePicker
        open={startOpen}
        value={scheduledStart}
        title="Recording start"
        description="Pick the exact date and time the onlooker should start recording."
        onOpenChange={setStartOpen}
        onPick={(date) => {
          setScheduledStart(date);
          setStartOpen(false);
        }}
      />
    </Dialog>
  );
}

/** Exact calendar date + hour/minute picker behind the "Custom" deadline pill. */
function CustomDeadlinePicker({
  open,
  value,
  title,
  description,
  onOpenChange,
  onPick,
}: {
  open: boolean;
  value: Date | null;
  title: string;
  description: string;
  onOpenChange: (open: boolean) => void;
  onPick: (date: Date) => void;
}) {
  const now = new Date();
  const [day, setDay] = useState<Date | undefined>(value ?? undefined);
  const [hour, setHour] = useState(value?.getHours() ?? 18);
  const [minute, setMinute] = useState(value ? value.getMinutes() : 0);

  const picked = useMemo(() => {
    if (!day) return null;
    const d = new Date(day);
    d.setHours(hour, minute, 0, 0);
    return d;
  }, [day, hour, minute]);
  const valid = Boolean(picked && picked.getTime() > Date.now());

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm rounded-3xl border-border bg-card p-5">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="flex justify-center">
          <Calendar
            mode="single"
            selected={day}
            onSelect={setDay}
            disabled={(date) => date < new Date(now.getFullYear(), now.getMonth(), now.getDate())}
            initialFocus
            className="pointer-events-auto p-3"
          />
        </div>
        <div className="flex items-center justify-center gap-2">
          <CalendarIcon className="size-4 text-signal" />
          <select
            value={hour}
            onChange={(e) => setHour(Number(e.target.value))}
            aria-label="Hour"
            className="field w-auto"
          >
            {Array.from({ length: 24 }, (_, h) => (
              <option key={h} value={h}>
                {h === 0 ? "12 AM" : h < 12 ? `${h} AM` : h === 12 ? "12 PM" : `${h - 12} PM`}
              </option>
            ))}
          </select>
          <select
            value={minute}
            onChange={(e) => setMinute(Number(e.target.value))}
            aria-label="Minute"
            className="field w-auto"
          >
            {[0, 15, 30, 45].map((m) => (
              <option key={m} value={m}>
                {String(m).padStart(2, "0")}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          disabled={!valid}
          onClick={() => picked && onPick(picked)}
          className="w-full rounded-2xl bg-signal py-3 text-sm font-extrabold uppercase tracking-[0.16em] text-signal-foreground disabled:opacity-40"
        >
          {valid && picked ? `Set deadline, ${format(picked, "MMM d, h:mm a")}` : "Pick a future time"}
        </button>
      </DialogContent>
    </Dialog>
  );
}
