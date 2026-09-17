import { createFileRoute, Link } from "@tanstack/react-router";
import { MapPin, Radio, Zap } from "lucide-react";

import { ShareToSocialButton } from "@/components/ShareToSocialButton";

type Search = {
  title?: string | undefined;
  place?: string | undefined;
  credits?: number | undefined;
  lat?: number | undefined;
  lng?: number | undefined;
};

const SITE = "https://onlookerlive.com";
const OG_IMAGE = `${SITE}/og-onlooker.jpg`;

export const Route = createFileRoute("/live/$id")({
  validateSearch: (search: Record<string, unknown>): Search => ({
    title: typeof search["title"] === "string" ? search["title"] : undefined,
    place: typeof search["place"] === "string" ? search["place"] : undefined,
    credits: search["credits"] != null ? Number(search["credits"]) : undefined,
    lat: search["lat"] != null ? Number(search["lat"]) : undefined,
    lng: search["lng"] != null ? Number(search["lng"]) : undefined,
  }),
  head: ({ match, params }) => {
    const { title, place } = match.search as Search;
    const heading = `🔴 Live now${place ? `, ${place}` : ""} · Onlooker`;
    const desc = `${title ?? "A live view is streaming right now"}${
      place ? ` at ${place}` : ""
    }. Watch it live on Onlooker. #Onlooker`;
    const url = `${SITE}/live/${params["id"]}`;
    return {
      meta: [
        { title: heading },
        { name: "description", content: desc },
        { property: "og:title", content: heading },
        { property: "og:description", content: desc },
        { property: "og:type", content: "video.other" },
        { property: "og:url", content: url },
        { property: "og:image", content: OG_IMAGE },
        { property: "og:site_name", content: "Onlooker" },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:image", content: OG_IMAGE },
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BroadcastEvent",
            name: title ?? "Onlooker live view",
            isLiveBroadcast: true,
            location: place ? { "@type": "Place", name: place } : undefined,
            url,
          }),
        },
      ],
    };
  },
  component: LiveSharePage,
});

function LiveSharePage() {
  const { id } = Route.useParams();
  const { title, place, credits, lat, lng } = Route.useSearch();

  return (
    <div className="mx-auto flex min-h-[80vh] w-full max-w-5xl flex-col justify-center px-4 pb-28 pt-6 sm:px-6 lg:px-8">
      <div className="overflow-hidden rounded-3xl border border-border bg-surface">
        <div className="flex items-center gap-3 border-b border-border px-5 py-4">
          <span className="flex size-8 items-center justify-center rounded-lg bg-signal text-signal-foreground">
            <Zap className="size-4" strokeWidth={2.4} />
          </span>
          <span className="font-display text-base tracking-tight text-foreground">Onlooker</span>
          <span className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-red-500/15 px-2.5 py-1 text-[0.6rem] font-bold uppercase tracking-[0.14em] text-red-400">
            <Radio className="size-3" /> live
          </span>
        </div>
        <div className="px-5 py-6">
          <h1 className="font-display text-3xl leading-tight text-foreground">
            {title ?? "Someone is live right now"}
          </h1>
          {place && (
            <p className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
              <MapPin className="size-4 text-signal" /> {place}
            </p>
          )}
          {credits ? (
            <p className="mt-3 font-display text-2xl text-signal">{Math.round(credits)} Credits</p>
          ) : null}
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            Watch the stream on the Onlooker live map, or request your own view from anywhere in the
            world.
          </p>
          <Link
            to="/"
            search={{ b: id }}
            className="mt-6 block rounded-full bg-signal px-5 py-3 text-center text-sm font-semibold uppercase tracking-[0.12em] text-signal-foreground"
          >
            Watch live on Onlooker
          </Link>
          <div className="mt-3">
            <ShareToSocialButton
              subject={{
                kind: "live",
                id,
                title: title ?? "Live on Onlooker",
                place: place ?? "Onlooker live map",
                credits,
                latitude: lat ?? null,
                longitude: lng ?? null,
              }}
              className="w-full"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
