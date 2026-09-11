import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { BountyAmountPicker } from "@/components/BountyAmountPicker";
import { lockBounty, readWalletBalance, MIN_BOUNTY } from "@/lib/bounty-escrow";
import { useOnlooker } from "@/lib/onlooker-store";
import {
  CATEGORIES,
  categoryById,
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

  useEffect(() => {
    void readWalletBalance().then(setBalance);
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (bounty < MIN_BOUNTY) {
      toast.error(`Bounties start at $${MIN_BOUNTY}.`);
      return;
    }
    setPosting(true);
    try {
      const locked = await lockBounty({
        prompt: title.trim(),
        locationName: place.trim(),
        bounty,
        category,
      });
      setBalance(locked.balance);
      addRequest({
        title: title.trim(),
        place: place.trim(),
        note: note.trim(),
        bounty,
        category,
        instructions: note.trim(),
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
      <h1 className="font-display text-3xl tracking-tight text-foreground">Post a request</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        The higher the bounty, the faster someone walks over.
      </p>

      <form onSubmit={submit} className="mt-6 space-y-5">
        <label className="block space-y-1.5">
          <span className="text-[0.65rem] uppercase tracking-[0.18em] text-muted-foreground">
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
          <span className="text-[0.65rem] uppercase tracking-[0.18em] text-muted-foreground">
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
          <span className="text-[0.65rem] uppercase tracking-[0.18em] text-muted-foreground">
            Category
          </span>
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
                    : "border-border bg-surface text-muted-foreground hover:border-signal/50")
                }
              >
                <span className="mr-1">{c.emoji}</span>
                {c.label}
              </button>
            ))}
          </div>
        </div>

        <label className="block space-y-1.5">
          <span className="text-[0.65rem] uppercase tracking-[0.18em] text-muted-foreground">
            Instructions for the onlooker
          </span>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={5}
            placeholder={categoryById(category)?.hint}
            className="field resize-none"
          />
          <span className="block text-xs text-muted-foreground">
            Spell out exactly what you want captured for {categoryById(category)?.label.toLowerCase()}.
          </span>
        </label>

        <div className="space-y-2">
          <span className="text-[0.65rem] uppercase tracking-[0.18em] text-muted-foreground">
            Bounty
          </span>
          <BountyAmountPicker value={bounty} onChange={setBounty} balance={balance} />
        </div>

        <button
          type="submit"
          disabled={posting || bounty < MIN_BOUNTY}
          className="w-full rounded-xl bg-signal py-4 text-sm font-semibold uppercase tracking-[0.16em] text-signal-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          {posting ? "Locking bounty…" : `Go live — lock $${Number.isFinite(bounty) ? bounty : 0}`}
        </button>
      </form>
    </div>
  );
}
