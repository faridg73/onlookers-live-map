import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, CoinsIcon, Info, ShieldCheck, Timer } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { formatCreditCash, formatCredits } from "@/lib/credits";
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
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
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
  const [bounty, setBounty] = useState(20);
  // The picked category plus its sub-option; a sub-option may re-map the
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
      toast.error(`Bounties start at ${MIN_BOUNTY} Credits.`);
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
      toast.error(`You have ${Math.round(funds)} Credits in your wallet`, {
        description: `Buy Credits to lock a ${total} Credits bounty${
          tip > 0 ? " including your tip" : ""
        }.`,
        action: { label: "Buy credits", onClick: () => void navigate({ to: "/profile" }) },
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
      const tipLine =
        tip > 0 ? `Includes a ${tip} Credits tip from the requester's credit wallet.` : "";
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
        description: `${total} Credits held in escrow${
          tip > 0 ? ` (including a ${tip} Credits tip)` : ""
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
  const section = "border-t border-border py-5";

  return (
    <div className="mx-auto max-w-2xl px-4 pb-32 pt-6 sm:px-6">
      <div className="border-l-4 border-signal pl-4">
      <h1 className="font-display text-3xl font-extrabold text-foreground sm:text-4xl">
        Post a Live Request
      </h1>
      <p className="mt-1.5 text-sm font-semibold text-foreground/70">
        Pin the exact spot, describe the live view, and offer a reward to someone already nearby.
      </p>
      </div>

      <form onSubmit={submit} className="mt-5">
        <label className={`block space-y-2 border-t-0 ${section}`}>
          <span className={sectionLabel}><span className="text-signal">01</span> · Bounty title</span>
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

        <div className={`space-y-3 ${section}`}>
          <label className="block space-y-2">
            <span className={sectionLabel}><span className="text-signal">02</span> · Exact location</span>
            <input
              value={place}
              onChange={(e) => setPlace(e.target.value)}
              required
              placeholder="Search a stadium, gate, section or street corner"
              className="field"
            />
          </label>
          <LocationPreviewMap
            address={place}
            onPick={(next) => {
              setSpot(next);
              if (next.formatted !== "Dropped pin") setPlace(next.formatted);
            }}
          />
          <p className="text-xs font-medium text-foreground/70">
            No street address? Tap the map or drag the pin to lock the exact coordinates.
            {spot && (
              <span className="mt-1 block font-bold text-signal">
                Pin locked: {spot.latitude.toFixed(5)}, {spot.longitude.toFixed(5)}
              </span>
            )}
          </p>
        </div>

        <div className={`space-y-3 ${section}`}>
          <span className={sectionLabel}><span className="text-signal">03</span> · Category &amp; focus</span>
          <CategoryPicker
            value={tile}
            onChange={(id) => setTile(id as CategoryId)}
            sub={sub}
            onSubChange={setSub}
          />
          <Collapsible>
            <CollapsibleTrigger className="group flex w-full items-center gap-2 border-l-2 border-signal bg-surface-raised px-3 py-2.5 text-left text-xs font-bold text-foreground">
              <Info className="size-4 shrink-0 text-signal" />
              <span className="flex-1">Privacy &amp; Guidelines</span>
              <ChevronDown className="size-4 transition-transform group-data-[state=open]:rotate-180" />
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-2 border-l-2 border-border bg-surface px-3 py-3 text-xs font-medium text-foreground/75">
              <p className="flex gap-2"><ShieldCheck className="mt-0.5 size-4 shrink-0 text-live" />{VENUE_EXTERIOR_DISCLAIMER}</p>
              {needsPublicSpacesNotice(tile) && (
                <p className="flex gap-2"><ShieldCheck className="mt-0.5 size-4 shrink-0 text-signal" />{PUBLIC_HAPPENINGS_DISCLAIMER}</p>
              )}
              <p>Film only what the requester asks for in lawful public areas. Never capture private conversations, screens, tickets, or restricted performances.</p>
            </CollapsibleContent>
          </Collapsible>
        </div>

        {permissionNeeded && (
          <label className="flex gap-3 border-l-2 border-signal bg-surface-raised p-4">
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
          <div className="space-y-2 border-l-2 border-signal bg-surface-raised p-4">
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
              <Button
                type="button"
                onClick={() => setAccessCode(generateAccessCode())}
                variant="outline"
                className="shrink-0 border-signal/50 text-xs font-semibold uppercase tracking-[0.12em] text-signal"
              >
                Generate
              </Button>
            </div>
            <p className="text-xs font-medium text-foreground/70">
              Stays hidden until someone claims the bounty. They can quote it on site to prove the
              owner, agent or manager authorised the visit.
            </p>
          </div>
        )}

        <label className={`block space-y-2 ${section}`}>
          <span className={sectionLabel}><span className="text-signal">04</span> · Specific camera instructions</span>
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

        <div className={`space-y-3 ${section}`}>
          <span className={sectionLabel}><span className="text-signal">05</span> · Credit reward</span>
          <BountyAmountPicker value={bounty} onChange={setBounty} balance={balance} />
          <p className="flex items-start gap-2 border-l-2 border-signal bg-surface-raised px-3 py-2.5 text-xs font-medium text-foreground/80">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-signal" />
            <span>
              Your payment is held securely in escrow. Funds are only released to the Bounty Hunter
              once you review and approve their video.
            </span>
          </p>
        </div>

        <div className={`space-y-3 ${section}`}>
          <span className={sectionLabel}><span className="text-signal">06</span> · Bonus tip (optional)</span>
          <BountyTipPicker value={tip} onChange={setTip} balance={balance} total={total} />
        </div>

        <div className={`space-y-3 ${section}`}>
          <span className={sectionLabel}><span className="text-signal">07</span> · Request deadline</span>
          <div className="grid grid-cols-4 gap-2">
            {DEADLINES.map(({ minutes: m, label }) => (
              <Button
                key={m}
                type="button"
                onClick={() => setMinutes(m)}
                aria-pressed={minutes === m}
                variant="outline"
                className={`h-12 rounded-md border-2 px-1 text-center text-sm font-extrabold transition-all ${
                  minutes === m
                    ? "border-signal bg-signal text-signal-foreground"
                    : "border-border bg-surface-raised text-foreground hover:border-signal/60"
                }`}
              >
                {label}
              </Button>
            ))}
          </div>
          <p className="flex items-start gap-2 text-xs font-medium text-foreground/70">
            <Timer className="mt-0.5 size-4 shrink-0 text-signal" />
            <span>
              If no Bounty Hunter claims this request in time, it expires automatically, disappears
              from the live map, and your {total} Credits goes straight back
              to your wallet.
            </span>
          </p>
        </div>

        <div className="sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))] z-20 -mx-4 border-t border-border bg-background/95 px-4 py-3 backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:px-0 sm:pt-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-xs font-bold text-muted-foreground"><CoinsIcon className="size-4 text-signal" />Total escrow</span>
            <span className="font-display text-lg font-extrabold text-signal">{formatCredits(total)} · {formatCreditCash(total)}</span>
          </div>
          <Button
            type="submit"
            disabled={
              posting ||
              bounty < MIN_BOUNTY ||
              note.trim().length < 10 ||
              (permissionNeeded && !permissionOk) ||
              (codeNeeded && accessCode.trim().length < 4)
            }
            className="h-14 w-full rounded-md bg-signal text-base font-extrabold uppercase tracking-[0.12em] text-signal-foreground shadow-lg hover:bg-signal/90"
          >
            {posting ? "Locking bounty…" : `Go live — lock ${formatCredits(total)}`}
          </Button>
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
