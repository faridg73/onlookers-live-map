import { useCallback, useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Users, PartyPopper, Target, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ShareArtifactButton } from "@/components/ShareArtifactButton";
import { useAuth } from "@/hooks/use-auth";
import {
  contributeToPool,
  createPool,
  listPools,
  POOL_CHIP_IN_AMOUNTS,
  POOL_GOAL_PRESETS,
  type BountyPool,
} from "@/lib/pools";
import { creditsToUsdValue } from "@/lib/credits";

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
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [place, setPlace] = useState("");
  const [goal, setGoal] = useState<number>(200);
  const [kind, setKind] = useState<"bounty" | "meetup">("bounty");

  const load = useCallback(async () => {
    if (!user) {
      setPools([]);
      setLoading(false);
      return;
    }
    try {
      setPools(await listPools());
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
    if (!title.trim()) {
      toast.error("Give your pool a title.");
      return;
    }
    try {
      await createPool({ title, place, goalCredits: goal, kind });
      toast.success("Pool opened — share it so people chip in.");
      setTitle("");
      setPlace("");
      setCreating(false);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't open that pool.");
    }
  };

  const chipIn = async (pool: BountyPool, amount: number) => {
    try {
      const total = await contributeToPool(pool.id, amount);
      toast.success(`You chipped in ${amount} Credits — ${total} of ${pool.goalCredits} pooled.`);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't chip in right now.");
    }
  };

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
          {creating ? (
            <div className="mt-5 space-y-3 rounded-2xl border border-signal/40 bg-surface p-4">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="What should happen? e.g. Live view of the stadium gates"
                className="w-full rounded-xl border border-border bg-surface-raised px-3 py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-signal"
              />
              <input
                value={place}
                onChange={(e) => setPlace(e.target.value)}
                placeholder="Where? e.g. Soldier Field, Chicago"
                className="w-full rounded-xl border border-border bg-surface-raised px-3 py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-signal"
              />
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
                      {creditsToUsdValue(amount)}
                    </div>
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <Button onClick={submit} className="flex-1">
                  Open the pool
                </Button>
                <Button variant="ghost" onClick={() => setCreating(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <Button onClick={() => setCreating(true)} className="mt-5 w-full gap-2">
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
                      · {creditsToUsdValue(pool.pooledCredits)} ·{" "}
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
