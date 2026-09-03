import { createFileRoute } from "@tanstack/react-router";
import { Camera, Clock, PlusSquare, Radio, Star, Wallet } from "lucide-react";
import { RequestCard } from "@/components/RequestCard";
import { useOnlooker } from "@/lib/onlooker-store";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Your Onlooker Profile — earnings and requests" },
      {
        name: "description",
        content:
          "Track the bounties you earned as an onlooker and every live request you posted.",
      },
      { property: "og:title", content: "Your Onlooker Profile" },
      {
        property: "og:description",
        content: "Bounties earned as an onlooker and every live request you posted.",
      },
    ],
  }),
  component: ProfileScreen,
});

const STATS = [
  { icon: Wallet, label: "Earned", value: "$248" },
  { icon: Camera, label: "Shots sent", value: "37" },
  { icon: Star, label: "Rating", value: "4.9" },
];

const ACTIVITY = [
  { icon: Radio, text: "Claimed “How long is the ferry line?”", meta: "+$8 bounty · 12 min ago" },
  { icon: PlusSquare, text: "Posted “Sunset from the east ridge?”", meta: "$15 bounty · 1 hr ago" },
  { icon: Camera, text: "Sent a live shot of the night market", meta: "+$6 bounty · 2 hrs ago" },
  { icon: Clock, text: "Request fulfilled — “Rooftop bar queue?”", meta: "+$20 bounty · yesterday" },
];

function ProfileScreen() {
  const { requests } = useOnlooker();
  const mine = requests.filter((r) => r.requester === "you");

  return (
    <div className="mx-auto max-w-lg px-4 pb-28 pt-6">
      <div className="flex items-center gap-4">
        <div className="flex size-16 items-center justify-center rounded-2xl bg-signal font-display text-2xl text-signal-foreground">
          FR
        </div>
        <div>
          <h1 className="font-display text-2xl tracking-tight text-foreground">fred</h1>
          <p className="text-sm text-muted-foreground">Onlooker since 2025 · Harbor District</p>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-3 gap-3">
        {STATS.map(({ icon: Icon, label, value }) => (
          <div key={label} className="rounded-2xl border border-border bg-surface p-4 text-center">
            <Icon className="mx-auto size-4 text-signal" />
            <div className="mt-2 font-display text-xl text-foreground">{value}</div>
            <div className="text-[0.6rem] uppercase tracking-[0.16em] text-muted-foreground">
              {label}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-surface-raised p-4">
        <div className="flex items-center justify-between">
          <span className="text-[0.65rem] uppercase tracking-[0.18em] text-muted-foreground">
            Available balance
          </span>
          <button className="text-xs font-semibold uppercase tracking-[0.14em] text-signal">
            Cash out
          </button>
        </div>
        <div className="mt-2 font-display text-4xl text-foreground">$62.00</div>
      </div>

      <h2 className="mt-8 font-display text-lg text-foreground">Your requests</h2>
      <div className="mt-3 space-y-3">
        {mine.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            You haven't posted a live request yet.
          </p>
        ) : (
          mine.map((r) => <RequestCard key={r.id} request={r} />)
        )}
      </div>
    </div>
  );
}
