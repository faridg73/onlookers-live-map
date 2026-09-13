import { useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Radio, ShieldCheck, Timer, Video } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { BountyAmountPicker } from "@/components/BountyAmountPicker";
import { lockBounty, readWalletBalance, MIN_BOUNTY } from "@/lib/bounty-escrow";
import { useOnlooker } from "@/lib/onlooker-store";
import { categoryById } from "@/lib/onlooker";
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

/**
 * Posts a bounty for one venue: either a 5-minute live stream inside the next
 * hour or two, or a pre-recorded clip with a hard delivery deadline.
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
  const [title, setTitle] = useState(defaultTitle ?? "");
  const [note, setNote] = useState(defaultNote ?? "");
  const [bounty, setBounty] = useState(20);
  const [balance, setBalance] = useState<number | null>(null);
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    if (!open) return;
    void readWalletBalance().then(setBalance);
    if (defaultTitle) setTitle(defaultTitle);
    if (defaultNote) setNote(defaultNote);
  }, [open, defaultTitle, defaultNote]);

  function pickMode(next: Mode) {
    setMode(next);
    setMinutes(next === "live" ? 120 : 60);
  }

  const windows = mode === "live" ? LIVE_WINDOWS : CLIP_DEADLINES;
  const windowLabel = windows.find((w) => w.minutes === minutes)?.label ?? `${minutes} min`;

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
    if (bounty < MIN_BOUNTY) {
      toast.error(`Bounties start at ${MIN_BOUNTY} Credits.`);
      return;
    }
    if (!isRequestAllowed(title, note, venue.name)) {
      toast.error(BLOCKED_REQUEST_MESSAGE, { duration: 12000 });
      return;
    }
    const funds = await readWalletBalance();
    setBalance(funds);
    if (funds !== null && funds < bounty) {
      toast.error(`You have ${Math.round(funds)} Credits in your wallet`, {
        description: `Buy Credits to lock a ${bounty} Credits bounty.`,
        action: { label: "Top up", onClick: () => void navigate({ to: "/profile" }) },
      });
      return;
    }

    const header =
      mode === "live"
        ? `Live: 5-minute stream from ${venue.name}, starting ${windowLabel.toLowerCase()}.`
        : `Clip: live-captured video from ${venue.name}, delivered within ${windowLabel.toLowerCase()}.`;
    const details = `${header}\n${note.trim()}`;

    setPosting(true);
    try {
      const locked = await lockBounty({
        prompt: title.trim(),
        details: note.trim(),
        locationName: `${venue.name}, ${venue.area}`,
        bounty,
        category: venue.category,
        latitude: venue.latitude,
        longitude: venue.longitude,
        minutes,
      });
      setBalance(locked.balance);
      addRequest({
        title: title.trim(),
        place: `${venue.name}, ${venue.area}`,
        note: details,
        bounty,
        category: venue.category,
        instructions: details,
        dbId: locked.id,
        expiresInMin: minutes,
      });
      toast.success("Bounty is live", {
        description: `${bounty} Credits held in escrow · ${windowLabel}`,
      });
      setOpen(false);
      setTitle("");
      setNote("");
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
              <p className="mt-1.5 text-sm font-extrabold text-foreground">5-min live stream</p>
              <p className="text-xs text-muted-foreground">Watch it happen, starting soon</p>
            </button>
            <button type="button" onClick={() => pickMode("clip")} aria-pressed={mode === "clip"} className={modeCard(mode === "clip")}>
              <Video className="size-4 text-signal" />
              <p className="mt-1.5 text-sm font-extrabold text-foreground">Pre-recorded clip</p>
              <p className="text-xs text-muted-foreground">Delivered by a hard deadline</p>
            </button>
          </div>

          <label className="block space-y-1.5">
            <span className="text-[0.7rem] font-extrabold uppercase tracking-[0.16em] text-foreground/75">
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
            <span className="text-[0.7rem] font-extrabold uppercase tracking-[0.16em] text-foreground/75">
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
            <span className="text-[0.7rem] font-extrabold uppercase tracking-[0.16em] text-foreground/75">
              {mode === "live" ? "Start window" : "Delivery deadline"}
            </span>
            <div className={`grid gap-2 ${mode === "live" ? "grid-cols-2" : "grid-cols-4"}`}>
              {windows.map(({ minutes: m, label }) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMinutes(m)}
                  aria-pressed={minutes === m}
                  className={`rounded-xl border-2 py-2.5 text-center text-sm font-extrabold transition-colors ${
                    minutes === m
                      ? "border-signal bg-signal text-signal-foreground"
                      : "border-border bg-surface-raised text-foreground hover:border-signal/60"
                  }`}
                >
                  {label}
                </button>
              ))}
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
            <span className="text-[0.7rem] font-extrabold uppercase tracking-[0.16em] text-foreground/75">
              Reward
            </span>
            <BountyAmountPicker value={bounty} onChange={setBounty} balance={balance} />
            <p className="flex items-start gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-signal" />
              <span>
                Held securely in escrow and only released once you review and approve the video.
              </span>
            </p>
          </div>

          <button
            type="submit"
            disabled={posting || bounty < MIN_BOUNTY}
            className="w-full rounded-2xl bg-signal py-3.5 text-sm font-extrabold uppercase tracking-[0.16em] text-signal-foreground disabled:opacity-40"
          >
            {posting ? "Locking bounty…" : `Lock ${Number.isFinite(bounty) ? bounty : 0} Credits`}
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
