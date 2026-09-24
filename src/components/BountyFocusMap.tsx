// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
/// <reference types="google.maps" />
import { useEffect, useRef, useState } from "react";
import { loadGoogleMaps } from "@/lib/google-maps-loader";
import { SHARED_MAP_OPTIONS } from "@/lib/map-style";

/** A map dedicated to one bounty: centred on its pin at street level. */
export function BountyFocusMap({ lat, lng, label }: { lat: number; lng: number; label: string }) {
  const holder = useRef<HTMLDivElement | null>(null);
  const map = useRef<google.maps.Map | null>(null);
  const marker = useRef<google.maps.Marker | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadGoogleMaps()
      .then((maps) => {
        if (cancelled || !holder.current) return;
        if (!map.current) {
          map.current = new maps.Map(holder.current, {
            ...SHARED_MAP_OPTIONS,
            mapTypeId: "hybrid",
            zoomControl: true,
            center: { lat, lng },
            zoom: 17,
          });
        } else {
          map.current.setCenter({ lat, lng });
        }
        marker.current?.setMap(null);
        marker.current = new maps.Marker({
          map: map.current,
          position: { lat, lng },
          title: label,
          animation: maps.Animation.DROP,
        });
      })
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, [lat, lng, label]);

  return (
    <div className="relative h-72 w-full bg-background sm:h-96">
      <div ref={holder} className="size-full" />
      {failed && (
        <p className="absolute inset-0 grid place-items-center px-6 text-center text-xs text-muted-foreground">
          The map can't load right now. Use "Get directions" below instead.
        </p>
      )}
    </div>
  );
}
