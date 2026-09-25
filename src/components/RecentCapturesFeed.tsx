// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Clock, Eye, MapPin, MoreVertical, Play, Share2, Trash2, Video } from "lucide-react";
import { toast } from "sonner";
import { LoopingPreview } from "@/components/LoopingPreview";
import { fetchAllExploreClips, fetchExploreClips, type ExploreClip } from "@/lib/explore";
import { deleteExploreClip } from "@/lib/explore.functions";
import { formatCredits } from "@/lib/credits";
import { formatAgoISO } from "@/lib/onlooker";
import { supabase } from "@/integrations/supabase/client";


/**
 * Evergreen archive of finished captures. Live streams end, but the clips stay
 * watchable — so a quiet neighbourhood still has something to scroll.
 */
export function RecentCapturesFeed({
  limit = 6,
  title = "Recent captures",
  blurb = "Streams that already wrapped, still watchable any time.",
  emptyTeaser,
}: {
  /** How many to show; `null` loads the whole archive with no cap. */
  limit?: number | null;
  title?: string;
  blurb?: string;
  /** Shown in place of the wall while there are no captures yet (Home teaser). */
  emptyTeaser?: ReactNode;
}) {
  const [clips, setClips] = useState<ExploreClip[] | null>(null);
  /** Which card the person tapped — that one swaps the loop for the real player. */
  const [playingId, setPlayingId] = useState<string | null>(null);
  /** Signed-in user, so owners see the Delete option on their own captures. */
  const [myId, setMyId] = useState<string | null>(null);
  /** Review staff (admins/moderators) see Delete on every capture. */
  const [isStaff, setIsStaff] = useState(false);
  /** Which card's options menu is open (by clip id). */
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    void supabase.auth.getUser().then(async ({ data }) => {
      setMyId(data.user?.id ?? null);
      if (data.user?.id) {
        const { data: staff } = await supabase.rpc("is_review_staff", {
          _user_id: data.user.id,
        });
        setIsStaff(Boolean(staff));
      }
    });
  }, []);

  // Tap anywhere outside the open menu closes it.
  useEffect(() => {
    if (!menuFor) return;
    const close = (e: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuFor(null);
    };
    window.addEventListener("pointerdown", close);
    return () => window.removeEventListener("pointerdown", close);
  }, [menuFor]);

  const shareClip = async (clip: ExploreClip) => {
    const url = `${window.location.origin}/explore?clip=${clip.id}`;
    const payload = { title: clip.title, text: `Watch "${clip.title}" on Onlooker`, url };
    try {
      if (navigator.share) await navigator.share(payload);
      else {
        await navigator.clipboard.writeText(url);
        toast.success("Link copied.");
      }
    } catch {
      /* share sheet dismissed */
    }
    setMenuFor(null);
  };

  const viewOnMap = (clip: ExploreClip) => {
    setMenuFor(null);
    if (clip.latitude != null && clip.longitude != null) {
      void navigate({ to: "/", search: { at: `${clip.latitude},${clip.longitude}` } });
    } else {
      toast.info("This capture has no location to show.");
    }
  };

  const deleteClip = async (clip: ExploreClip) => {
    setMenuFor(null);
    if (!window.confirm(`Delete "${clip.title}"? This can't be undone.`)) return;
    setDeletingId(clip.id);
    try {
      await deleteExploreClip({ data: { videoId: clip.id } });
      setClips((prev) => (prev ? prev.filter((c) => c.id !== clip.id) : prev));
      toast.success("Capture deleted.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete that capture.");
    } finally {
      setDeletingId(null);
    }
  };

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const rows =
          limit == null ? await fetchAllExploreClips() : await fetchExploreClips(limit);
        if (alive) setClips(rows);
      } catch {
        if (alive) setClips([]);
      }
    };
    void load();
    return () => {
      alive = false;
    };
  }, [limit]);

  if (!clips) return null;

  if (clips.length === 0) {
    if (!emptyTeaser) return null;
    return (
      <section
        className="rounded-2xl border border-border bg-surface p-4"
        aria-label={`${title} — nothing here yet`}
      >
        <div className="flex items-center justify-between gap-3">
          <p className="inline-flex items-center gap-2 font-display text-base font-bold text-foreground">
            <Video className="size-4 text-signal" aria-hidden /> {title}
          </p>
          <Link
            to="/explore"
            className="text-[0.62rem] font-extrabold uppercase tracking-[0.08em] text-muted-foreground"
          >
            See all
          </Link>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">{blurb}</p>
        {emptyTeaser}
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-border bg-surface p-4" aria-label={title}>
      <div className="flex items-center justify-between gap-3">
        <p className="inline-flex items-center gap-2 font-display text-base font-bold text-foreground">
          <Video className="size-4 text-signal" aria-hidden /> {title}
        </p>
        <Link
          to="/explore"
          className="text-[0.62rem] font-extrabold uppercase tracking-[0.08em] text-signal"
        >
          See all
        </Link>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{blurb}</p>

      <ul className="mt-4 grid gap-3 sm:grid-cols-2">
        {clips.map((clip) => {
          const playing = playingId === clip.id && Boolean(clip.videoUrl);
          return (
            <li
              key={clip.id}
              className="overflow-hidden rounded-xl border border-border bg-background/50"
            >
              <div className="relative aspect-video w-full">
                {playing ? (
                  <video
                    src={clip.videoUrl ?? undefined}
                    controls
                    autoPlay
                    playsInline
                    className="size-full bg-black object-contain"
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => setPlayingId(clip.id)}
                    aria-label={`Play ${clip.title}`}
                    className="group block size-full cursor-pointer active:opacity-90"
                  >
                    <LoopingPreview
                      videoUrl={clip.videoUrl}
                      imageUrl={clip.thumbUrl}
                      alt={`Clip from ${clip.title}`}
                    />
                    <span className="pointer-events-none absolute inset-0 grid place-items-center">
                      <span className="grid size-11 place-items-center rounded-full bg-black/55 text-signal ring-1 ring-signal/50 backdrop-blur-sm transition-transform group-hover:scale-105">
                        <Play className="size-5 translate-x-[1px]" aria-hidden />
                      </span>
                    </span>
                  </button>
                )}
              </div>
              <div className="p-3">
                <p className="truncate text-sm font-bold text-foreground">{clip.title}</p>
                <p className="mt-1 flex flex-wrap items-center gap-2 text-[0.62rem] text-muted-foreground">
                  {clip.place && (
                    <span className="inline-flex min-w-0 items-center gap-1">
                      <MapPin className="size-3" aria-hidden />
                      <span className="truncate">{clip.place}</span>
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1 tabular-nums">
                    <Clock className="size-3" aria-hidden /> {formatAgoISO(clip.createdAt)}
                  </span>
                  <span className="inline-flex items-center gap-1 tabular-nums">
                    <Eye className="size-3" aria-hidden /> {clip.views}
                  </span>
                </p>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <p className="text-[0.62rem] font-extrabold uppercase tracking-[0.08em] text-signal tabular-nums">
                    Paid out {formatCredits(clip.bounty)}
                  </p>
                  <div
                    className="relative"
                    ref={menuFor === clip.id ? menuRef : undefined}
                  >
                    <button
                      type="button"
                      onClick={() => setMenuFor((cur) => (cur === clip.id ? null : clip.id))}
                      aria-label={`Options for ${clip.title}`}
                      aria-expanded={menuFor === clip.id}
                      className="grid size-8 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-surface hover:text-foreground"
                    >
                      <MoreVertical className="size-4" aria-hidden />
                    </button>
                    {menuFor === clip.id && (
                      <div
                        role="menu"
                        className="absolute bottom-full right-0 z-20 mb-1 w-40 overflow-hidden rounded-xl border border-border bg-surface shadow-xl"
                      >
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => void shareClip(clip)}
                          className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-xs font-semibold text-foreground transition-colors hover:bg-background"
                        >
                          <Share2 className="size-3.5 text-signal" aria-hidden /> Share
                        </button>
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => viewOnMap(clip)}
                          className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-xs font-semibold text-foreground transition-colors hover:bg-background"
                        >
                          <MapPin className="size-3.5 text-signal" aria-hidden /> View on map
                        </button>
                        {myId && myId === clip.uploaderId && (
                          <button
                            type="button"
                            role="menuitem"
                            disabled={deletingId === clip.id}
                            onClick={() => void deleteClip(clip)}
                            className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-xs font-semibold text-red-400 transition-colors hover:bg-background disabled:opacity-50"
                          >
                            <Trash2 className="size-3.5" aria-hidden />
                            {deletingId === clip.id ? "Deleting…" : "Delete"}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
