// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
/// <reference types="google.maps" />
import { useEffect, useMemo, useRef, useState } from "react";
import { BadgeCheck, Clock, CoinsIcon, Eye, Globe2, Loader2, MapPin, Play, Siren, X } from "lucide-react";
import { toast } from "sonner";
import { HunterBadge } from "@/components/HunterBadge";
import { useAuth } from "@/hooks/use-auth";
import { loadGoogleMaps } from "@/lib/google-maps-loader";
import { SHARED_MAP_OPTIONS } from "@/lib/map-style";
import { listGlobalClips, type GlobalClip } from "@/lib/global-feed.functions";
import { MICRO_TIP, tipHunter } from "@/lib/tips";
import { formatCredits } from "@/lib/credits";
import { formatAgoISO, REGIONAL_CENTER } from "@/lib/onlooker";
import { STRANGE_SIGHTINGS_ID, matchesStrangeSighting } from "@/lib/strange-sightings";
import type { CommunityPost } from "@/lib/community";
import { incidentById } from "@/lib/trust-tiers";
import { readMapViewport, writeSessionState } from "@/lib/session-state";

/**
 * Worldwide map of clips that requesters already paid for. Travellers can watch
 * them and send the reporter a small thank-you tip.
 */
export function GlobalFeedMap({
  focus,
  categoryId,
  categoryLabel,
  subcategory,
  reports = [],
  viewportStorageKey,
  emergencyOnly = false,
}: {
  /** Optional spot to centre on, sent from a Discover card. */
  focus?: { lat: number; lng: number; label: string } | null;
  categoryId?: string | null;
  categoryLabel?: string | null;
  subcategory?: string | null;
  reports?: CommunityPost[];
  viewportStorageKey?: string;
  /** Emergency Alert Map mode: only Level 3 emergency lanes (fire/police/medical), no clips. */
  emergencyOnly?: boolean;
}) {
  const [clips, setClips] = useState<GlobalClip[] | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeReportId, setActiveReportId] = useState<string | null>(null);
  // Flips once the map object exists, so a focus that arrived earlier still lands.
  const [mapReady, setMapReady] = useState(false);
  const holder = useRef<HTMLDivElement | null>(null);
  const map = useRef<google.maps.Map | null>(null);
  const markers = useRef<google.maps.Marker[]>([]);
  const reportMarkers = useRef<google.maps.Marker[]>([]);
  const restoredViewport = useRef(false);

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
        const savedViewport = readMapViewport(viewportStorageKey);
        restoredViewport.current = Boolean(savedViewport);
        map.current = new maps.Map(holder.current, {
          ...SHARED_MAP_OPTIONS,
          center: savedViewport ? { lat: savedViewport.lat, lng: savedViewport.lng } : REGIONAL_CENTER,
          zoom: savedViewport?.zoom ?? 2,
        });
        map.current.addListener("idle", () => {
          const center = map.current?.getCenter();
          const zoom = map.current?.getZoom();
          if (!viewportStorageKey || !center || typeof zoom !== "number") return;
          writeSessionState(viewportStorageKey, { lat: center.lat(), lng: center.lng(), zoom });
        });
        setMapReady(true);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [viewportStorageKey]);

  const filteredClips = useMemo(() => {
    if (emergencyOnly) return [];
    const categoryNeedle = categoryLabel?.toLowerCase().trim();
    const categoryIdNeedle = categoryId?.toLowerCase().trim();
    const vibeNeedle = subcategory?.toLowerCase().trim();
    return (clips ?? []).filter((clip) => {
      const haystack = `${clip.title} ${clip.note} ${clip.place}`.toLowerCase();
      const categoryMatches = categoryIdNeedle === STRANGE_SIGHTINGS_ID
        ? matchesStrangeSighting(haystack)
        : !categoryNeedle || haystack.includes(categoryNeedle) || Boolean(categoryIdNeedle && haystack.includes(categoryIdNeedle));
      return categoryMatches && (!vibeNeedle || haystack.includes(vibeNeedle));
    });
  }, [clips, categoryId, categoryLabel, subcategory, emergencyOnly]);
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

  // Every located report, whatever its community-verification status. The
  // emergency view keeps only Level 3 lanes (fire, police, medical). Outside the
  // emergency view a chosen lane or hashtag also pins the matching posts, so a
  // hashtag map shows exactly the stories behind that tag.
  const pinnedReports = useMemo(() => {
    const located = reports.filter((post) => post.latitude !== null && post.longitude !== null);
    if (emergencyOnly) {
      return located.filter(
        (post) =>
          post.reportIncidentType && incidentById(post.reportIncidentType)?.emergency === true,
      );
    }
    const vibeNeedle = subcategory?.toLowerCase().trim();
    const categoryNeedle = categoryLabel?.toLowerCase().trim();
    const categoryIdNeedle = categoryId?.toLowerCase().trim();
    if (!vibeNeedle && !categoryNeedle && !categoryIdNeedle) {
      return located.filter((post) => post.reportIncidentType);
    }
    return located.filter((post) => {
      const haystack = `${post.title} ${post.body} ${post.place} ${post.tags.join(" ")}`.toLowerCase();
      if (categoryIdNeedle === STRANGE_SIGHTINGS_ID) return matchesStrangeSighting(haystack);
      const laneMatches =
        (!categoryNeedle && !categoryIdNeedle) ||
        haystack.includes(categoryNeedle ?? "") ||
        Boolean(categoryIdNeedle && haystack.includes(categoryIdNeedle));
      return laneMatches && (!vibeNeedle || haystack.includes(vibeNeedle));
    });
  }, [reports, emergencyOnly, subcategory, categoryLabel, categoryId]);

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
    return () => {
      markers.current.forEach((m) => m.setMap(null));
      markers.current = [];
    };
  }, [pinned, mapReady]);

  // Frame clips and reports together, so a fresh report is never left off-screen.
  useEffect(() => {
    if (!map.current || focus || restoredViewport.current) return;
    const spots = [
      ...pinned.map((c) => ({ lat: c.latitude!, lng: c.longitude! })),
      ...pinnedReports.map((p) => ({ lat: p.latitude!, lng: p.longitude! })),
    ];
    if (spots.length === 0) return;
    if (spots.length === 1) {
      map.current.setCenter(spots[0]!);
      map.current.setZoom(14);
      return;
    }
    const bounds = new google.maps.LatLngBounds();
    spots.forEach((spot) => bounds.extend(spot));
    map.current.fitBounds(bounds, 48);
  }, [pinned, pinnedReports, mapReady, focus]);

  useEffect(() => {
    if (!map.current) return;
    reportMarkers.current.forEach((marker) => marker.setMap(null));
    reportMarkers.current = pinnedReports.map((post) => {
      const status = post.reportStatus ?? "unverified";
      const styles = getComputedStyle(document.documentElement);
      const color = emergencyOnly
        ? styles.getPropertyValue("--crisis").trim()
        : status === "confirmed"
          ? styles.getPropertyValue("--signal").trim()
          : status === "disputed"
            ? styles.getPropertyValue("--crisis").trim()
            : styles.getPropertyValue("--muted-foreground").trim();
      const strokeColor = styles.getPropertyValue("--background").trim();
      const marker = new google.maps.Marker({
        map: map.current,
        position: { lat: post.latitude!, lng: post.longitude! },
        title: `${post.title} · ${status}`,
        zIndex: 999,
        icon: { path: google.maps.SymbolPath.CIRCLE, fillColor: color, fillOpacity: 1, strokeColor, strokeWeight: 2, scale: 8 },
      });
      marker.addListener("click", () => setActiveReportId((current) => (current === post.id ? null : post.id)));
      return marker;
    });
    return () => {
      reportMarkers.current.forEach((marker) => marker.setMap(null));
      reportMarkers.current = [];
    };
  }, [pinnedReports, mapReady, emergencyOnly]);

  const active = filteredClips.find((c) => c.id === activeId) ?? null;
  const activeReport = pinnedReports.find((p) => p.id === activeReportId) ?? null;

  return (
    <div className="mt-6">
      <div className="relative h-64 overflow-hidden rounded-3xl border border-border bg-surface-raised">
        <div ref={holder} className="absolute inset-0" style={{ touchAction: "none" }} />
        <span className="pointer-events-none absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-surface/90 px-3 py-1 text-[0.62rem] font-extrabold uppercase tracking-[0.12em] text-foreground backdrop-blur">
          {emergencyOnly ? (
            <>
              <Siren className="size-3 text-crisis" /> {pinnedReports.length} active emergency {pinnedReports.length === 1 ? "alert" : "alerts"}
            </>
          ) : (
            <>
              <Globe2 className="size-3 text-signal" /> {pinned.length} clips
              {subcategory
                ? ` · ${pinnedReports.length} #${subcategory} ${pinnedReports.length === 1 ? "post" : "posts"}`
                : " worldwide"}
            </>
          )}
        </span>
        {activeReport && <ReportDetailCard post={activeReport} onClose={() => setActiveReportId(null)} />}
      </div>

      {emergencyOnly ? (
        pinnedReports.length === 0 && (
          <p className="mt-5 rounded-2xl border border-dashed border-border bg-surface p-8 text-center text-sm text-muted-foreground">
            All clear right now — trusted alerts will appear here the moment something happens. Verified Level 3 creators can file fire, police and medical reports.
          </p>
        )
      ) : (
        <>
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
        </>
      )}
    </div>
  );
}

