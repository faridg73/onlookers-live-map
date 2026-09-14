import { useEffect, useState } from "react";
import { Camera, Sparkles, X, Zap } from "lucide-react";
import { toast } from "sonner";
import { useHumanCheck } from "@/components/HumanCheck";
import { VideoRecorder } from "@/components/VideoRecorder";
import {
  COMMUNITY_CATEGORIES,
  FLASH_HOURS,
  categoryDef,
  createCommunityPost,
  uploadCommunityPhoto,
  type CommunityCategory,
} from "@/lib/community";
import { geocodeAddress } from "@/lib/geocode.functions";
import { verifyHumanCheck } from "@/lib/turnstile.functions";

/** Posts need coordinates or they never land on the map. Try the typed place, then the device. */
async function resolveCoords(place: string): Promise<{ latitude: number; longitude: number } | null> {
  const typed = place.trim();
  if (typed.length >= 3) {
    try {
      const hit = await geocodeAddress({ data: { address: typed } });
      if (hit) return { latitude: hit.latitude, longitude: hit.longitude };
    } catch {
      // fall through to the device position
    }
  }
  if (typeof navigator === "undefined" || !navigator.geolocation) return null;
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
      () => resolve(null),
      { timeout: 8000 },
    );
  });
}

/**
 * Posting to Discover: pick a lane, tap an Ice-Breaker to fill the words in,
 * add a live camera still, and optionally make it a Flash Meetup that expires.
 */
