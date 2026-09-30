// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
/// <reference types="google.maps" />
import { useEffect, useRef, useState } from "react";

import { loadGoogleMaps } from "@/lib/google-maps-loader";

const FALLBACK = { lat: 34.0522, lng: -118.2437 };

/**
 * Satellite map that fills the empty space at the bottom of a screen.
 * By default it is decorative and never steals taps or scrolls; pass
 * `interactive` to let the visitor zoom and pan it.
 */
export function AuthMapBackdrop({ interactive = false }: { interactive?: boolean }) {
  const holder = useRef<HTMLDivElement | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadGoogleMaps()
      .then((maps) => {
        if (cancelled || !holder.current) return;
        const map = new maps.Map(holder.current, {
          center: FALLBACK,
          zoom: 12,
          mapTypeId: "hybrid",
          clickableIcons: false,
          keyboardShortcuts: false,
          ...(interactive
            ? {
                disableDefaultUI: false,
                zoomControl: true,
                mapTypeControl: false,
                streetViewControl: false,
                fullscreenControl: false,
                gestureHandling: "greedy",
                draggable: true,
                scrollwheel: true,
                disableDoubleClickZoom: false,
              }
            : {
                disableDefaultUI: true,
                gestureHandling: "none",
                draggable: false,
                scrollwheel: false,
                disableDoubleClickZoom: true,
              }),
        });
      })
      .catch(() => setFailed(true));
    return () => {
      cancelled = true;
    };
  }, [interactive]);

  if (failed) return null;

  return (
    <div
      aria-hidden={!interactive}
      className={`relative mt-10 h-80 overflow-hidden rounded-2xl border border-border sm:h-96 ${
        interactive ? "" : "pointer-events-none"
      }`}
    >
      <div ref={holder} className="absolute inset-0" />
      {/* Dim the tiles so the map sits quietly behind the page theme. */}
      {!interactive && <div className="absolute inset-0 bg-background/40" />}
    </div>
  );
}
