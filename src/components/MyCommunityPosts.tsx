// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import { useCallback, useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronRight, ImageOff, MapPin, Radio } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { LiveBroadcastStage } from "@/components/LiveBroadcastStage";
import { useOnlooker } from "@/lib/onlooker-store";
import { refundBounty } from "@/lib/bounty-escrow";
import type { LiveRequest } from "@/lib/onlooker";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { BROADCAST_CATEGORIES } from "@/lib/broadcast-categories";
import { STARTER_VIBE_PHOTOS } from "@/lib/starter-vibe-photos";
import { COMMUNITY_VISUALS } from "@/lib/community-visuals";
import {
  communityMediaUrls,
  deleteCommunityPost,
  isActivelyStreaming,
  isBroadcastPost,
  isPostLive,
  listMyCommunityPosts,
  pingBroadcast,
  type CommunityPost,
} from "@/lib/community";

function leftLabel(ms: number) {
  const m = Math.max(0, Math.round(ms / 60000));
  if (m <= 0) return "Ended";
  return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m left` : `${m} min left`;
}

type PostStatus = { label: string; tone: string };
function postStatus(post: CommunityPost): PostStatus {
  if (post.hiddenAt) return { label: "Under review", tone: "bg-destructive/15 text-destructive" };
  if (!isPostLive(post)) return { label: "Expired", tone: "bg-surface-raised text-muted-foreground" };
  if (isActivelyStreaming(post)) return { label: "Live", tone: "bg-destructive text-destructive-foreground" };
  if (isBroadcastPost(post)) return { label: "Not streaming", tone: "bg-surface-raised text-muted-foreground" };
  return { label: "Posted", tone: "bg-signal/15 text-signal" };
}
function requestStatus(r: LiveRequest): PostStatus {
  if (r.status === "claimed") return { label: "Claimed", tone: "bg-signal/15 text-signal" };
  if (r.status === "open") return { label: "Open · waiting", tone: "bg-signal/15 text-signal" };
  if (r.status === "expired") return { label: "Expired", tone: "bg-surface-raised text-muted-foreground" };
  return { label: "Completed", tone: "bg-surface-raised text-muted-foreground" };
}

const rowClass =
  "flex w-full items-center gap-3 rounded-2xl border border-border bg-surface p-3 text-left transition-colors hover:bg-surface-raised active:scale-[0.99] active:bg-surface-raised";

function ago(iso: string) {
  const m = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  return h < 24 ? `${h}h ago` : `${Math.round(h / 24)}d ago`;
}

/** Profile: everything this member has posted across every vibe, newest first. */
export function MyCommunityPosts() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<CommunityPost[] | null>(null);
  const [media, setMedia] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [selected, setSelected] = useState<CommunityPost | null>(null);
  const [selectedReq, setSelectedReq] = useState<LiveRequest | null>(null);
  /** Free broadcast the owner is streaming right now from My posts. */
  const [stage, setStage] = useState<{ id: string; title: string; place: string } | null>(null);
  // Heartbeat keeps the broadcast in Live now only while the camera is open.
  useEffect(() => {
    if (!stage) return;
    void pingBroadcast(stage.id);
    const timer = window.setInterval(() => void pingBroadcast(stage.id), 30_000);
    return () => window.clearInterval(timer);
  }, [stage?.id]);
  const { requests, remove: removeRequest } = useOnlooker();
  const myRequests = requests.filter((r) => r.requester === "you" && (r.status === "open" || r.status === "claimed"));

  const load = useCallback(() => {
    if (!user) {
      setPosts([]);
      return;
    }
    void listMyCommunityPosts()
      .then(async (rows) => {
        setPosts(rows);
        const urls = await communityMediaUrls(rows).catch(() => ({}));
        setMedia(urls);
      })
      .catch(() => setPosts([]));
  }, [user?.id]);

  useEffect(load, [load]);

  async function remove(post: CommunityPost) {
    if (!window.confirm(`Remove “${post.title}”? This cannot be undone.`)) return;
    setBusy(post.id);
    try {
      await deleteCommunityPost(post.id);
      setPosts((prev) => (prev ?? []).filter((p) => p.id !== post.id));
      setSelected(null);
      toast.success("Post removed.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete that post.");
    } finally {
      setBusy(null);
    }
  }

  async function cancelRequest(r: LiveRequest) {
    if (!r.dbId) return;
    if (!window.confirm(`Cancel “${r.title}” and refund ${Math.round(r.bounty)} Credits to your wallet?`)) return;
    setBusy(r.id);
    try {
      await refundBounty(r.dbId);
      removeRequest(r.id);
      setSelectedReq(null);
      toast.success("Request cancelled. Credits are back in your wallet.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not cancel that request.");
    } finally {
      setBusy(null);
    }
  }

  if (!user) return null;
  if (stage) {
    return (
      <LiveBroadcastStage
        title={stage.title}
        place={stage.place}
        save={`broadcast-${Date.now()}`}
        onEnd={() => {
          setStage(null);
          load();
        }}
      />
    );
  }
  const total = (posts?.length ?? 0) + myRequests.length;

  return (
    <section className="mt-8">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-lg text-foreground">My posts</h2>
        {total > 0 && <span className="text-xs text-muted-foreground">{total} total</span>}
      </div>

      {posts === null ? (
        <p className="mt-3 rounded-2xl border border-border bg-surface p-6 text-center text-sm text-muted-foreground">
          Loading your posts…
        </p>
      ) : total === 0 ? (
        <div className="mt-3 rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          You haven&apos;t posted to Discover yet.
          <Link to="/community" className="mt-2 block font-semibold text-signal hover:underline">
            Pick a vibe and post something
          </Link>
        </div>
      ) : (
        <ul className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {myRequests.map((r) => {
            const st = requestStatus(r);
            return (
              <li key={r.id}>
                <button type="button" onClick={() => setSelectedReq(r)} className={rowClass}>
                  <div className="min-w-0 flex-1">
                    <p className="text-[0.62rem] font-extrabold uppercase tracking-[0.1em] text-signal">Bounty request</p>
                    <p className="mt-0.5 line-clamp-2 text-sm font-semibold text-foreground">{r.title}</p>
                    <p className="mt-1 truncate text-xs text-muted-foreground">
                      {leftLabel((r.expiresAt ?? 0) - Date.now())} · {Math.round(r.bounty)} Credits held
                    </p>
                    <span className={`mt-1.5 inline-block rounded-md px-1.5 py-0.5 text-[0.55rem] font-extrabold uppercase ${st.tone}`}>{st.label}</span>
                  </div>
                  <ChevronRight className="size-5 shrink-0 text-muted-foreground" aria-hidden />
                </button>
              </li>
            );
          })}
          {posts.map((post) => {
            const vibe = BROADCAST_CATEGORIES.find((c) => post.tags.some((t) => t.toLowerCase() === c.id));
            const img =
              (post.mediaPath && media[post.mediaPath]) ||
              (vibe && STARTER_VIBE_PHOTOS[vibe.id]?.[0]?.src) ||
              COMMUNITY_VISUALS[post.category]?.image;
            const st = postStatus(post);
            return (
              <li key={post.id}>
                <button type="button" onClick={() => setSelected(post)} className={rowClass}>
                  <span className="relative size-16 shrink-0 overflow-hidden rounded-xl bg-surface-raised">
                    {img ? (
                      <img src={img} alt="" className="size-full object-cover" loading="lazy" />
                    ) : (
                      <ImageOff className="absolute inset-0 m-auto size-5 text-muted-foreground" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[0.62rem] font-extrabold uppercase tracking-[0.1em] text-signal">
                      {vibe ? `${vibe.icon} ${vibe.label}` : "Discover"}
                    </p>
                    <p className="mt-0.5 line-clamp-2 text-sm font-semibold text-foreground">{post.title}</p>
                    <p className="mt-1 flex items-center gap-1 truncate text-xs text-muted-foreground">
                      <MapPin className="size-3 shrink-0" aria-hidden />
                      <span className="truncate">{post.place || "No location"} · {ago(post.createdAt)}</span>
                    </p>
                    <span className={`mt-1.5 inline-block rounded-md px-1.5 py-0.5 text-[0.55rem] font-extrabold uppercase ${st.tone}`}>{st.label}</span>
                  </div>
                  <ChevronRight className="size-5 shrink-0 text-muted-foreground" aria-hidden />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <Dialog open={selected !== null} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="border-border bg-surface sm:max-w-md">
          {selected && (() => {
            const st = postStatus(selected);
            const live = isActivelyStreaming(selected);
            return (
              <>
                <DialogTitle className="break-words font-display text-xl text-foreground">{selected.title}</DialogTitle>
                <DialogDescription className="break-words">{selected.place || "No location"}</DialogDescription>
                <dl className="mt-2 grid grid-cols-2 gap-2 text-sm">
                  <div className="rounded-xl border border-border p-3"><dt className="text-xs text-muted-foreground">Status</dt><dd className="font-semibold text-foreground">{st.label}</dd></div>
                  <div className="rounded-xl border border-border p-3"><dt className="text-xs text-muted-foreground">Time remaining</dt><dd className="font-semibold text-foreground">{selected.expiresAt ? leftLabel(new Date(selected.expiresAt).getTime() - Date.now()) : "No expiry"}</dd></div>
                  <div className="col-span-2 rounded-xl border border-border p-3"><dt className="text-xs text-muted-foreground">Credits in escrow</dt><dd className="font-semibold text-foreground">0, {isBroadcastPost(selected) ? "free broadcasts hold no credits" : "posts hold no credits"}</dd></div>
                </dl>
                {selected.body && <p className="mt-2 whitespace-pre-wrap break-words text-sm text-muted-foreground">{selected.body}</p>}
                <div className="mt-3 grid gap-2">
                  {live && (
                    <Button asChild>
                      <Link to="/live/$id" params={{ id: selected.id }} search={{ title: selected.title, place: selected.place }}>Open live view</Link>
                    </Button>
                  )}
                  {!live && isBroadcastPost(selected) && isPostLive(selected) && !selected.hiddenAt && (
                    <Button
                      size="lg"
                      className="gap-2"
                      onClick={() => {
                        setStage({ id: selected.id, title: selected.title, place: selected.place || "" });
                        setSelected(null);
                      }}
                    >
                      <Radio className="size-4" aria-hidden /> Go live
                    </Button>
                  )}
                  <Button variant="destructive" disabled={busy === selected.id} onClick={() => void remove(selected)}>
                    {isBroadcastPost(selected) && isPostLive(selected) ? "End and remove post" : "Remove post"}
                  </Button>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      <Dialog open={selectedReq !== null} onOpenChange={(o) => !o && setSelectedReq(null)}>
        <DialogContent className="border-border bg-surface sm:max-w-md">
          {selectedReq && (
            <>
              <DialogTitle className="break-words font-display text-xl text-foreground">{selectedReq.title}</DialogTitle>
              <DialogDescription className="break-words">{selectedReq.place}</DialogDescription>
              <dl className="mt-2 grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-xl border border-border p-3"><dt className="text-xs text-muted-foreground">Status</dt><dd className="font-semibold text-foreground">{requestStatus(selectedReq).label}</dd></div>
                <div className="rounded-xl border border-border p-3"><dt className="text-xs text-muted-foreground">Time remaining</dt><dd className="font-semibold text-foreground">{leftLabel((selectedReq.expiresAt ?? 0) - Date.now())}</dd></div>
                <div className="col-span-2 rounded-xl border border-border p-3"><dt className="text-xs text-muted-foreground">Credits in escrow</dt><dd className="font-semibold text-foreground">{Math.round(selectedReq.bounty)} Credits</dd></div>
              </dl>
              <div className="mt-3 grid gap-2">
                <Button asChild variant="secondary">
                  <Link to="/b/$id" params={{ id: selectedReq.dbId ?? selectedReq.id }}>Open request page</Link>
                </Button>
                {selectedReq.status === "open" && selectedReq.dbId && (
                  <Button variant="destructive" disabled={busy === selectedReq.id} onClick={() => void cancelRequest(selectedReq)}>
                    Cancel and refund {Math.round(selectedReq.bounty)} Credits
                  </Button>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
