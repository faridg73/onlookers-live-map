import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ShieldCheck, Timer } from "lucide-react";
import { toast } from "sonner";
import { BountyAmountPicker } from "@/components/BountyAmountPicker";
import { BountyTipPicker } from "@/components/BountyTipPicker";
import { PUBLIC_HAPPENINGS_DISCLAIMER, VENUE_EXTERIOR_DISCLAIMER } from "@/lib/camera-only";
import { lockBounty, readWalletBalance, MIN_BOUNTY } from "@/lib/bounty-escrow";
import { useOnlooker } from "@/lib/onlooker-store";
import { BLOCKED_REQUEST_MESSAGE, isRequestAllowed } from "@/lib/moderation";
import { ContentModerationAlertModal } from "@/components/ContentModerationAlertModal";
import { CategoryPicker } from "@/components/CategoryPicker";
import { LocationPreviewMap, type PickedLocation } from "@/components/LocationPreviewMap";
import {
  categoryById,
  generateAccessCode,
  needsAccessCode,
  needsPermissionConfirmation,
  needsPublicSpacesNotice,
  subOptionById,
  type CategoryId,
} from "@/lib/onlooker";

export const Route = createFileRoute("/post")({
  head: () => ({
    meta: [
      { title: "Post a Live Request — Onlooker" },
      {
        name: "description",
        content:
          "Describe the place, set a bounty, and nearby onlookers will send back a live photo in minutes.",
      },
      { property: "og:title", content: "Post a Live Request — Onlooker" },
      {
        property: "og:description",
        content: "Describe a place, set a bounty, get a live photo back in minutes.",
      },
    ],
  }),
  component: PostScreen,
});

const DEADLINES: { minutes: number; label: string }[] = [
  { minutes: 15, label: "15 min" },
  { minutes: 30, label: "30 min" },
  { minutes: 60, label: "1 hour" },
  { minutes: 1440, label: "24 hours" },
];

