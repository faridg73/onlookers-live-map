import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { BountyAmountPicker } from "@/components/BountyAmountPicker";
import { lockBounty, readWalletBalance, MIN_BOUNTY } from "@/lib/bounty-escrow";
import { useOnlooker } from "@/lib/onlooker-store";
import { CategorySelect } from "@/components/CategorySelect";
import {
  categoryById,
  generateAccessCode,
  needsAccessCode,
  needsPermissionConfirmation,
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

function PostScreen() {
  const { addRequest } = useOnlooker();
  const navigate = useNavigate();
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
    void readWalletBalance().then(setBalance);
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
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
    setPosting(true);
    try {
      const locked = await lockBounty({
        prompt: title.trim(),
        locationName: place.trim(),
        bounty,
        category,
        accessCode: codeNeeded ? accessCode.trim() : null,
      });
      setBalance(locked.balance);
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
      navigate({ to: "/feed" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not post the request.");
    } finally {
      setPosting(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg px-4 pb-28 pt-6">
      <h1 className="font-display text-4xl font-extrabold tracking-tight text-foreground">
        Post a request
      </h1>
      <p className="mt-2 text-sm font-semibold text-foreground/70">
        The higher the bounty, the faster someone walks over.
      </p>

      <form onSubmit={submit} className="mt-6 space-y-5">
        <label className="block space-y-1.5">
          <span className="text-[0.7rem] font-extrabold uppercase tracking-[0.18em] text-foreground/75">
            What do you want to see?
          </span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            placeholder="Is the queue still around the block?"
            className="field"
          />
        </label>

        <label className="block space-y-1.5">
          <span className="text-[0.7rem] font-extrabold uppercase tracking-[0.18em] text-foreground/75">
            Where
          </span>
          <input
            value={place}
            onChange={(e) => setPlace(e.target.value)}
            required
            placeholder="Corner of Ash Alley & 6th"
            className="field"
          />
        </label>

        <div className="space-y-2">
          <span className="text-[0.7rem] font-extrabold uppercase tracking-[0.18em] text-foreground/75">
            Category
          </span>
          <CategorySelect value={category} onChange={setCategory} />
        </div>

        {permissionNeeded && (
          <label className="flex gap-3 rounded-xl border border-signal/40 bg-surface p-3">
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
          <div className="space-y-1.5 rounded-xl border border-signal/40 bg-surface p-3">
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
            <span className="block text-xs font-medium text-foreground/70">
              Stays hidden until someone claims the bounty. They can quote it on site to prove the
              owner, agent or manager authorised the visit.
            </span>
          </div>
        )}

        <label className="block space-y-1.5">
          <span className="text-[0.7rem] font-extrabold uppercase tracking-[0.18em] text-foreground/75">
            Instructions for the onlooker
          </span>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={5}
            placeholder={categoryById(category)?.hint}
            className="field resize-none"
          />
          <span className="block text-xs font-medium text-foreground/70">
            Spell out exactly what you want captured for {categoryById(category)?.label.toLowerCase()}.
          </span>
        </label>

        <div className="space-y-2">
          <span className="text-[0.7rem] font-extrabold uppercase tracking-[0.18em] text-foreground/75">
            Bounty
          </span>
          <BountyAmountPicker value={bounty} onChange={setBounty} balance={balance} />
        </div>

        <button
          type="submit"
          disabled={
            posting ||
            bounty < MIN_BOUNTY ||
            (permissionNeeded && !permissionOk) ||
            (codeNeeded && accessCode.trim().length < 4)
          }
          className="w-full rounded-xl bg-signal py-4 text-base font-extrabold uppercase tracking-[0.16em] text-signal-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          {posting ? "Locking bounty…" : `Go live — lock $${Number.isFinite(bounty) ? bounty : 0}`}
        </button>
      </form>
    </div>
  );
}
