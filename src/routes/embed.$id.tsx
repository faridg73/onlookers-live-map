// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import { createFileRoute } from "@tanstack/react-router";
import { MapPin, Radio, Zap } from "lucide-react";

type Search = {
  title?: string | undefined;
  place?: string | undefined;
  credits?: number | undefined;
  lat?: number | undefined;
  lng?: number | undefined;
};

const SITE = "https://onlooker.io";

/** Iframe-friendly card an external news site or blog embeds. */
export const Route = createFileRoute("/embed/$id")({
  validateSearch: (search: Record<string, unknown>): Search => ({
    title: typeof search["title"] === "string" ? search["title"] : undefined,
    place: typeof search["place"] === "string" ? search["place"] : undefined,
    credits: search["credits"] != null ? Number(search["credits"]) : undefined,
    lat: search["lat"] != null ? Number(search["lat"]) : undefined,
    lng: search["lng"] != null ? Number(search["lng"]) : undefined,
  }),
  head: ({ match }) => {
    const { place } = match.search as Search;
    const heading = `Onlooker live view${place ? `, ${place}` : ""}`;
    return {
      meta: [
        { title: heading },
        {
          name: "description",
          content: "Embeddable Onlooker live view card for news sites and blogs.",
        },
        { property: "og:title", content: heading },
        { property: "og:description", content: "Embeddable Onlooker live view card." },
        { name: "robots", content: "noindex" },
      ],
    };
  },
  component: EmbedCard,
});

function EmbedCard() {
  const { id } = Route.useParams();
  const { title, place, credits, lat, lng } = Route.useSearch();
  const search = new URLSearchParams();
  if (title) search.set("title", title);
  if (place) search.set("place", place);
  if (credits) search.set("credits", String(Math.round(credits)));
  const target = `${SITE}/live/${id}?${search.toString()}`;

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="mx-auto flex h-full max-w-xl flex-col overflow-hidden rounded-2xl border border-signal/30 bg-surface">
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <span className="flex size-7 items-center justify-center rounded-lg bg-signal text-signal-foreground">
            <Zap className="size-3.5" strokeWidth={2.4} />
          </span>
          <span className="font-display text-sm tracking-tight text-foreground">Onlooker</span>
          <span className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-red-500/15 px-2.5 py-1 text-[0.6rem] font-bold uppercase tracking-[0.14em] text-red-400">
            <Radio className="size-3" /> live
          </span>
        </div>
        <div className="px-4 py-5">
          <h1 className="font-display text-xl leading-tight text-foreground">
            {title ?? "Live view on Onlooker"}
          </h1>
          {place && (
            <p className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
              <MapPin className="size-4 text-signal" /> {place}
            </p>
          )}
          {lat != null && lng != null && (
            <p className="mt-1 text-[0.65rem] uppercase tracking-[0.14em] text-muted-foreground">
              {lat.toFixed(3)}, {lng.toFixed(3)}
            </p>
          )}
          {credits ? (
            <p className="mt-3 font-display text-xl text-signal">{Math.round(credits)} Credits</p>
          ) : null}
          <a
            href={target}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 block rounded-full bg-signal px-4 py-2.5 text-center text-xs font-bold uppercase tracking-[0.12em] text-signal-foreground"
          >
            Watch live on Onlooker
          </a>
          <p className="mt-3 text-center text-[0.6rem] uppercase tracking-[0.16em] text-muted-foreground">
            Powered by Onlooker · #Onlooker
          </p>
        </div>
      </div>
    </div>
  );
}
