// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import { createFileRoute } from "@tanstack/react-router";
import { MapPin, Zap } from "lucide-react";

import { listEmbedMarkers } from "@/lib/embed.functions";

const SITE = "https://onlookerlive.com";

/** Iframe-friendly board of every active Onlooker LLC feed, for external sites. */
export const Route = createFileRoute("/embed/")({
  loader: () => listEmbedMarkers(),
  head: () => ({
    meta: [
      { title: "Onlooker LLC live map, embed" },
      {
        name: "description",
        content: "Embeddable board of active Onlooker LLC live views around the world.",
      },
      { property: "og:title", content: "Onlooker LLC live map, embed" },
      { property: "og:description", content: "Active Onlooker LLC live views around the world." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: EmbedBoard,
});

function EmbedBoard() {
  const markers = Route.useLoaderData();

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-lg bg-signal text-signal-foreground">
            <Zap className="size-3.5" strokeWidth={2.4} />
          </span>
          <span className="font-display text-sm tracking-tight text-foreground">
            Onlooker LLC live views
          </span>
          <a
            href={SITE}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto text-[0.6rem] font-bold uppercase tracking-[0.14em] text-signal"
          >
            Open the map
          </a>
        </div>

        {markers.length === 0 ? (
          <p className="mt-6 text-sm text-muted-foreground">
            No live views are running right now. Check back shortly.
          </p>
        ) : (
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {markers.map((marker) => (
              <a
                key={marker.id}
                href={`${SITE}/b/${marker.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-2xl border border-border bg-surface p-3 transition-colors hover:border-signal/60"
              >
                <p className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                  <MapPin className="size-4 text-signal" /> {marker.locationName}
                </p>
                <p className="mt-1 text-[0.65rem] uppercase tracking-[0.14em] text-muted-foreground">
                  {marker.category}
                </p>
                <p className="mt-2 font-display text-lg text-signal">{marker.bounty} Credits</p>
              </a>
            ))}
          </div>
        )}
        <p className="mt-4 text-center text-[0.6rem] uppercase tracking-[0.16em] text-muted-foreground">
          Powered by Onlooker LLC · #Onlooker
        </p>
      </div>
    </div>
  );
}
