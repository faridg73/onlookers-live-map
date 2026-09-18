/// <reference types="google.maps" />
import { useEffect, useMemo, useRef, useState } from "react";
import { CoinsIcon, Eye, Globe2, Loader2, MapPin, Play } from "lucide-react";
import { toast } from "sonner";
import { HunterBadge } from "@/components/HunterBadge";
import { useAuth } from "@/hooks/use-auth";
import { loadGoogleMaps } from "@/lib/google-maps-loader";
import { SHARED_MAP_OPTIONS } from "@/lib/map-style";
import { listGlobalClips, type GlobalClip } from "@/lib/global-feed.functions";
import { MICRO_TIP, tipHunter } from "@/lib/tips";
import { formatCredits } from "@/lib/credits";
import { REGIONAL_CENTER } from "@/lib/onlooker";

/**
 * Worldwide map of clips that requesters already paid for. Travellers can watch
 * them and send the reporter a small thank-you tip.
 */
export function GlobalFeedMap({
  focus,
  categoryId,
  categoryLabel,
  subcategory,
}: {
  /** Optional spot to centre on, sent from a Discover card. */
  focus?: { lat: number; lng: number; label: string } | null;
  categoryId?: string | null;
  categoryLabel?: string | null;
  subcategory?: string | null;
}) {
  const [clips, setClips] = useState<GlobalClip[] | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  // Flips once the map object exists, so a focus that arrived earlier still lands.
  const [mapReady, setMapReady] = useState(false);
  const holder = useRef<HTMLDivElement | null>(null);
  const map = useRef<google.maps.Map | null>(null);
  const markers = useRef<google.maps.Marker[]>([]);

  useEffect(() => {
    void listGlobalClips({ data: { limit: 30 } })
      .then(setClips)
      .catch(() => setClips([]));
  }, []);

  useEffect(() => {
    let cancelled = false;
    loadGoogleMaps()
      .then((maps) => {
        if (cancelled || !holder.current) return;
        map.current = new maps.Map(holder.current, {
          ...SHARED_MAP_OPTIONS,
          center: REGIONAL_CENTER,
          zoom: 2,
        });
        setMapReady(true);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredClips = useMemo(() => {
    const categoryNeedle = categoryLabel?.toLowerCase().trim();
    const categoryIdNeedle = categoryId?.toLowerCase().trim();
    const vibeNeedle = subcategory?.toLowerCase().trim();
    return (clips ?? []).filter((clip) => {
      const haystack = `${clip.title} ${clip.note} ${clip.place}`.toLowerCase();
      const categoryMatches = !categoryNeedle || haystack.includes(categoryNeedle) || Boolean(categoryIdNeedle && haystack.includes(categoryIdNeedle));
      return categoryMatches && (!vibeNeedle || haystack.includes(vibeNeedle));
    });
  }, [clips, categoryId, categoryLabel, subcategory]);
  const pinned = useMemo(
    () => filteredClips.filter((c) => c.latitude !== null && c.longitude !== null),
    [filteredClips],
  );

  // A Discover card asked us to show its exact spot: centre there and mark it.
  const focusMarker = useRef<google.maps.Marker | null>(null);
  useEffect(() => {
    if (!focus || !map.current) return;
    map.current.setCenter({ lat: focus.lat, lng: focus.lng });
    map.current.setZoom(15);
    focusMarker.current?.setMap(null);
    focusMarker.current = new google.maps.Marker({
      map: map.current,
      position: { lat: focus.lat, lng: focus.lng },
      title: focus.label,
      animation: google.maps.Animation.DROP,
    });
    return () => {
      focusMarker.current?.setMap(null);
      focusMarker.current = null;
    };
  }, [focus, mapReady]);

  // Draw one marker per located clip.
  useEffect(() => {
    if (!map.current || pinned.length === 0) return;
    markers.current.forEach((m) => m.setMap(null));
    markers.current = pinned.map((clip) => {
      const marker = new google.maps.Marker({
        map: map.current,
        position: { lat: clip.latitude!, lng: clip.longitude! },
        title: clip.title,
      });
      marker.addListener("click", () => setActiveId(clip.id));
      return marker;
    });
    if (!focus) {
      const bounds = new google.maps.LatLngBounds();
      pinned.forEach((c) => bounds.extend({ lat: c.latitude!, lng: c.longitude! }));
      map.current.fitBounds(bounds, 48);
    }
    return () => {
      markers.current.forEach((m) => m.setMap(null));
      markers.current = [];
    };
  }, [pinned, mapReady, focus]);

  const active = filteredClips.find((c) => c.id === activeId) ?? null;

  return (
    <div className="mt-6">
      <div className="relative h-64 overflow-hidden rounded-3xl border border-border bg-surface-raised">
        <div ref={holder} className="absolute inset-0" style={{ touchAction: "none" }} />
        <span className="pointer-events-none absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-surface/90 px-3 py-1 text-[0.62rem] font-extrabold uppercase tracking-[0.12em] text-foreground backdrop-blur">
          <Globe2 className="size-3 text-signal" /> {pinned.length} unlocked clips worldwide
        </span>
      </div>

      {clips === null && (
        <p className="mt-6 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Loading the global feed…
        </p>
      )}

      {active && <GlobalClipBubble clip={active} />}

      <div className="mt-5 space-y-4">
        {filteredClips.map((clip) => (
          <GlobalClipBubble key={clip.id} clip={clip} compact={clip.id !== activeId} />
        ))}
        {clips !== null && filteredClips.length === 0 && (
          <p className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            {categoryLabel
              ? `No unlocked ${subcategory ? `${subcategory} ` : ""}${categoryLabel} clips are on the map yet.`
              : "No unlocked clips yet. Once requesters approve footage it shows up here."}
          </p>
        )}
      </div>
    </div>
  );
}

function GlobalClipBubble({ clip, compact = false }: { clip: GlobalClip; compact?: boolean }) {
  const { user } = useAuth();
  const [playing, setPlaying] = useState(!compact);
  const [tips, setTips] = useState(clip.tipTotal);
  const [tipping, setTipping] = useState(false);

  async function tip() {
    if (!user) {
      toast.error("Sign in to tip this reporter.");
      return;
    }
    setTipping(true);
    try {
      const amount = await tipHunter(clip.id);
      setTips((t) => t + amount);
      toast.success(`You tipped ${Math.round(amount)} Credits. Nice one.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "That tip did not go through.");
    } finally {
      setTipping(false);
    }
  }

  return (
    <article className="overflow-hidden rounded-3xl border border-border bg-surface">
      <div className="relative aspect-video bg-surface-raised">
        {playing && clip.videoUrl ? (
          <video src={clip.videoUrl} controls playsInline className="size-full object-cover" />
        ) : (
          <button
            type="button"
            onClick={() => setPlaying(true)}
            aria-label={`Play ${clip.title}`}
            className="group size-full"
          >
            {clip.thumbUrl && (
              <img src={clip.thumbUrl} alt={clip.title} loading="lazy" className="size-full object-cover" />
            )}
            <span className="absolute inset-0 flex items-center justify-center">
              <span className="flex size-14 items-center justify-center rounded-full bg-signal text-signal-foreground transition-transform group-hover:scale-105">
                <Play className="size-6" />
              </span>
            </span>
          </button>
        )}
      </div>

      <div className="space-y-3 p-4">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
          <div className="min-w-0">
            <h3 className="font-display text-lg leading-tight text-foreground">{clip.title}</h3>
            <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
              <MapPin className="size-3.5" /> {clip.place} · by {clip.uploaderName}
            </p>
          </div>
          <HunterBadge level={clip.hunterLevel} showLevel={false} />
        </div>

        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <Eye className="size-3.5" /> {clip.views}
            {tips > 0 && (
              <span className="ml-2 font-bold text-signal">{formatCredits(tips)} tipped</span>
            )}
          </span>
          <button
            type="button"
            disabled={tipping}
            onClick={() => void tip()}
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-signal px-3 py-2 text-xs font-extrabold uppercase tracking-[0.1em] text-signal-foreground disabled:opacity-50 sm:w-auto"
          >
            {tipping ? <Loader2 className="size-3.5 animate-spin" /> : <CoinsIcon className="size-3.5" />}
            Micro-Tip Hunter {MICRO_TIP} Credits
          </button>
        </div>
      </div>
    </article>
  );
}
