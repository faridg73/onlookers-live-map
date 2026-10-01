// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import { useEffect, useState } from "react";
import { clearPreviousAuthState } from "@/lib/auth-session";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  BadgeDollarSign,
  Building2,
  Camera,
  ChevronRight,
  Clock,
  FileText,
  Gavel,
  Headphones,
  Home,
  HelpCircle,
  Info,
  LogOut,
  MessageSquare,
  PlusSquare,
  Radio,
  Shield,
  Star,
  Users,
  Wallet,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ProfileAccordion } from "@/components/ProfileAccordion";
import { Sparkles } from "lucide-react";
import { RequestCard } from "@/components/RequestCard";
import { PosterBountyDashboard } from "@/components/PosterBountyDashboard";
import { ProfessionalVisitsDashboard } from "@/components/pro/ProfessionalVisitsDashboard";
import { useOnlooker } from "@/lib/onlooker-store";
import { FollowingCreators } from "@/components/FollowingCreators";
import { HunterStatusCard } from "@/components/HunterStatusCard";
import { MembershipBadge } from "@/components/MembershipBadge";
import { fetchUserWallet } from "@/lib/wallet-ledger";
import { AlertSettingsCard } from "@/components/AlertSettingsCard";
import { StreakCard } from "@/components/StreakCard";
import { toast } from "sonner";
import { replayOnboarding } from "@/lib/profile";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { CreatorVerificationCard } from "@/components/CreatorVerificationCard";
import { TrustLevelBadge } from "@/components/TrustLevelBadge";
import { fetchMyVerification } from "@/lib/verification";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { fetchMyProfile, type MyProfile } from "@/lib/profile";
import { useQueryClient } from "@tanstack/react-query";
import { SocialLinks } from "@/components/Footer";
import { ProfileEditor } from "@/components/ProfileEditor";
import { fetchProfileStats, type ProfileStats } from "@/lib/profile-stats";
import { BlockedAccounts } from "@/components/BlockedAccounts";
import { MyCommunityPosts } from "@/components/MyCommunityPosts";
import { listMyRecentActivity, type ProfileActivityItem, type ProfileActivityKind } from "@/lib/profile-activity.functions";
import { formatAgoISO } from "@/lib/onlooker";


export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Your Onlooker Profile: earnings and requests" },
      {
        name: "description",
        content:
          "Track the bounties you earned as an onlooker and every request you posted.",
      },
      { property: "og:title", content: "Your Onlooker Profile" },
      {
        property: "og:description",
        content: "Bounties earned as an onlooker and every request you posted.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ProfileScreen,
});


const ACTIVITY_COPY: Record<ProfileActivityKind, { icon: typeof Radio; verb: string }> = {
  claimed: { icon: Radio, verb: "Claimed" },
  posted: { icon: PlusSquare, verb: "Posted" },
  submitted: { icon: Camera, verb: "Sent footage for" },
  completed: { icon: Clock, verb: "Completed" },
  streamed: { icon: Radio, verb: "Broadcast" },
};

