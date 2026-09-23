// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import { useEffect, useState } from "react";
import { Plus } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { planById } from "@/lib/subscriptions";
import { cn } from "@/lib/utils";

type PaidTier = "observer" | "hunter" | "operative";

const cache = new Map<string, Promise<PaidTier | null>>();
let pending: { ids: Set<string>; resolvers: Map<string, (t: PaidTier | null) => void> } | null = null;

/** Batches tier lookups from many cards into one request. */
function lookupTier(userId: string): Promise<PaidTier | null> {
  const hit = cache.get(userId);
  if (hit) return hit;
  const promise = new Promise<PaidTier | null>((resolve) => {
    if (!pending) {
      pending = { ids: new Set(), resolvers: new Map() };
      setTimeout(async () => {
        const batch = pending!;
        pending = null;
        const { data } = await supabase.rpc("get_member_tiers", { _user_ids: [...batch.ids] });
        const found = new Map((data ?? []).map((r: { user_id: string; tier: string }) => [r.user_id, r.tier as PaidTier]));
        batch.resolvers.forEach((res, id) => res(found.get(id) ?? null));
      }, 30);
    }
    pending.ids.add(userId);
    pending.resolvers.set(userId, resolve);
  });
  cache.set(userId, promise);
  return promise;
}

/** Forget cached tiers so a fresh payment shows up right away. */
export function clearMembershipCache(userId?: string) {
  if (userId) cache.delete(userId);
  else cache.clear();
}

/** Onlooker+ paid membership badge. Renders nothing for free accounts. */
export function MembershipBadge({
  tier,
  userId,
  className,
}: {
  tier?: string | null;
  userId?: string;
  className?: string;
}) {
  const [resolved, setResolved] = useState<string | null>(tier ?? null);

  useEffect(() => {
    if (tier !== undefined) {
      setResolved(tier);
      return;
    }
    if (!userId) return;
    let alive = true;
    void lookupTier(userId).then((t) => alive && setResolved(t));
    return () => {
      alive = false;
    };
  }, [tier, userId]);

  const plan = resolved && resolved !== "free" ? planById(resolved as PaidTier) : null;
  if (!plan) return null;
  const top = plan.id === "operative";
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-0.5 rounded-full border px-2 py-0.5 text-[0.6rem] font-extrabold uppercase tracking-[0.12em]",
        top
          ? "border-signal bg-signal text-signal-foreground"
          : plan.id === "hunter"
            ? "border-signal/70 bg-signal/10 text-signal"
            : "border-border bg-surface-raised text-foreground",
        className,
      )}
      title={`Onlooker+ ${plan.name} member`}
    >
      <Plus className="size-3" strokeWidth={3} aria-hidden />
      {plan.name}
    </span>
  );
}
