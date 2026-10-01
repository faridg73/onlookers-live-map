// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import { useEffect, useState } from "react";
import { Loader2, Star } from "lucide-react";
import { toast } from "sonner";

import { ReputationCard } from "@/components/ReputationCard";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { invalidateReputationCard } from "@/lib/reputation-cards";
import { cn } from "@/lib/utils";

/**
 * Hunter reputation card plus, once the job is complete, a one-time
 * "Rate your onlooker" prompt for the client. The database enforces one
 * rating per job per client and only after the hunter's work was approved.
 */
export function HunterWithRating({
  requestId,
  hunterId,
  complete,
  cardClassName,
}: {
  requestId: string;
  hunterId: string;
  complete: boolean;
  cardClassName?: string;
}) {
  const { user } = useAuth();
  const [version, setVersion] = useState(0);
  const [existing, setExisting] = useState<number | null | undefined>(undefined);
  const [score, setScore] = useState(0);
  const [hover, setHover] = useState(0);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!complete || !user) return;
    let alive = true;
    supabase
      .from("ratings")
      .select("score")
      .eq("request_id", requestId)
      .eq("rater_id", user.id)
      .maybeSingle()
      .then(({ data }) => alive && setExisting(data?.score ?? null));
    return () => {
      alive = false;
    };
  }, [complete, requestId, user]);

  async function submit() {
    if (!user || score < 1) return;
    setSaving(true);
    const { error } = await supabase.from("ratings").insert({
      request_id: requestId,
      rater_id: user.id,
      ratee_id: hunterId,
      score,
      note: note.trim().slice(0, 280),
    } as never);
    setSaving(false);
    if (error) {
      toast.error(error.code === "23505" ? "You already rated this hunter." : error.message);
      return;
    }
    toast.success("Thanks — your rating was saved.");
    setExisting(score);
    invalidateReputationCard(hunterId);
    setVersion((v) => v + 1);
  }

  const showPrompt = complete && user && user.id !== hunterId && existing === null;

  return (
    <>
      <ReputationCard key={version} userId={hunterId} fallbackName="Onlooker" className={cardClassName ?? ""} />
      {complete && typeof existing === "number" && (
        <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
          You rated this hunter {existing}
          <Star className="size-3 fill-signal text-signal" />
        </p>
      )}
      {showPrompt && (
        <div className="mt-3 rounded-xl border border-signal/40 bg-surface-raised p-3">
          <p className="text-sm font-semibold text-foreground">Rate your onlooker</p>
          <div className="mt-2 flex gap-1" onMouseLeave={() => setHover(0)}>
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                aria-label={`${n} star${n > 1 ? "s" : ""}`}
                onMouseEnter={() => setHover(n)}
                onClick={() => setScore(n)}
                className="p-0.5"
              >
                <Star
                  className={cn(
                    "size-6 transition-colors",
                    n <= (hover || score) ? "fill-signal text-signal" : "text-muted-foreground",
                  )}
                />
              </button>
            ))}
          </div>
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value.slice(0, 280))}
            placeholder="Add a short note (optional)"
            className="mt-2 min-h-16 text-sm"
          />
          <div className="mt-2 flex items-center justify-between">
            <span className="text-[0.65rem] text-muted-foreground">{note.length}/280</span>
            <Button size="sm" disabled={score < 1 || saving} onClick={submit} className="bg-signal text-signal-foreground">
              {saving && <Loader2 className="size-4 animate-spin" />} Submit rating
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
