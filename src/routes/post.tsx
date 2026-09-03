import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { useOnlooker } from "@/lib/onlooker-store";

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

const BOUNTIES = [5, 10, 20, 40];

function PostScreen() {
  const { addRequest } = useOnlooker();
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [place, setPlace] = useState("");
  const [note, setNote] = useState("");
  const [bounty, setBounty] = useState(10);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    addRequest({ title: title.trim(), place: place.trim(), note: note.trim(), bounty });
    toast.success("Request is live", { description: `$${bounty} bounty posted to nearby onlookers.` });
    navigate({ to: "/feed" });
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

        <label className="block space-y-1.5">
          <span className="text-[0.65rem] uppercase tracking-[0.18em] text-muted-foreground">
            Details
          </span>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={4}
            placeholder="One wide photo of the entrance is enough."
            className="field resize-none"
          />
        </label>

        <div className="space-y-2">
          <span className="text-[0.65rem] uppercase tracking-[0.18em] text-muted-foreground">
            Bounty
          </span>
          <div className="flex gap-2">
            {BOUNTIES.map((b) => (
              <button
                key={b}
                type="button"
                onClick={() => setBounty(b)}
                className={
                  "flex-1 rounded-xl border py-3 font-display text-lg transition-colors " +
                  (bounty === b
                    ? "border-signal bg-signal text-signal-foreground"
                    : "border-border bg-surface text-muted-foreground hover:border-signal/50")
                }
              >
                ${b}
              </button>
            ))}
          </div>
        </div>

        <button
          type="submit"
          className="w-full rounded-xl bg-signal py-4 text-sm font-semibold uppercase tracking-[0.16em] text-signal-foreground transition-opacity hover:opacity-90"
        >
          Go live
        </button>
      </form>
    </div>
  );
}
