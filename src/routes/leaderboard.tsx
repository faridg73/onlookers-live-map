import { createFileRoute } from "@tanstack/react-router";
import { Trophy } from "lucide-react";
import { Leaderboard } from "@/components/Leaderboard";
import { PageBackButton } from "@/components/PageBackButton";

export const Route = createFileRoute("/leaderboard")({
  head: () => ({
    meta: [
      { title: "Top Reporters | Onlooker LLC bounty payout ranking" },
      {
        name: "description",
        content:
          "The full Onlooker LLC ranking of onlookers by bounty cash earned, with clips sent and lifetime payouts.",
      },
      { property: "og:title", content: "Top Reporters on Onlooker LLC" },
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
    <div className="mx-auto w-full max-w-5xl px-4 pb-28 pt-[max(env(safe-area-inset-top),3rem)] sm:px-6 lg:px-8">
      <PageBackButton label="Profile" fallback="/profile" />

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

      <Leaderboard limit={100} showHeading={false} />
    </div>
  );
}