function formatAlertTime(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return { relative: formatAgoISO(iso), absolute: date.toLocaleString() };
}

const STATUS_LABEL: Record<string, string> = {
  confirmed: "Confirmed",
  disputed: "Disputed",
  unverified: "Unverified",
  expired: "Expired",
};

/** Popup shown when a red report pin is tapped: category, details, time, creator. */
function ReportDetailCard({ post, onClose }: { post: CommunityPost; onClose: () => void }) {
  const incident = post.reportIncidentType ? incidentById(post.reportIncidentType) : undefined;
  const time = formatAlertTime(post.createdAt);
  const isEmergency = incident?.emergency === true;

  return (
    <div className="absolute inset-x-2 bottom-2 z-10 max-h-[85%] overflow-y-auto rounded-2xl border border-border bg-surface/95 p-3 shadow-lg backdrop-blur">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
        <div className="min-w-0">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[0.6rem] font-extrabold uppercase tracking-[0.12em] ${
              isEmergency ? "bg-crisis text-crisis-foreground" : "bg-surface-raised text-foreground"
            }`}
          >
            {isEmergency && <Siren className="size-3" />}
            {incident?.label ?? "Community report"}
          </span>
          <h3 className="mt-1.5 truncate font-display text-sm leading-tight text-foreground">{post.title}</h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close report details"
          className="grid size-11 shrink-0 place-items-center rounded-full border border-border bg-secondary/80 text-foreground shadow-sm transition-colors hover:bg-secondary"
        >
          <X className="size-4" />
        </button>
      </div>

      {post.body && <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-muted-foreground">{post.body}</p>}

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.68rem] text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <BadgeCheck className="size-3.5 text-signal" />
          {post.authorName}
          {post.authorVerified && <span className="font-bold text-signal"> · verified</span>}
          <span className="text-muted-foreground/70"> · Trust Lv {post.reporterTrustLevel ?? 1}</span>
        </span>
        {time && (
          <span className="inline-flex items-center gap-1" title={time.absolute}>
            <Clock className="size-3" /> {time.relative}
          </span>
        )}
        <span
          className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[0.6rem] font-extrabold uppercase tracking-[0.1em] ${
            post.reportStatus === "confirmed"
              ? "bg-signal/15 text-signal"
              : post.reportStatus === "disputed"
                ? "bg-crisis/15 text-crisis"
                : "bg-surface-raised text-muted-foreground"
          }`}
        >
          {STATUS_LABEL[post.reportStatus ?? "unverified"]}
        </span>
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