function PostScreen() {
  const { addRequest } = useOnlooker();
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const titleRef = useRef<HTMLInputElement>(null);
  const [place, setPlace] = useState("");
  const [note, setNote] = useState("");
  const noteRef = useRef<HTMLTextAreaElement>(null);
  const [bounty, setBounty] = useState(10);
  // The picked 3x3 tile plus its sub-option; a sub-option may re-map the
  // category that actually gets stored (e.g. Events → Sports game).
  const [tile, setTile] = useState<CategoryId>("food");
  const [sub, setSub] = useState<string | null>(null);
  const subOption = subOptionById(tile, sub);
  const category: CategoryId = subOption?.category ?? tile;
  const [balance, setBalance] = useState<number | null>(null);
  const [posting, setPosting] = useState(false);
  const [moderationOpen, setModerationOpen] = useState(false);
  const [permissionOk, setPermissionOk] = useState(false);
  const permissionNeeded = needsPermissionConfirmation(category);
  const codeNeeded = needsAccessCode(category);
  const [accessCode, setAccessCode] = useState("");
  const [spot, setSpot] = useState<PickedLocation | null>(null);
  const [minutes, setMinutes] = useState(60);
  const [tip, setTip] = useState(0);
  const total = (Number.isFinite(bounty) ? bounty : 0) + (Number.isFinite(tip) ? tip : 0);

  useEffect(() => {
    void readWalletBalance().then(setBalance);
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (bounty < MIN_BOUNTY) {
      toast.error(`Bounties start at $${MIN_BOUNTY}.`);
      return;
    }
    if (note.trim().length < 10) {
      toast.error("Tell the hunter exactly what to film before going live.");
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
    // Catch an empty wallet before posting, so the deposit never fails mid-flow.
    const funds = await readWalletBalance();
    setBalance(funds);
    if (funds !== null && funds < total) {
      toast.error(`You have $${funds.toFixed(2)} in your wallet`, {
        description: `Add funds to lock a $${total} bounty${tip > 0 ? " including your tip" : ""}.`,
        action: { label: "Top up", onClick: () => void navigate({ to: "/profile" }) },
      });
      return;
    }
    setPosting(true);
    try {
      const locked = await lockBounty({
        prompt: title.trim(),
        details: note.trim(),
        locationName: place.trim(),
        bounty: total,
        category,
        accessCode: codeNeeded ? accessCode.trim() : null,
        latitude: spot?.latitude,
        longitude: spot?.longitude,
        minutes,
      });
      setBalance(locked.balance);
      const focus = subOption ? `Focus: ${subOption.label}` : "";
      const tipLine = tip > 0 ? `Includes a $${tip} tip from the requester's Bounty Wallet.` : "";
      const details = [focus, note.trim(), tipLine].filter(Boolean).join("\n");
      addRequest({
        title: title.trim(),
        place: place.trim(),
        note: details,
        bounty: total,
        category,
        instructions: details,
        accessCode: codeNeeded ? accessCode.trim() : undefined,
        dbId: locked.id,
        expiresInMin: minutes,
      });
      const deadlineLabel = DEADLINES.find((d) => d.minutes === minutes)?.label ?? `${minutes} min`;
      toast.success("Request is live", {
        description: `$${total} held in escrow${
          tip > 0 ? ` (including a $${tip} tip)` : ""
        }. Expires in ${deadlineLabel} if nobody claims it.`,
      });
      navigate({ to: "/feed" });
    } catch (error) {
      const msg = error instanceof Error ? error.message : "";
      if (msg === BLOCKED_REQUEST_MESSAGE) {
        setModerationOpen(true);
      } else {
        toast.error(msg || "Could not post the request.");
      }
    } finally {
      setPosting(false);
    }
  }

  const sectionLabel =
    "text-[0.7rem] font-extrabold uppercase tracking-[0.18em] text-foreground/75";
  const card = "rounded-2xl border border-border bg-surface p-4 shadow-sm";

  return (
    <div className="mx-auto max-w-lg px-4 pb-32 pt-6">
      <h1 className="font-display text-3xl font-extrabold tracking-tight text-foreground">
        Request a video
      </h1>
      <p className="mt-1.5 text-sm font-semibold text-foreground/70">
        Drop a pin, say exactly what to film, and set the reward. The higher the bounty, the faster
        someone walks over.
      </p>

      <form onSubmit={submit} className="mt-5 space-y-3">
        <label className={`block space-y-2 ${card}`}>
          <span className={sectionLabel}>1 · Bounty title</span>
          <input
            ref={titleRef}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            maxLength={120}
            placeholder="e.g., How long is the entry line at Section A?"
            className="field"
          />
          <span className="block text-xs font-medium text-foreground/70">
            One short line about a real place — a line, a seat view, a queue — people see on the
            map and in the feed.
          </span>
        </label>

        <div className={`space-y-2 ${card}`}>
          <label className="block space-y-2">
            <span className={sectionLabel}>2 · Exact location</span>
            <input
              value={place}
              onChange={(e) => setPlace(e.target.value)}
              required
              placeholder="Search a stadium, gate, section or street corner"
              className="field"
            />
          </label>
          <LocationPreviewMap address={place} onPick={setSpot} />
          <p className="text-xs font-medium text-foreground/70">
            No street address? Tap the map or drag the pin to lock the exact coordinates.
            {spot && (
              <span className="mt-1 block font-bold text-signal">
                Pin locked: {spot.latitude.toFixed(5)}, {spot.longitude.toFixed(5)}
              </span>
            )}
          </p>
        </div>

        <div className={`space-y-2.5 ${card}`}>
          <span className={sectionLabel}>3 · Category</span>
          <CategoryPicker
            value={tile}
            onChange={(id) => setTile(id as CategoryId)}
            sub={sub}
            onSubChange={setSub}
          />
          <p className="flex items-start gap-2 rounded-xl border border-live/40 bg-surface-raised px-3 py-2.5 text-xs font-medium text-foreground/80">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-live" />
            <span>{VENUE_EXTERIOR_DISCLAIMER}</span>
          </p>
          {needsPublicSpacesNotice(tile) && (
            <p className="flex items-start gap-2 rounded-xl border border-signal/50 bg-surface-raised px-3 py-2.5 text-xs font-bold text-foreground">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-signal" />
              <span>{PUBLIC_HAPPENINGS_DISCLAIMER}</span>
            </p>
          )}
        </div>

        {permissionNeeded && (
          <label className="flex gap-3 rounded-2xl border border-signal/40 bg-surface p-4">
            <input
              type="checkbox"
              checked={permissionOk}
              onChange={(e) => setPermissionOk(e.target.checked)}
              className="mt-0.5 size-4 shrink-0 accent-[var(--signal)]"
            />
            <span className="text-xs font-medium text-foreground/75">
              I confirm I have permission from the seller, listing agent or property manager to have
              this property photographed or filmed, and that the onlooker may only capture areas
              open to the public or that access has been authorised.
            </span>
          </label>
        )}

        {codeNeeded && (
          <div className="space-y-2 rounded-2xl border border-signal/40 bg-surface p-4">
            <span className="text-[0.7rem] font-extrabold uppercase tracking-[0.18em] text-signal">
              Private access passcode
            </span>
            <div className="flex gap-2">
              <input
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value)}
                maxLength={40}
                placeholder="e.g. 481902 or BLUEGATE"
                className="field flex-1"
              />
              <button
                type="button"
                onClick={() => setAccessCode(generateAccessCode())}
                className="shrink-0 rounded-xl border border-signal/50 px-3 text-xs font-semibold uppercase tracking-[0.12em] text-signal"
              >
                Generate
              </button>
            </div>
            <p className="text-xs font-medium text-foreground/70">
              Stays hidden until someone claims the bounty. They can quote it on site to prove the
              owner, agent or manager authorised the visit.
            </p>
          </div>
        )}

        <label className={`block space-y-2 ${card}`}>
          <span className={sectionLabel}>4 · Specific camera instructions</span>
          <textarea
            ref={noteRef}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={4}
            required
            minLength={10}
            placeholder="e.g., What is the view from Seat 12? Ask for entry lines, crowd atmosphere, tailgates or street views — filmed on location, in public spaces only."
            className="field resize-none"
          />
          <span className="block text-xs font-medium text-foreground/70">
            {note.trim().length < 10
              ? "Add at least one clear sentence about the physical spot — the line, the view, the crowd — so the hunter knows exactly what to capture."
              : `Great — this is what they'll see for ${
                  subOption
                    ? `${categoryById(category)?.label.toLowerCase()} — ${subOption.label.toLowerCase()}`
                    : categoryById(category)?.label.toLowerCase()
                }.`}
            {categoryById(category)?.hint && ` Example: ${categoryById(category)?.hint}`}
          </span>
        </label>

        <div className={`space-y-2.5 ${card}`}>
          <span className={sectionLabel}>5 · Reward</span>
          <BountyAmountPicker value={bounty} onChange={setBounty} balance={balance} />
          <p className="flex items-start gap-2 rounded-xl border border-signal/30 bg-surface-raised px-3 py-2.5 text-xs font-medium text-foreground/80">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-signal" />
            <span>
              Your payment is held securely in escrow. Funds are only released to the Bounty Hunter
              once you review and approve their video.
            </span>
          </p>
        </div>

        <div className={`space-y-2.5 ${card}`}>
          <span className={sectionLabel}>6 · Bounty Wallet tip (optional)</span>
          <BountyTipPicker value={tip} onChange={setTip} balance={balance} total={total} />
        </div>

        <div className={`space-y-2.5 ${card}`}>
          <span className={sectionLabel}>7 · Request deadline</span>
          <div className="grid grid-cols-4 gap-2">
            {DEADLINES.map(({ minutes: m, label }) => (
              <button
                key={m}
                type="button"
                onClick={() => setMinutes(m)}
                aria-pressed={minutes === m}
                className={`rounded-2xl border-2 py-3 text-center text-sm font-extrabold transition-all ${
                  minutes === m
                    ? "border-signal bg-signal text-signal-foreground"
                    : "border-border bg-surface-raised text-foreground hover:border-signal/60"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <p className="flex items-start gap-2 text-xs font-medium text-foreground/70">
            <Timer className="mt-0.5 size-4 shrink-0 text-signal" />
            <span>
              If no Bounty Hunter claims this request in time, it expires automatically, disappears
              from the live map, and your ${total} goes straight back
              to your wallet.
            </span>
          </p>
        </div>

        <div className="pt-1">
          <button
            type="submit"
            disabled={
              posting ||
              bounty < MIN_BOUNTY ||
              note.trim().length < 10 ||
              (permissionNeeded && !permissionOk) ||
              (codeNeeded && accessCode.trim().length < 4)
            }
            className="w-full rounded-2xl bg-signal py-4 text-base font-extrabold uppercase tracking-[0.16em] text-signal-foreground shadow-lg transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            {posting ? "Locking bounty…" : `Go live — lock $${total}`}
          </button>
          <p className="mt-3 text-center text-[0.7rem] font-medium leading-relaxed text-muted-foreground">
            Onlooker Live is for capturing physical event logistics and venue atmospheres. Digital
            screen captures are strictly prohibited.
          </p>
        </div>
      </form>

      <ContentModerationAlertModal
        open={moderationOpen}
        onOpenChange={setModerationOpen}
        onEditRequest={() => {
          setModerationOpen(false);
          // Focus the first offending field after Radix returns focus from the
          // closing dialog, so the user lands back in the form, not on body.
          window.setTimeout(() => {
            const titleHasForbidden = !isRequestAllowed(title, "", "");
            const noteHasForbidden = !isRequestAllowed("", note, "");
            if (noteHasForbidden && !titleHasForbidden) {
              noteRef.current?.focus();
            } else {
              titleRef.current?.focus();
            }
          }, 50);
        }}
      />
    </div>
  );
}
