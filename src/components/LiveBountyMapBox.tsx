// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
/// <reference types="google.maps" />
import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { MapPin } from "lucide-react";

import { loadGoogleMaps } from "@/lib/google-maps-loader";
import { SHARED_MAP_OPTIONS } from "@/lib/map-style";
import { formatCredits } from "@/lib/credits";

export type LiveBountyPin = {
  id: string;
  title: string;
  credits: number;
  lat: number;
  lng: number;
};

/**
 * Compact live bounty map for pages that only need a glance: every open bounty
 * as a pin, tap one to open it. Replaces the tall stack of archive cards.
 */
export function LiveBountyMapBox({
  pins,
  center,
  label = "Live bounty map",
}: {
  pins: LiveBountyPin[];
  center?: { lat: number; lng: number } | null;
  label?: string;
}) {
  const holder = useRef<HTMLDivElement | null>(null);
  const map = useRef<google.maps.Map | null>(null);
  const markers = useRef<google.maps.Marker[]>([]);
  const [active, setActive] = useState<LiveBountyPin | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadGoogleMaps()
      .then((maps) => {
        if (cancelled || !holder.current) return;
        map.current = new maps.Map(holder.current, {
          ...SHARED_MAP_OPTIONS,
          mapTypeControl: false,
          center: center ?? { lat: 39.5, lng: -98.35 },
          zoom: center ? 12 : 4,
        });
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
    // Centre is only the starting view; pins re-fit the map below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const instance = map.current;
    if (!instance || typeof google === "undefined") return;
    markers.current.forEach((marker) => marker.setMap(null));
    markers.current = [];
    if (pins.length === 0) return;

    const bounds = new google.maps.LatLngBounds();
    pins.forEach((pin) => {
      const marker = new google.maps.Marker({
        map: instance,
        position: { lat: pin.lat, lng: pin.lng },
        title: `${pin.title} · ${formatCredits(pin.credits)}`,
      });
      marker.addListener("click", () => setActive(pin));
      markers.current.push(marker);
      bounds.extend({ lat: pin.lat, lng: pin.lng });
    });
    if (pins.length === 1) {
      instance.setCenter({ lat: pins[0]!.lat, lng: pins[0]!.lng });
      instance.setZoom(14);
    } else {
      instance.fitBounds(bounds, 40);
    }
  }, [pins]);

  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-surface" aria-label={label}>
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <p className="inline-flex items-center gap-2 font-display text-base font-bold text-foreground">
          <MapPin className="size-4 text-signal" aria-hidden /> {label}
        </p>
        <Link to="/" className="text-[0.62rem] font-extrabold uppercase tracking-[0.08em] text-signal">
          Full map
        </Link>
      </div>
      <div className="relative h-56 w-full bg-background sm:h-64">
        <div ref={holder} className="size-full" />
        {failed && (
          <p className="absolute inset-0 grid place-items-center px-6 text-center text-xs text-muted-foreground">
            The map can't load right now. Open the full map instead.
          </p>
        )}
        {!failed && pins.length === 0 && (
          <p className="pointer-events-none absolute inset-x-0 bottom-0 bg-surface/90 px-4 py-2 text-center text-xs text-muted-foreground">
            No live bounties pinned nearby yet.
          </p>
        )}
      </div>
      {active && (
        <Link
          to="/b/$id"
          params={{ id: active.id }}
          search={{ amt: active.credits, title: active.title }}
          className="flex items-center justify-between gap-3 border-t border-border px-4 py-3"
        >
          <span className="min-w-0 truncate text-sm font-bold text-foreground">{active.title}</span>
          <span className="shrink-0 text-xs font-extrabold tabular-nums text-signal">
            {formatCredits(active.credits)}
          </span>
        </Link>
      )}
    </section>
  );
}
