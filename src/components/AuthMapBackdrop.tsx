// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
/// <reference types="google.maps" />
import { useEffect, useRef, useState } from "react";

import { loadGoogleMaps } from "@/lib/google-maps-loader";

const FALLBACK = { lat: 34.0522, lng: -118.2437 };

/**
 * Decorative, non-interactive satellite map that fills the empty space at the
 * bottom of the sign-in screen. It never steals taps or scrolls.
 */
export function AuthMapBackdrop() {
  const holder = useRef<HTMLDivElement | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadGoogleMaps()
      .then((maps) => {
        if (cancelled || !holder.current) return;
        new maps.Map(holder.current, {
          center: FALLBACK,
          zoom: 12,
          mapTypeId: "hybrid",
          disableDefaultUI: true,
          clickableIcons: false,
          gestureHandling: "none",
          keyboardShortcuts: false,
          draggable: false,
          scrollwheel: false,
          disableDoubleClickZoom: true,
        });
      })
      .catch(() => setFailed(true));
    return () => {
      cancelled = true;
    };
  }, []);

  if (failed) return null;

  return (
    <div
      aria-hidden
      className="pointer-events-none relative mt-10 h-56 overflow-hidden rounded-2xl border border-border"
    >
      <div ref={holder} className="absolute inset-0" />
      {/* Dim the tiles so the map sits quietly behind the page theme. */}
      <div className="absolute inset-0 bg-background/40" />
    </div>
  );
}