function ProfileScreen() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { requests } = useOnlooker();
  const mine = requests.filter((r) => r.requester === "you");
  const [verified, setVerified] = useState(false);
  const [profile, setProfile] = useState<MyProfile | null>(null);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [showAllActivity, setShowAllActivity] = useState(false);
  const [stats, setStats] = useState<ProfileStats | null>(null);
  const [memberTier, setMemberTier] = useState<string | null>(null);
  const [activity, setActivity] = useState<ProfileActivityItem[] | null>(null);
  const [activityFailed, setActivityFailed] = useState(false);

  // Paid membership badge — refreshes when a checkout completes.
  useEffect(() => {
    if (!user) { setMemberTier(null); return; }
    let live = true;
    const load = () => fetchUserWallet().then((w) => live && setMemberTier(w?.subscriptionTier ?? null)).catch(() => {});
    void load();
    window.addEventListener("onlooker:credits-refresh", load);
    return () => { live = false; window.removeEventListener("onlooker:credits-refresh", load); };
  }, [user?.id]);

  useEffect(() => {
    if (!user) { setActivity([]); return; }
    let active = true;
    setActivity(null);
    setActivityFailed(false);
    listMyRecentActivity()
      .then((rows) => { if (active) setActivity(rows); })
      .catch(() => {
        if (active) {
          setActivityFailed(true);
          setActivity([]);
        }
      });
    return () => { active = false; };
  }, [user?.id]);

  useEffect(() => {
    if (!user) { setStats(null); return; }
    let live = true;
    const load = () => fetchProfileStats(user.id).then((next) => live && setStats(next)).catch(() => {});
    void load();
    window.addEventListener("onlooker:credits-refresh", load);
    return () => { live = false; window.removeEventListener("onlooker:credits-refresh", load); };
  }, [user?.id]);

  const STATS = [
    { icon: Wallet, label: "Earned as onlooker", value: stats?.totalEarned != null ? `${stats.totalEarned.toLocaleString()} cr` : "—" },
    { icon: Camera, label: "Shots sent", value: stats?.shots != null ? String(stats.shots) : "—" },
    { icon: Star, label: "Rating", value: stats?.rating != null ? stats.rating.toFixed(1) : "New" },
  ];

  useEffect(() => {
    let active = true;
    if (!user) {
      setVerified(false);
      setProfile(null);
      return;
    }
    const userId = user.id;
    Promise.all([fetchMyVerification(userId), fetchMyProfile(userId)]).then(([status, nextProfile]) => {
      if (!active || nextProfile?.id !== userId) return;
      if (active) setVerified(Boolean(status?.isVerified));
      setProfile(nextProfile);
    });
    return () => {
      active = false;
    };
  }, [user?.id]);

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    // End the session on the server for every device, then wipe every
    // local copy so reopening Profile can never restore it.
    await supabase.auth.signOut({ scope: "global" }).catch(() => undefined);
    try {
      await clearPreviousAuthState();
    } catch {
      toast.error("Could not sign out. Please try again.");
      return;
    }
    window.location.replace("/auth");
  }

  // Coming back from checkout: confirm the payment and pull the new balance in.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const status = params.get("credits");
    if (!status) return;

    window.history.replaceState({}, "", window.location.pathname);

    if (status === "cancelled") {
      toast("Checkout cancelled. You were not charged.");
      return;
    }
    if (status !== "success") return;

    toast.success("Payment received. Adding your Credits…");

    const timers = [0, 1500, 4000, 8000].map((delay) =>
      window.setTimeout(
        () => window.dispatchEvent(new Event("onlooker:credits-refresh")),
        delay,
      ),
    );
    return () => timers.forEach((id) => window.clearTimeout(id));
  }, []);


  return (
    <div className="app-shell pb-32 pt-[max(env(safe-area-inset-top),3rem)]">
      <Link
        to="/"
        aria-label="Back to home"
        className="mb-3 inline-flex size-9 items-center justify-center rounded-full border border-border bg-surface text-muted-foreground transition-colors hover:border-signal/60 hover:text-signal"
      >
        <Home className="size-4" />
      </Link>
      <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-4">
        <ProfileEditor
          profile={profile}
          fallbackName={user?.email?.split("@")[0] ?? "Onlooker"}
          onSaved={setProfile}
        />
        <div className="min-w-0">
          <h1 className="flex min-w-0 items-center gap-2 font-display text-2xl tracking-tight text-foreground">
            <span className="truncate">
            {profile?.display_name ?? user?.email?.split("@")[0] ?? "Onlooker"}
            </span>
            {verified && <VerifiedBadge className="size-5" />}
            <MembershipBadge tier={memberTier} />
          </h1>
          <p className="text-sm text-muted-foreground">
            {profile?.location?.trim() || "Location not added"}
          </p>
          {profile?.bio?.trim() && (
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{profile.bio}</p>
          )}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-3 min-[360px]:grid-cols-3">
        {STATS.map(({ icon: Icon, label, value }) => (
          <div key={label} className="min-w-0 rounded-2xl border border-border bg-surface px-2 py-3 text-center sm:p-4">
            <Icon className="mx-auto size-4 text-signal" />
            <div className="mt-2 truncate font-display text-lg text-foreground sm:text-xl">{value}</div>
            <div className="text-[0.6rem] uppercase tracking-[0.16em] text-muted-foreground">
              {label}
            </div>
          </div>
        ))}
      </div>

      <StreakCard />

      <Link
        to="/membership"
        className="mt-6 flex items-center justify-between rounded-2xl border border-signal/40 bg-surface px-4 py-3 text-sm text-foreground hover:bg-surface-raised"
      >
        <span className="flex items-center gap-3">
          <Sparkles className="size-5 text-signal" />
          <span className="flex flex-col">
            <span className="font-semibold">Onlooker+ membership — from $9.99/mo</span>
            <span className="text-xs text-muted-foreground">Compare plans and see your wallet history</span>
          </span>
        </span>
        <ChevronRight className="size-4 text-signal" />
      </Link>

      <MyCommunityPosts />

      <Link
        to="/balance"
        className="mt-6 flex items-center justify-between rounded-2xl border border-live bg-live/10 px-4 py-3 text-sm text-foreground hover:bg-live/15"
      >
        <span className="flex items-center gap-3">
          <Wallet className="size-5 text-live" />
          <span className="flex flex-col">
            <span className="font-semibold">Balance &amp; Cashout</span>
            <span className="text-xs text-muted-foreground">Credits, purchases and bank payout</span>
          </span>
        </span>
        <ChevronRight className="size-4 text-live" />
      </Link>

      <HunterStatusCard />

      <ProfileAccordion title="Level & points" hint="Your trust level, points and Safety Tutorial">
        <TrustLevelBadge className="mt-1" />
      </ProfileAccordion>
      <CreatorVerificationCard />

      <AlertSettingsCard />


      <Link
        to="/pools"
        className="mt-6 flex items-center justify-between rounded-2xl border border-signal/40 bg-surface px-4 py-3 text-sm text-foreground hover:bg-surface-raised"
      >
        <span className="flex items-center gap-3">
          <Users className="size-4 text-signal" /> Group Pools: fund a bounty together
        </span>
        <ChevronRight className="size-4 text-muted-foreground" />
      </Link>


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
      <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
        {activity === null ? (
          <p className="rounded-2xl border border-border bg-surface p-6 text-center text-sm text-muted-foreground md:col-span-2 xl:col-span-3">Loading your activity…</p>
        ) : activityFailed ? (
          <p className="rounded-2xl border border-border bg-surface p-6 text-center text-sm text-muted-foreground md:col-span-2 xl:col-span-3">We couldn&apos;t load your activity right now.</p>
        ) : activity.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground md:col-span-2 xl:col-span-3">Your bounty and broadcast activity will appear here.</p>
        ) : (showAllActivity ? activity : activity.slice(0, 2)).map((item) => {
          const copy = ACTIVITY_COPY[item.kind];
          const Icon = copy.icon;
          const creditLabel = item.credits == null ? null : `${item.kind === "claimed" || item.kind === "submitted" ? "Up to " : item.kind === "completed" || item.kind === "streamed" ? "+" : ""}${item.credits.toLocaleString()} Credits`;
          return (
          <div
            key={item.id}
            className="flex items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3"
          >
            <Icon className="size-4 shrink-0 text-signal" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-foreground">{copy.verb} “{item.title}”</p>
              <p className="text-xs text-muted-foreground">{[creditLabel, formatAgoISO(item.occurredAt)].filter(Boolean).join(" · ")}</p>
            </div>
          </div>
          );
        })}
      </div>
      {(activity?.length ?? 0) > 2 && (
        <button
          type="button"
          onClick={() => setShowAllActivity((v) => !v)}
          className="mt-2 text-xs font-bold uppercase tracking-[0.12em] text-signal"
        >
          {showAllActivity ? "Show less" : `See all (${activity?.length ?? 0})`}
        </button>
      )}

      <FollowingCreators />

      <ProfessionalVisitsDashboard />

      <PosterBountyDashboard />

      <h2 className="mt-8 font-display text-lg text-foreground">Your requests</h2>
      <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {mine.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            You haven't posted a request yet.
          </p>
        ) : (
          mine.map((r) => <RequestCard key={r.id} request={r} />)
        )}
      </div>

      <ProfileAccordion title="Support & Legal" hint="How It Works, About, Contact, Disputes, FAQ, Terms, Privacy">
      <div className="space-y-2">
        <button
          type="button"
          onClick={() => {
            replayOnboarding().catch((err: unknown) =>
              toast.error(err instanceof Error ? err.message : "Could not open the guide."),
            );
          }}
          className="flex w-full items-center justify-between rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-foreground hover:bg-surface-raised"
        >
          <span className="flex items-center gap-3">
            <Info className="size-4 text-signal" /> How It Works: app guide
          </span>
          <ChevronRight className="size-4 text-muted-foreground" />
        </button>
        <button
          type="button"
          onClick={() => setAboutOpen(true)}
          className="flex w-full items-center justify-between rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-foreground hover:bg-surface-raised"
        >
          <span className="flex items-center gap-3">
            <Building2 className="size-4 text-signal" /> About Us
          </span>
          <ChevronRight className="size-4 text-muted-foreground" />
        </button>
        <Link
          to="/contact"
          className="flex items-center justify-between rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-foreground hover:bg-surface-raised"
        >
          <span className="flex items-center gap-3">
            <Headphones className="size-4 text-signal" /> Contact &amp; Support
          </span>
          <ChevronRight className="size-4 text-muted-foreground" />
        </Link>
        <a
          href="mailto:support@onlooker.io"
          className="flex items-center justify-between rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-foreground hover:bg-surface-raised"
        >
          <span className="flex items-center gap-3">
            <Headphones className="size-4 text-signal" /> Email support
          </span>
          <span className="text-xs text-muted-foreground">support@onlooker.io</span>
        </a>
        <BlockedAccounts />
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
      </ProfileAccordion>

      <h2 className="mt-8 font-display text-lg text-foreground">Account</h2>
      <div className="mt-3">
        <button
          type="button"
          onClick={handleSignOut}
          className="flex w-full items-center justify-between rounded-2xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-foreground hover:bg-destructive/15"
        >
          <span className="flex items-center gap-3">
            <LogOut className="size-4 text-destructive" /> Log out
          </span>
          <ChevronRight className="size-4 text-destructive" />
        </button>
      </div>


      <Dialog open={aboutOpen} onOpenChange={setAboutOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl tracking-tight text-foreground">
              About Onlooker
            </DialogTitle>
            <DialogDescription className="sr-only">
              Company mission and vision for Onlooker.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 text-sm leading-relaxed text-muted-foreground">
            <p className="text-foreground">
              Onlooker is an on-the-spot video marketplace. It connects people who want to see a place right now with creators who are already standing there.
            </p>
            <p>
              The best moments are never scripted. They happen around the corner or across the ocean, and they only stay interesting for a moment. We built Onlooker so anyone can tap a map, post a live request, and get an honest look from a real person on the ground, with bounties held securely until the job is done.
            </p>
            <p>
              Made for creators, trusted by viewers, and designed for instant connection. Welcome to the live view network.
            </p>
          </div>
          <div className="border-t border-border pt-4">
            <p className="mb-3 text-xs uppercase tracking-[0.16em] text-muted-foreground">
              Follow Onlooker
            </p>
            <SocialLinks className="flex items-center gap-3" />
          </div>

        </DialogContent>
      </Dialog>
    </div>
  );
}
