import { useCallback, useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Users, PartyPopper, Target, Plus, Wallet } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ShareArtifactButton } from "@/components/ShareArtifactButton";
import { HunterBadge } from "@/components/HunterBadge";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { useHumanCheck } from "@/components/HumanCheck";
import { useAuth } from "@/hooks/use-auth";
import { verifyHumanCheck } from "@/lib/turnstile.functions";
import {
  contributeToPool,
  fetchPoolIdentity,
  listPools,
  openPoolAsMember,
  poolFormErrors,
  POOL_CHIP_IN_AMOUNTS,
  POOL_GOAL_PRESETS,
  POOL_STARTER_CREDITS,
  type BountyPool,
  type PoolFormErrors,
  type PoolIdentity,
} from "@/lib/pools";
import { fetchCreditWallet, formatCreditCash } from "@/lib/credits";

export const Route = createFileRoute("/pools")({
  head: () => ({
    meta: [
      { title: "Group Pools — fund a bounty together on Onlooker" },
      {
        name: "description",
        content:
          "Chip in Credits with other people to fund bigger community bounties and sponsor local flash meetups.",
      },
      { property: "og:title", content: "Group Pools on Onlooker Live" },
      {
        property: "og:description",
        content: "Pool Credits with your city to fund bigger bounties and flash meetups.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PoolsScreen,
});

function PoolsScreen() {
  const { user } = useAuth();
  const [pools, setPools] = useState<BountyPool[]>([]);
  const [identity, setIdentity] = useState<PoolIdentity | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [title, setTitle] = useState("");
  const [place, setPlace] = useState("");
  const [goal, setGoal] = useState<number>(200);
  const [kind, setKind] = useState<"bounty" | "meetup">("bounty");
  const [starter, setStarter] = useState<number>(POOL_STARTER_CREDITS);
  const [errors, setErrors] = useState<PoolFormErrors>({});
  const human = useHumanCheck("bounty-pool");

  const load = useCallback(async () => {
    if (!user) {
      setPools([]);
      setIdentity(null);
      setBalance(null);
      setLoading(false);
      return;
    }
    try {
      const [list, me, wallet] = await Promise.all([
        listPools(),
        fetchPoolIdentity(user.id),
        fetchCreditWallet().catch(() => null),
      ]);
      setPools(list);
      setIdentity(me);
      setBalance(wallet?.creditBalance ?? null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't load the pools.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  const submit = async () => {
    const found = poolFormErrors({ title, place, goalCredits: goal });
    setErrors(found);
    if (Object.keys(found).length > 0) {
      toast.error("Check the highlighted fields before opening your pool.");
      return;
    }
    if (!user || !identity) {
      toast.error("Sign in again — we couldn't confirm your account.");
      return;
    }
    if (balance === null) {
      toast.error("We're still loading your Credit balance — try again in a moment.");
      return;
    }
    if (balance < starter) {
      toast.error(
        `Not enough Credits — opening this pool puts ${starter} behind it and you have ${balance}. Top up on your balance page.`,
      );
      return;
    }
    if (!human.ready) {
      toast.error("Finish the quick human check before opening a pool.");
      return;
    }
    setSubmitting(true);
    try {
      const check = await verifyHumanCheck({
        data: { token: human.token ?? "", action: "bounty-pool" },
      });
      if (!check.ok) throw new Error("The human check didn't pass. Please try again.");
      await openPoolAsMember(user.id, {
        title,
        place,
        goalCredits: goal,
        kind,
        starterCredits: starter,
      });
      toast.success(`Pool opened with ${starter} Credits behind it — share it so people chip in.`);
      setTitle("");
      setPlace("");
      setErrors({});
      setCreating(false);
      human.reset();
      await load();
    } catch (err) {
      human.reset();
      toast.error(err instanceof Error ? err.message : "Couldn't open that pool.");
    } finally {
      setSubmitting(false);
    }
  };

  const chipIn = async (pool: BountyPool, amount: number) => {
    if (balance !== null && balance < amount) {
      toast.error(
        `Not enough Credits — you have ${balance} and this chip-in needs ${amount}. Top up on your balance page.`,
      );
      return;
    }
    try {
      const total = await contributeToPool(pool.id, amount);
      toast.success(`You chipped in ${amount} Credits — ${total} of ${pool.goalCredits} pooled.`);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't chip in right now.");
    }
  };

  const fieldClass = (bad?: string) =>
    `w-full rounded-xl border bg-surface-raised px-3 py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground ${
      bad ? "border-destructive focus:border-destructive" : "border-border focus:border-signal"
    }`;

  return (
    <div className="mx-auto max-w-lg px-4 pb-28 pt-6">
      <h1 className="font-display text-2xl tracking-tight text-foreground">Group Pools</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Everyone chips in Credits together to fund a bigger bounty or sponsor a local flash meetup.
      </p>

      {!user ? (
        <p className="mt-6 rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          Sign in to start a pool or chip in on one.
        </p>
      ) : (
        <>
          <div className="mt-5 flex items-center gap-3 rounded-2xl border border-border bg-surface p-3">
            {identity?.avatarUrl ? (
              <img
                src={identity.avatarUrl}
                alt={`${identity.username}'s profile photo`}
                className="size-11 shrink-0 rounded-full object-cover"
              />
            ) : (
              <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-surface-raised font-display text-base text-signal">
                {(identity?.username ?? "O").slice(0, 1).toUpperCase()}
              </span>
            )}
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1 truncate text-sm font-bold text-foreground">
                @{identity?.username ?? "onlooker"}
                {identity?.isVerified && <VerifiedBadge />}
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <HunterBadge level={identity?.hunterLevel ?? 1} />
                <span className="inline-flex items-center gap-1 text-[0.68rem] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                  <Wallet className="size-3" />
                  {balance === null ? "Wallet loading" : `${balance} Credits`}
                </span>
              </div>
            </div>
          </div>

          {creating ? (
            <div className="mt-4 space-y-3 rounded-2xl border border-signal/40 bg-surface p-4">
              <div>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="What should happen? e.g. Live view of the stadium gates"
                  className={fieldClass(errors.title)}
                />
                {errors.title && (
                  <p className="mt-1 text-xs text-destructive">{errors.title}</p>
                )}
              </div>
              <div>
                <input
                  value={place}
                  onChange={(e) => setPlace(e.target.value)}
                  placeholder="Where? e.g. Soldier Field, Chicago"
                  className={fieldClass(errors.place)}
                />
                {errors.place && (
                  <p className="mt-1 text-xs text-destructive">{errors.place}</p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                {(["bounty", "meetup"] as const).map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setKind(k)}
                    className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold uppercase tracking-[0.12em] ${
                      kind === k
                        ? "border-signal bg-signal/15 text-signal"
                        : "border-border text-muted-foreground"
                    }`}
                  >
                    {k === "bounty" ? <Target className="size-4" /> : <PartyPopper className="size-4" />}
                    {k === "bounty" ? "Community bounty" : "Flash meetup"}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-4 gap-2">
                {POOL_GOAL_PRESETS.map((amount) => (
                  <button
                    key={amount}
                    type="button"
                    onClick={() => setGoal(amount)}
                    className={`rounded-xl border px-2 py-3 text-center ${
                      goal === amount
                        ? "border-signal bg-signal/15 text-signal"
                        : "border-border text-foreground"
                    }`}
                  >
                    <div className="font-display text-base">{amount}</div>
                    <div className="text-[0.6rem] text-muted-foreground">
                      {formatCreditCash(amount)}
                    </div>
                  </button>
                ))}
              </div>
              {errors.goal && <p className="text-xs text-destructive">{errors.goal}</p>}
              <div>{human.widget}</div>
              <div className="flex gap-2">
                <Button onClick={submit} disabled={submitting} className="flex-1">
                  {submitting ? "Opening…" : "Open the pool"}
                </Button>
                <Button variant="ghost" onClick={() => setCreating(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <Button onClick={() => setCreating(true)} className="mt-4 w-full gap-2">
              <Plus className="size-4" /> Start a pool
            </Button>
          )}

          <div className="mt-6 space-y-3">
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading pools…</p>
            ) : pools.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                No pools yet — start the first one for your city.
              </p>
            ) : (
              pools.map((pool) => {
                const pct = Math.min(
                  100,
                  Math.round((pool.pooledCredits / Math.max(pool.goalCredits, 1)) * 100),
                );
                return (
                  <article key={pool.id} className="rounded-2xl border border-border bg-surface p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-display text-base text-foreground">
                          {pool.title}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {pool.place || "Anywhere"} ·{" "}
                          {pool.kind === "meetup" ? "Flash meetup" : "Community bounty"}
                          {identity && pool.creatorId === identity.userId
                            ? ` · started by @${identity.username}`
                            : ""}
                        </p>
                      </div>
                      <span className="shrink-0 rounded-full bg-signal/15 px-2 py-1 text-[0.6rem] font-bold uppercase tracking-[0.12em] text-signal">
                        {pool.status === "funded" ? "Funded" : `${pct}%`}
                      </span>
                    </div>

                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-raised">
                      <div className="h-full rounded-full bg-signal" style={{ width: `${pct}%` }} />
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      <span className="font-bold text-foreground">
                        {pool.pooledCredits} / {pool.goalCredits} Credits
                      </span>{" "}
                      · {formatCreditCash(pool.pooledCredits)} ·{" "}
                      <span className="inline-flex items-center gap-1">
                        <Users className="size-3" /> {pool.backers} backers
                      </span>
                    </p>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {POOL_CHIP_IN_AMOUNTS.map((amount) => (
                        <button
                          key={amount}
                          type="button"
                          disabled={pool.status !== "open"}
                          onClick={() => void chipIn(pool, amount)}
                          className="rounded-xl border border-border px-3 py-2 text-xs font-bold text-foreground transition-colors hover:border-signal hover:text-signal disabled:opacity-50"
                        >
                          +{amount}
                        </button>
                      ))}
                      <ShareArtifactButton
                        label="Share"
                        artifact={{
                          kind: pool.kind === "meetup" ? "meetup" : "pool",
                          title: pool.title,
                          place: pool.place,
                          credits: pool.pooledCredits,
                          note: `${pool.backers} people have pooled towards a ${pool.goalCredits} Credit goal.`,
                        }}
                      />
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </>
      )}
    </div>
  );
}
