// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import { useEffect, useState } from "react";
import { UserPlus } from "lucide-react";
import { FollowButton } from "@/components/FollowButton";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { FOLLOWS_CHANGED_EVENT, listFollowedCreators, type FollowedCreator } from "@/lib/follows";
import { useAuth } from "@/hooks/use-auth";

/** The creators this member follows, with a live follow/unfollow control on each row. */
export function FollowingCreators() {
  const { user } = useAuth();
  const [rows, setRows] = useState<FollowedCreator[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setRows([]);
      return;
    }
    let alive = true;
    const load = () =>
      listFollowedCreators()
      .then((data) => {
        if (alive) {
          setRows(data);
          setError(null);
        }
      })
      .catch((err) => {
        console.error("[FollowingCreators] could not load follows", err);
        if (alive) {
          setRows([]);
          setError("We couldn't load who you follow. Pull down to try again.");
        }
      });
    void load();
    const refresh = () => void load();
    window.addEventListener(FOLLOWS_CHANGED_EVENT, refresh);
    return () => {
      alive = false;
      window.removeEventListener(FOLLOWS_CHANGED_EVENT, refresh);
    };
  }, [user?.id]);

  if (!user) return null;

  return (
    <section className="mt-8 rounded-2xl border border-border bg-surface p-4">
      <div className="flex items-center gap-2">
        <UserPlus className="size-4 text-signal" />
        <h2 className="font-display text-base text-foreground">Creators you follow</h2>
      </div>

      {rows === null ? (
        <p className="mt-3 text-sm text-muted-foreground">Loading your follows…</p>
      ) : error ? (
        <p className="mt-3 text-sm text-muted-foreground">{error}</p>
      ) : rows.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">
          You don't follow anyone yet. Tap Follow on a creator and their broadcasts move to the top
          of your feed.
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {rows.map((creator) => (
            <li
              key={creator.id}
              className="flex items-center gap-3 rounded-xl border border-border bg-surface-raised px-3 py-2"
            >
              {creator.avatarUrl ? (
                <img
                  src={creator.avatarUrl}
                  alt=""
                  loading="lazy"
                  className="size-9 shrink-0 rounded-full object-cover"
                />
              ) : (
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-surface text-xs font-extrabold text-signal">
                  {creator.name.slice(0, 2).toUpperCase()}
                </span>
              )}
              <span className="min-w-0 flex-1">
                <span className="flex min-w-0 items-center gap-1">
                  <span className="truncate text-sm font-bold text-foreground">{creator.name}</span>
                  {creator.verified && <VerifiedBadge className="size-3.5" />}
                </span>
                <span className="block text-[0.7rem] text-muted-foreground">
                  {creator.followerCount.toLocaleString()} followers
                </span>
              </span>
              <FollowButton creatorId={creator.id} creatorName={creator.name} size="md" />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
