// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import { createFileRoute, Link, useCanGoBack, useRouter } from "@tanstack/react-router";
import { ArrowLeft, Clock, MapPin, Navigation, Zap } from "lucide-react";

import { BountyBidsPanel } from "@/components/BountyBidsPanel";
import { BountyBriefBadges } from "@/components/BountyBriefBadges";
import { BountyFocusMap } from "@/components/BountyFocusMap";
import { CategoryBadge } from "@/components/CategoryBadge";
import { formatCreditCash } from "@/lib/credits";
import { requestMapPosition } from "@/lib/onlooker";
import { useOnlooker } from "@/lib/onlooker-store";

type Search = {
  amt?: number | undefined;
  place?: string | undefined;
  title?: string | undefined;
};

export const Route = createFileRoute("/b/$id")({
  validateSearch: (search: Record<string, unknown>): Search => ({
    amt: search["amt"] != null ? Number(search["amt"]) : undefined,
    place: typeof search["place"] === "string" ? search["place"] : undefined,
    title: typeof search["title"] === "string" ? search["title"] : undefined,
  }),
  head: ({ match }) => {
    const { amt, place, title } = match.search as Search;
    const heading = amt
      ? `${Math.round(amt).toLocaleString()} Credits bounty${place ? `, ${place}` : ""} · Onlooker`
      : "Live view bounty · Onlooker";
    const desc = title
      ? `${title}${place ? ` at ${place}` : ""}. Capture a live photo or clip and claim the bounty.`
      : "Open this bounty on the Onlooker map and claim it with a live photo or clip.";
    const url = `https://onlookerlive.com/b/${match.params.id}`;
    const image = "https://onlookerlive.com/og-onlooker.jpg";
    return {
      meta: [
        { title: heading },
        { name: "description", content: desc },
        { property: "og:title", content: heading },
        { property: "og:description", content: desc },
        { property: "og:type", content: "website" },
        { property: "og:url", content: url },
        { property: "og:image", content: image },
        { property: "og:site_name", content: "Onlooker" },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:image", content: image },
      ],
      links: [{ rel: "canonical", href: url }],
    };
  },
  component: BountyPreview,
});

function BountyPreview() {
  const { id } = Route.useParams();
  const search = Route.useSearch();
  const router = useRouter();
  const canGoBack = useCanGoBack();
  const { requests, signedIn } = useOnlooker();
  const request = requests.find((r) => r.id === id || r.dbId === id || `db-${r.dbId}` === id) ?? null;
  const credits = Math.max(0, Math.round(request?.bounty ?? search.amt ?? 0));
  const title = request?.title ?? search.title;
  const place = request?.place ?? search.place;
  const pos = request ? requestMapPosition(request) : null;
  const isPoster = request?.requester === "you";
  const minutesLeft = request?.expiresAt ? Math.max(0, Math.round((request.expiresAt - Date.now()) / 60_000)) : null;
  const directions = pos ? `https://www.google.com/maps/dir/?api=1&destination=${pos.lat},${pos.lng}` : null;

  const mapBlock = (
    <div className="overflow-hidden rounded-3xl border border-border bg-surface">
      <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-3">
        <p className="inline-flex items-center gap-2 font-display text-base font-bold text-foreground">
          <MapPin className="size-4 text-signal" aria-hidden /> Where this bounty is
        </p>
        {directions && (
          <a href={directions} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-extrabold uppercase tracking-[0.08em] text-signal">
            <Navigation className="size-3.5" /> Get directions
          </a>
        )}
      </div>
      {pos ? (
        <BountyFocusMap lat={pos.lat} lng={pos.lng} label={title ?? "Bounty"} />
      ) : (
        <p className="px-5 py-10 text-center text-sm text-muted-foreground">
          {signedIn === false ? "Sign in to see exactly where this bounty is pinned." : "Loading the bounty's pin…"}
        </p>
      )}
      {place && <p className="border-t border-border px-5 py-3 text-sm text-foreground">{place}</p>}
    </div>
  );

  const detailsBlock = (
    <div className="overflow-hidden rounded-3xl border border-border bg-surface">
      <div className="flex items-center gap-3 border-b border-border px-5 py-4">
        <span className="flex size-8 items-center justify-center rounded-lg bg-signal text-signal-foreground">
          <Zap className="size-4" strokeWidth={2.4} />
        </span>
        <span className="font-display text-base tracking-tight text-foreground">
          {isPoster ? "Your bounty" : "Bounty details"}
        </span>
        {request && <CategoryBadge category={request.category} compact className="ml-auto" />}
      </div>
      <div className="px-5 py-6">
        <div className="font-display text-5xl leading-none tabular-nums text-signal">{credits.toLocaleString()}</div>
        <div className="mt-2 text-[0.65rem] uppercase tracking-[0.18em] text-signal/70">
          credits payout {credits > 0 && `(${formatCreditCash(credits)})`}
        </div>
        <h1 className="mt-4 font-display text-2xl leading-tight text-foreground">{title ?? "Someone wants a live view"}</h1>
        {request && <BountyBriefBadges request={request} />}
        {request && (
          <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
            <span className="rounded-full border border-border px-2.5 py-1 font-bold uppercase tracking-[0.1em]">
              {request.status === "open" ? "Open" : request.status}
            </span>
            {minutesLeft !== null && request.status === "open" && (
              <span className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1">
                <Clock className="size-3" /> {minutesLeft >= 60 ? `${Math.floor(minutesLeft / 60)}h ${minutesLeft % 60}m` : `${minutesLeft} min`} left
              </span>
            )}
          </div>
        )}
        {request?.instructions && (
          <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-foreground">{request.instructions}</p>
        )}
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
          {isPoster
            ? "Onlookers nearby can see this on the map. You'll be notified when someone claims it and when footage arrives."
            : "Head to the pin, claim the bounty, send back a live photo or clip, and take the payout."}
        </p>
        <Link
          to="/discover"
          search={{ view: "map", b: id, ...(pos ? { lat: pos.lat, lng: pos.lng, label: title ?? "Bounty" } : {}) }}
          className="mt-6 block rounded-full bg-signal px-5 py-3 text-center text-sm font-semibold uppercase tracking-[0.12em] text-signal-foreground"
        >
          {isPoster ? "Manage on the map" : "Claim on the map"}
        </Link>
      </div>
    </div>
  );

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 pb-32 pt-[max(env(safe-area-inset-top),1.5rem)] sm:px-6">
      <div className="flex">
        {canGoBack ? (
          <button type="button" onClick={() => router.history.back()} aria-label="Go back"
            className="inline-flex size-11 items-center justify-center rounded-full border border-border bg-surface text-foreground">
            <ArrowLeft className="size-5" />
          </button>
        ) : (
          <Link to="/" aria-label="Go back to the map"
            className="inline-flex size-11 items-center justify-center rounded-full border border-border bg-surface text-foreground">
            <ArrowLeft className="size-5" />
          </Link>
        )}
      </div>
      {/* Hunters see the map first (where to go); Posters see status first. */}
      {isPoster ? <>{detailsBlock}{mapBlock}</> : <>{mapBlock}{detailsBlock}</>}
      <BountyBidsPanel requestId={id} />
    </div>
  );
}
