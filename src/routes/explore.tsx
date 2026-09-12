import { useCallback, useEffect, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Eye, Globe2, Loader2, MapPin, MessageCircle, Play, Star, Sparkle } from "lucide-react";
import { GlobalFeedMap } from "@/components/GlobalFeedMap";
import { toast } from "sonner";

import { useAuth } from "@/hooks/use-auth";
import {
  countClipView,
  fetchClipComments,
  fetchExploreClips,
  postClipComment,
  rateClip,
  type ExploreClip,
  type ExploreComment,
} from "@/lib/explore";

export const Route = createFileRoute("/explore")({
  head: () => ({
    meta: [
      { title: "Explore live views from around the world — Onlooker" },
      {
        name: "description",
        content:
          "Watch real bounty clips captured by Onlookers worldwide and in your neighborhood. Comment, review and see what is happening right now.",
      },
      { property: "og:title", content: "Explore live views from around the world — Onlooker" },
      {
        property: "og:description",
        content: "Real places, captured live by people nearby. Watch, comment and review on Onlooker.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ExplorePage,
});

function ExplorePage() {
  const [clips, setClips] = useState<ExploreClip[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"nearby" | "global">("nearby");

  useEffect(() => {
    void fetchExploreClips()
      .then(setClips)
      .catch(() => setClips([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="mx-auto max-w-lg px-4 pb-28 pt-8">
      <h1 className="font-display text-3xl text-foreground">Explore</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Live views captured by Onlookers around the world and down the street.
      </p>

      <div className="mt-5 grid grid-cols-2 gap-2 rounded-full border border-border bg-surface p-1">
        {([
          { id: "nearby" as const, label: "Recent clips", icon: Sparkle },
          { id: "global" as const, label: "Global Feed", icon: Globe2 },
        ]).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            aria-pressed={tab === id}
            className={`inline-flex items-center justify-center gap-1.5 rounded-full px-3 py-2 text-xs font-extrabold uppercase tracking-[0.1em] transition-colors ${
              tab === id
                ? "bg-signal text-signal-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="size-3.5" /> {label}
          </button>
        ))}
      </div>

      {tab === "global" && <GlobalFeedMap />}

      {tab === "nearby" && loading && (
        <p className="mt-10 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Loading clips…
        </p>
      )}

      {tab === "nearby" && !loading && clips.length === 0 && (
        <p className="mt-10 rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          No public clips yet. Complete a bounty and your capture shows up here.
        </p>
      )}

      <div className="mt-6 space-y-5">
        {tab === "nearby" &&
          clips.map((clip) => (
            <ClipCard key={clip.id} clip={clip} />
          ))}
      </div>
    </main>
  );
}

function ClipCard({ clip }: { clip: ExploreClip }) {
  const { user } = useAuth();
  const [playing, setPlaying] = useState(false);
  const [views, setViews] = useState(clip.views);
  const [comments, setComments] = useState<ExploreComment[] | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [myScore, setMyScore] = useState(0);
  const counted = useRef(false);

  const play = useCallback(() => {
    setPlaying(true);
    if (!counted.current) {
      counted.current = true;
      void countClipView(clip.id).then((n) => n && setViews(n));
    }
  }, [clip.id]);

  async function openComments() {
    if (comments) return setComments(null);
    setComments(await fetchClipComments(clip.id));
  }

  async function send() {
    if (!draft.trim()) return;
    setSending(true);
    try {
      await postClipComment(clip.id, draft);
      setDraft("");
      setComments(await fetchClipComments(clip.id));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not post that comment.");
    } finally {
      setSending(false);
    }
  }

  async function review(score: number) {
    try {
      await rateClip(clip.id, score);
      setMyScore(score);
      toast.success("Thanks for the review.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save that review.");
    }
  }

  return (
    <article className="overflow-hidden rounded-3xl border border-border bg-surface">
      <div className="relative aspect-video bg-surface-raised">
        {playing && clip.videoUrl ? (
          <video src={clip.videoUrl} controls autoPlay playsInline className="size-full object-cover" />
        ) : (
          <button
            type="button"
            onClick={play}
            aria-label={`Play ${clip.title}`}
            className="group size-full"
          >
            {clip.thumbUrl ? (
              <img src={clip.thumbUrl} alt={clip.title} loading="lazy" className="size-full object-cover" />
            ) : null}
            <span className="absolute inset-0 flex items-center justify-center">
              <span className="flex size-14 items-center justify-center rounded-full bg-signal text-signal-foreground transition-transform group-hover:scale-105">
                <Play className="size-6" />
              </span>
            </span>
          </button>
        )}
      </div>

      <div className="space-y-3 p-4">
        <div>
          <h2 className="font-display text-lg leading-tight text-foreground">{clip.title}</h2>
          <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
            <MapPin className="size-3.5" /> {clip.place} · by {clip.uploaderName}
          </p>
        </div>
        {clip.note && <p className="text-sm text-muted-foreground">{clip.note}</p>}

        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Eye className="size-3.5" /> {views}
          </span>
          <button
            type="button"
            onClick={() => void openComments()}
            className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground"
          >
            <MessageCircle className="size-3.5" /> {comments?.length ?? clip.comments}
          </button>
          <span className="inline-flex items-center gap-1.5">
            <Star className="size-3.5" /> {clip.rating > 0 ? clip.rating.toFixed(1) : "–"} ({clip.reviews})
          </span>
        </div>

        {user ? (
          <div className="flex items-center gap-1">
            <span className="mr-2 text-xs uppercase tracking-[0.14em] text-muted-foreground">Rate</span>
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                aria-label={`Rate ${n} out of 5`}
                onClick={() => void review(n)}
                className="text-muted-foreground transition-colors hover:text-signal"
              >
                <Star className={`size-4 ${n <= myScore ? "fill-signal text-signal" : ""}`} />
              </button>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            <Link to="/auth" className="font-semibold text-signal">
              Sign in
            </Link>{" "}
            to comment or review this clip.
          </p>
        )}

        {comments && (
          <div className="space-y-3 border-t border-border/70 pt-3">
            {user && (
              <div className="flex gap-2">
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Add a comment"
                  className="flex-1 rounded-full border border-border bg-surface-raised px-4 py-2 text-sm text-foreground outline-none focus:border-signal"
                />
                <button
                  type="button"
                  disabled={sending}
                  onClick={() => void send()}
                  className="rounded-full bg-signal px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-signal-foreground disabled:opacity-50"
                >
                  Post
                </button>
              </div>
            )}
            {comments.length === 0 && (
              <p className="text-xs text-muted-foreground">No comments yet. Start the conversation.</p>
            )}
            {comments.map((c) => (
              <div key={c.id} className="rounded-2xl bg-surface-raised px-3 py-2">
                <p className="text-xs font-semibold text-foreground">{c.authorName}</p>
                <p className="text-sm text-muted-foreground">{c.body}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}
