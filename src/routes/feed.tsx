import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { RequestCard } from "@/components/RequestCard";
import { useOnlooker } from "@/lib/onlooker-store";
import type { RequestStatus } from "@/lib/onlooker";

export const Route = createFileRoute("/feed")({
  head: () => ({
    meta: [
      { title: "Live Requests Feed — Onlooker" },
      {
        name: "description",
        content:
          "Every open live photo request near you, ranked by bounty and time left. Claim one and shoot it.",
      },
      { property: "og:title", content: "Live Requests Feed — Onlooker" },
      {
        property: "og:description",
        content: "Open live photo requests near you, ranked by bounty and time left.",
      },
    ],
  }),
  component: FeedScreen,
});

const FILTERS: Array<{ key: RequestStatus | "all"; label: string }> = [
  { key: "all", label: "All" },
  { key: "open", label: "Open" },
  { key: "claimed", label: "Claimed" },
  { key: "fulfilled", label: "Done" },
];

function FeedScreen() {
  const { requests, claim } = useOnlooker();
  const [filter, setFilter] = useState<RequestStatus | "all">("all");
  const list = requests.filter((r) => filter === "all" || r.status === filter);
  const pot = requests.filter((r) => r.status === "open").reduce((s, r) => s + r.bounty, 0);

  return (
    <div className="mx-auto max-w-lg px-4 pb-28 pt-6">
      <h1 className="font-display text-3xl tracking-tight text-foreground">Live requests</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        <span className="text-signal">${pot}</span> in open bounties within 5 km of you.
      </p>

      <div className="mt-5 flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={
              "shrink-0 rounded-full border px-4 py-1.5 text-xs font-medium uppercase tracking-[0.14em] transition-colors " +
              (filter === f.key
                ? "border-signal bg-signal text-signal-foreground"
                : "border-border bg-surface text-muted-foreground hover:text-foreground")
            }
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="mt-5 space-y-3">
        {list.map((r) => (
          <RequestCard key={r.id} request={r} onClaim={claim} />
        ))}
        {list.length === 0 && (
          <p className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            Nothing here yet.
          </p>
        )}
      </div>
    </div>
  );
}
