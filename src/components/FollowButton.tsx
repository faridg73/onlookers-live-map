import { useEffect, useRef, useState } from "react";
import { UserPlus, UserCheck } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import {
  fetchFollowState,
  followCreator,
  FOLLOWS_CHANGED_EVENT,
  notifyFollowsChanged,
  unfollowCreator,
  watchFollowerCount,
} from "@/lib/follows";
import { cn } from "@/lib/utils";

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  return String(n);
}

/** Follow/unfollow pill shown next to a creator's name. Count updates in real time. */
export function FollowButton({
  creatorId,
  creatorName,
  className,
  size = "sm",
}: {
  creatorId: string;
  creatorName: string;
  className?: string;
  /** "md" is for standalone creator surfaces, "sm" sits inline next to a name. */
  size?: "sm" | "md";
}) {
  const { user } = useAuth();
  const isSelf = Boolean(user && user.id === creatorId);
  const [following, setFollowing] = useState(false);
  const [count, setCount] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    let alive = true;
    void fetchFollowState(creatorId)
      .then((s) => {
        if (!alive || !mounted.current) return;
        setFollowing(s.following);
        setCount(s.followerCount);
      })
      .catch((err) => {
        console.error("[FollowButton] could not load follow state", err);
        if (alive && mounted.current) setCount(null);
      });
    const unwatch = watchFollowerCount(creatorId, (n) => {
      if (mounted.current) setCount(n);
    });
    const refresh = () => {
      void fetchFollowState(creatorId)
        .then((s) => {
          if (!mounted.current) return;
          setFollowing(s.following);
          setCount(s.followerCount);
        })
        .catch((err) => console.error("[FollowButton] could not refresh follow state", err));
    };
    window.addEventListener(FOLLOWS_CHANGED_EVENT, refresh);
    return () => {
      alive = false;
      unwatch();
      window.removeEventListener(FOLLOWS_CHANGED_EVENT, refresh);
    };
  }, [creatorId, user?.id]);

  useEffect(() => () => {
    mounted.current = false;
  }, []);

  if (isSelf) return null;

  async function toggle() {
    if (!user) {
      toast("Sign in to follow creators and get their live alerts.");
      return;
    }
    if (busy) return;
    setBusy(true);
    const wasFollowing = following;
    // Optimistic toggle so the pill responds instantly.
    setFollowing(!wasFollowing);
    setCount((c) => (c === null ? c : Math.max(0, c + (wasFollowing ? -1 : 1))));
    try {
      const next = wasFollowing
        ? await unfollowCreator(creatorId)
        : await followCreator(creatorId);
      if (mounted.current) setCount(next);
      notifyFollowsChanged();
      if (!wasFollowing) toast.success(`Following ${creatorName}, you'll see their live broadcasts first.`);
    } catch (err) {
      if (mounted.current) {
        setFollowing(wasFollowing);
        setCount((c) => (c === null ? c : Math.max(0, c + (wasFollowing ? 1 : -1))));
      }
      toast.error(err instanceof Error ? err.message : "Could not update follow.");
    } finally {
      if (mounted.current) setBusy(false);
    }
  }

  const Icon = following ? UserCheck : UserPlus;
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        void toggle();
      }}
      disabled={busy}
      aria-pressed={following}
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full border font-extrabold uppercase tracking-wide transition-colors disabled:opacity-60",
        size === "md" ? "px-3 py-1.5 text-[0.7rem]" : "px-2 py-0.5 text-[0.62rem]",
        following
          ? "border-signal/50 bg-signal/15 text-signal"
          : "border-border bg-surface-raised text-foreground hover:border-signal/50 hover:text-signal",
        className,
      )}
    >
      <Icon className={size === "md" ? "size-3.5" : "size-3"} />
      {following ? "Following" : "Follow"}
      {count !== null && count > 0 && (
        <span className={following ? "text-signal/80" : "text-muted-foreground"}>
          · {formatCount(count)}
        </span>
      )}
    </button>
  );
}
