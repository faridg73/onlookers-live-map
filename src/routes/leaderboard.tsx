import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Trophy } from "lucide-react";
import { Leaderboard } from "@/components/Leaderboard";

export const Route = createFileRoute("/leaderboard")({
  head: () => ({
    meta: [
      { title: "Top Reporters — Onlooker bounty payout ranking" },
      {
        name: "description",
        content:
          "The full Onlooker ranking of onlookers by bounty cash earned, with clips sent and lifetime payouts.",
      },
      { property: "og:title", content: "Top Reporters on Onlooker" },
      {
        property: "og:description",
        content: "See which onlookers have collected the most bounty cash for live views.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LeaderboardPage,
});

function LeaderboardPage() {
  return (
    <div className="mx-auto max-w-lg px-4 pb-28 pt-6">
      <Link
        to="/profile"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Profile
      </Link>

      <div className="mt-4 flex items-center gap-3">
        <span className="flex size-12 items-center justify-center rounded-2xl bg-signal text-signal-foreground">
          <Trophy className="size-6" />
        </span>
        <div>
          <h1 className="font-display text-2xl tracking-tight text-foreground">Top reporters</h1>
          <p className="text-sm text-muted-foreground">
            Ranked by real bounty cash paid out for live views.
          </p>
        </div>
      </div>

      <Leaderboard limit={100} heading={null} />
    </div>
  );
}