export function NewCommunityPostDialog({
  open,
  onOpenChange,
  onPosted,
  initialCategory,
  initialCamera,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPosted: () => void;
  initialCategory?: CommunityCategory;
  /** Opens the live camera as soon as the sheet appears (Start Live Stream flow). */
  initialCamera?: boolean;
}) {
  const [category, setCategory] = useState<CommunityCategory>(initialCategory ?? "friends");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [place, setPlace] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [flash, setFlash] = useState(false);
  const [hours, setHours] = useState<number>(3);
  const [mediaPath, setMediaPath] = useState<string | null>(null);
  const [camera, setCamera] = useState(false);
  const [busy, setBusy] = useState(false);
  const human = useHumanCheck("community-post");

  const def = categoryDef(category);

  useEffect(() => {
    if (!open) return;
    if (initialCategory) {
      setCategory(initialCategory);
      setTags([]);
    }
    if (initialCamera) setCamera(true);
  }, [open, initialCamera, initialCategory]);

  if (!open) return null;

  const submit = async () => {
    if (title.trim().length < 4) {
      toast.error("Give your post a title people can read at a glance.");
      return;
    }
    if (!human.ready) {
      toast.error("Finish the quick human check before posting.");
      return;
    }
    setBusy(true);
    try {
      const check = await verifyHumanCheck({
        data: { token: human.token ?? "", action: "community-post" },
      });
      if (!check.ok) throw new Error("The human check didn't pass. Please try again.");
      const coords = await resolveCoords(place);
      await createCommunityPost({
        category,
        title,
        body,
        place,
        tags,
        mediaPath,
        isFlash: flash,
        flashHours: hours,
        latitude: coords?.latitude ?? null,
        longitude: coords?.longitude ?? null,
      });
      toast.success(flash ? "Flash Meetup is live — the clock is running." : "Posted to Discover.");
      setTitle("");
      setBody("");
      setPlace("");
      setTags([]);
      setMediaPath(null);
      setFlash(false);
      human.reset();
      onPosted();
      onOpenChange(false);
    } catch (err) {
      human.reset();
      toast.error(err instanceof Error ? err.message : "Couldn't post that.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 p-0 sm:items-center sm:p-6">
      <div className="max-h-[92dvh] w-full max-w-lg overflow-y-auto overscroll-contain rounded-t-3xl border border-border bg-surface p-5 sm:rounded-3xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-extrabold text-foreground">Post to Discover</h2>
          <button type="button" aria-label="Close" onClick={() => onOpenChange(false)}>
            <X className="size-5 text-muted-foreground" />
          </button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {COMMUNITY_CATEGORIES.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => {
                setCategory(c.id);
                setTags([]);
              }}
              className={`rounded-2xl border p-3 text-left text-xs font-bold ${
                category === c.id
                  ? "border-signal bg-signal/10 text-signal"
                  : "border-border text-foreground"
              }`}
            >
              {c.label}
              <span className="mt-1 block text-[0.65rem] font-medium text-muted-foreground">
                {c.blurb}
              </span>
            </button>
          ))}
        </div>

        <p className="mt-5 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-signal">
          <Sparkles className="size-4" /> Ice-Breakers
        </p>
        <div className="mt-2 space-y-2">
          {def.iceBreakers.map((ib) => (
            <button
              key={ib.title}
              type="button"
              onClick={() => {
                setTitle(ib.title);
                setBody(ib.body);
              }}
              className="w-full rounded-xl border border-border bg-surface-raised px-3 py-2 text-left text-xs text-foreground hover:border-signal/60"
            >
              <span className="font-bold">{ib.title}</span>
              <span className="mt-0.5 block text-muted-foreground">{ib.body}</span>
            </button>
          ))}
        </div>

        <label className="mt-5 block text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
          Title
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Sunday morning walk crew"
            className="mt-1 w-full rounded-xl border border-border bg-surface-raised px-3 py-2.5 text-sm font-medium normal-case tracking-normal text-foreground outline-none focus:border-signal"
          />
        </label>

        <label className="mt-3 block text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
          Details
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={3}
            placeholder="Where to meet, what to bring, who it's for."
            className="mt-1 w-full rounded-xl border border-border bg-surface-raised px-3 py-2.5 text-sm font-medium normal-case tracking-normal text-foreground outline-none focus:border-signal"
          />
        </label>

        <label className="mt-3 block text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
          Where
          <input
            value={place}
            onChange={(e) => setPlace(e.target.value)}
            placeholder="Riverside Park, north gate"
            className="mt-1 w-full rounded-xl border border-border bg-surface-raised px-3 py-2.5 text-sm font-medium normal-case tracking-normal text-foreground outline-none focus:border-signal"
          />
        </label>

        <p className="mt-4 text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
          Tags
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {def.tags.map((t) => {
            const on = tags.includes(t);
            return (
              <button
                key={t}
                type="button"
                onClick={() => setTags(on ? tags.filter((x) => x !== t) : [...tags, t])}
                className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                  on
                    ? "border-signal bg-signal text-signal-foreground"
                    : "border-border text-muted-foreground"
                }`}
              >
                {t}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => setCamera(true)}
          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border px-4 py-3 text-xs font-bold uppercase tracking-[0.12em] text-foreground"
        >
          <Camera className="size-4" /> {mediaPath ? "Photo added — retake" : "Launch camera"}
        </button>

        <div className="mt-4 rounded-2xl border border-border bg-surface-raised p-3">
          <button
            type="button"
            onClick={() => setFlash(!flash)}
            className="flex w-full items-center justify-between text-sm font-bold text-foreground"
          >
            <span className="flex items-center gap-2">
              <Zap className={`size-4 ${flash ? "text-signal" : "text-muted-foreground"}`} /> Flash
              Meetup
            </span>
            <span
              className={`rounded-full px-2 py-0.5 text-[0.65rem] font-extrabold uppercase ${
                flash ? "bg-signal text-signal-foreground" : "bg-border text-muted-foreground"
              }`}
            >
              {flash ? "On" : "Off"}
            </span>
          </button>
          <p className="mt-1 text-xs text-muted-foreground">
            Expires on a countdown so only people who can show up soon reply.
          </p>
          {flash && (
            <div className="mt-3 flex gap-2">
              {FLASH_HOURS.map((h) => (
                <button
                  key={h}
                  type="button"
                  onClick={() => setHours(h)}
                  className={`flex-1 rounded-xl border px-2 py-2 text-xs font-bold ${
                    hours === h
                      ? "border-signal bg-signal text-signal-foreground"
                      : "border-border text-muted-foreground"
                  }`}
                >
                  {h}h
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="mt-4">{human.widget}</div>

        <button
          type="button"
          disabled={busy}
          onClick={() => void submit()}
          className="mt-5 w-full rounded-xl bg-signal px-4 py-3.5 text-sm font-extrabold uppercase tracking-[0.12em] text-signal-foreground disabled:opacity-60"
        >
          {busy ? "Posting…" : flash ? "Start the countdown" : "Post it"}
        </button>
      </div>

      {camera && (
        <VideoRecorder
          onClose={() => setCamera(false)}
          onRecorded={() => setCamera(false)}
          onPhoto={(file) => {
            setCamera(false);
            void uploadCommunityPhoto(file)
              .then((path) => {
                setMediaPath(path);
                toast.success("Photo added.");
              })
              .catch((err: unknown) =>
                toast.error(err instanceof Error ? err.message : "Couldn't add that photo."),
              );
          }}
        />
      )}
    </div>
  );
}
