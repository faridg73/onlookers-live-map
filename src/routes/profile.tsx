import { createFileRoute, Link } from "@tanstack/react-router";
import {
  BadgeDollarSign,
  Camera,
  ChevronRight,
  Clock,
  FileText,
  Gavel,
  Headphones,
  HelpCircle,
  MessageSquare,
  PlusSquare,
  Radio,
  Shield,
  Star,
  Wallet,
} from "lucide-react";
import { RequestCard } from "@/components/RequestCard";
import { useOnlooker } from "@/lib/onlooker-store";
import { MyBountyVideos } from "@/components/MyBountyVideos";
import { Leaderboard } from "@/components/Leaderboard";
import { WeeklyTopOnlookers } from "@/components/WeeklyTopOnlookers";
import { CashOutCard } from "@/components/CashOutCard";
import { EarningsWallet } from "@/components/EarningsWallet";
import { HunterStatusCard } from "@/components/HunterStatusCard";

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

      <HunterStatusCard />

      <EarningsWallet />

      <CashOutCard />

      <Link
        to="/payout-history"
        className="mt-6 flex items-center justify-between rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-foreground hover:bg-surface-raised"
      >
        <span className="flex items-center gap-3">
          <BadgeDollarSign className="size-4 text-signal" /> Payout history
        </span>
        <ChevronRight className="size-4 text-muted-foreground" />
      </Link>

      <h2 className="mt-8 font-display text-lg text-foreground">Recent activity</h2>
      <div className="mt-3 space-y-2">
        {ACTIVITY.map(({ icon: Icon, text, meta }) => (
          <div
            key={text}
            className="flex items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3"
          >
            <Icon className="size-4 shrink-0 text-signal" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-foreground">{text}</p>
              <p className="text-xs text-muted-foreground">{meta}</p>
            </div>
          </div>
        ))}
      </div>

      <WeeklyTopOnlookers />

      <Leaderboard limit={5} moreLink />

      <MyBountyVideos />

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

      <h2 className="mt-8 font-display text-lg text-foreground">Support &amp; legal</h2>
      <div className="mt-3 space-y-2">
        <Link
          to="/contact"
          className="flex items-center justify-between rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-foreground hover:bg-surface-raised"
        >
          <span className="flex items-center gap-3">
            <Headphones className="size-4 text-signal" /> Contact &amp; Support
          </span>
          <ChevronRight className="size-4 text-muted-foreground" />
        </Link>
        <Link
          to="/disputes"
          className="flex items-center justify-between rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-foreground hover:bg-surface-raised"
        >
          <span className="flex items-center gap-3">
            <Gavel className="size-4 text-signal" /> Dispute center
          </span>
          <ChevronRight className="size-4 text-muted-foreground" />
        </Link>
        <Link
          to="/faq"
          className="flex items-center justify-between rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-foreground hover:bg-surface-raised"
        >
          <span className="flex items-center gap-3">
            <HelpCircle className="size-4 text-signal" /> Help &amp; FAQ
          </span>
          <ChevronRight className="size-4 text-muted-foreground" />
        </Link>
        <Link
          to="/terms"
          className="flex items-center justify-between rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-foreground hover:bg-surface-raised"
        >
          <span className="flex items-center gap-3">
            <FileText className="size-4 text-signal" /> Terms of Service
          </span>
          <ChevronRight className="size-4 text-muted-foreground" />
        </Link>
        <Link
          to="/privacy"
          className="flex items-center justify-between rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-foreground hover:bg-surface-raised"
        >
          <span className="flex items-center gap-3">
            <Shield className="size-4 text-signal" /> Privacy Policy
          </span>
          <ChevronRight className="size-4 text-muted-foreground" />
        </Link>
      </div>
    </div>
  );
}
