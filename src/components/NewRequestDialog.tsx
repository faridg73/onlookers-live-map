import { useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { BountyAmountPicker } from "@/components/BountyAmountPicker";
import { lockBounty, readWalletBalance, MIN_BOUNTY } from "@/lib/bounty-escrow";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useOnlooker } from "@/lib/onlooker-store";
import { BLOCKED_REQUEST_MESSAGE, isRequestAllowed } from "@/lib/moderation";
import {
  CATEGORIES,
  categoryById,
  generateAccessCode,
  needsAccessCode,
  needsPermissionConfirmation,
  needsPublicSpacesNotice,
  type CategoryId,
} from "@/lib/onlooker";
import { PUBLIC_HAPPENINGS_DISCLAIMER } from "@/lib/camera-only";

export function NewRequestDialog({ children }: { children: ReactNode }) {
  const { addRequest } = useOnlooker();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [place, setPlace] = useState("");
  const [note, setNote] = useState("");
  const [bounty, setBounty] = useState(10);
  const [category, setCategory] = useState<CategoryId>("food");
  const [balance, setBalance] = useState<number | null>(null);
  const [posting, setPosting] = useState(false);
  const [permissionOk, setPermissionOk] = useState(false);
  const permissionNeeded = needsPermissionConfirmation(category);
  const codeNeeded = needsAccessCode(category);
  const [accessCode, setAccessCode] = useState("");

  useEffect(() => {
    if (open) void readWalletBalance().then(setBalance);
  }, [open]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !place.trim()) return;
    if (bounty < MIN_BOUNTY) {
      toast.error(`Bounties start at $${MIN_BOUNTY}.`);
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
      toast.error(BLOCKED_REQUEST_MESSAGE, { duration: 12000 });
      return;
    }
    setPosting(true);
    try {
      const locked = await lockBounty({
        prompt: title.trim(),
        details: note.trim(),
        locationName: place.trim(),
        bounty,
        category,
        accessCode: codeNeeded ? accessCode.trim() : null,
      });
      addRequest({
        title: title.trim(),
        place: place.trim(),
        note: note.trim(),
        bounty,
        category,
        instructions: note.trim(),
        accessCode: codeNeeded ? accessCode.trim() : undefined,
        dbId: locked.id,
      });
      toast.success("Request is live", {
        description: `$${bounty} locked from your wallet until it's fulfilled.`,
      });
      setTitle("");
      setPlace("");
      setNote("");
      setBounty(10);
      setAccessCode("");
      setPermissionOk(false);
      setOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not post the request.");
    } finally {
      setPosting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-h-[85dvh] overflow-y-auto overscroll-contain border-border bg-surface sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Ask for a live look</DialogTitle>
          <DialogDescription>
            Someone standing there right now can answer with a photo.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <Field label="What do you want to see?">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="How busy is the boardwalk?"
              className="field"
              required
            />
          </Field>
          <Field label="Where">
            <input
              value={place}
              onChange={(e) => setPlace(e.target.value)}
              placeholder="Boardwalk, south entrance"
              className="field"
              required
            />
          </Field>
          <Field label="Category">
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCategory(c.id)}
                  className={
                    "rounded-full border px-3 py-1.5 text-xs transition-colors " +
                    (category === c.id
                      ? "border-signal bg-signal text-signal-foreground"
                      : "border-border bg-surface-raised text-muted-foreground hover:border-signal/50")
                  }
                >
                  <span className="mr-1">{c.emoji}</span>
                  {c.label}
                </button>
              ))}
            </div>
          </Field>
          {needsPublicSpacesNotice(category) && (
            <p className="rounded-xl border border-signal/50 bg-surface-raised px-3 py-2.5 text-xs font-bold text-foreground">
              {PUBLIC_HAPPENINGS_DISCLAIMER}
            </p>
          )}
          {permissionNeeded && (
            <label className="flex gap-3 rounded-xl border border-signal/40 bg-surface-raised p-3">
              <input
                type="checkbox"
                checked={permissionOk}
                onChange={(e) => setPermissionOk(e.target.checked)}
                className="mt-0.5 size-4 shrink-0 accent-[var(--signal)]"
              />
              <span className="text-xs text-muted-foreground">
                I confirm I have permission from the seller, listing agent or property manager to
                have this property photographed or filmed.
              </span>
            </label>
          )}
          {codeNeeded && (
            <Field label="Private access passcode">
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
              <span className="block text-xs text-muted-foreground">
                Hidden until an onlooker claims this bounty, then shown to them on site.
              </span>
            </Field>
          )}
          <Field label="Instructions for the onlooker">
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={4}
              placeholder={categoryById(category)?.hint}
              className="field resize-none"
            />
          </Field>
          <Field label="Bounty">
            <BountyAmountPicker value={bounty} onChange={setBounty} balance={balance} />
          </Field>
          <button
            type="submit"
            disabled={
              posting ||
              bounty < MIN_BOUNTY ||
              (permissionNeeded && !permissionOk) ||
              (codeNeeded && accessCode.trim().length < 4)
            }
            className="w-full rounded-xl bg-signal py-3 text-sm font-semibold uppercase tracking-[0.16em] text-signal-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            {posting ? "Locking bounty…" : `Post request — lock $${Number.isFinite(bounty) ? bounty : 0}`}
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-[0.65rem] uppercase tracking-[0.18em] text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
