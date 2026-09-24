// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import { createFileRoute, Link, useCanGoBack, useRouter } from "@tanstack/react-router";
import { ArrowLeft, MapPin, Zap } from "lucide-react";

import { BountyBidsPanel } from "@/components/BountyBidsPanel";
import { formatCreditCash } from "@/lib/credits";

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
  const { amt, place, title } = Route.useSearch();
  const router = useRouter();
  const canGoBack = useCanGoBack();
  const credits = Math.max(0, Math.round(amt ?? 0));

  return (
    <div className="mx-auto flex min-h-[80vh] w-full max-w-3xl flex-col justify-center px-4 pb-32 pt-[max(env(safe-area-inset-top),3rem)] sm:px-6">
      {/* Back arrow, top left — always a way out of this page. */}
      <div className="mb-3 flex">
        {canGoBack ? (
          <button
            type="button"
            onClick={() => router.history.back()}
            aria-label="Go back"
            className="inline-flex size-11 items-center justify-center rounded-full border border-border bg-surface text-foreground"
          >
            <ArrowLeft className="size-5" />
          </button>
        ) : (
          <Link
            to="/"
            aria-label="Go back to the map"
            className="inline-flex size-11 items-center justify-center rounded-full border border-border bg-surface text-foreground"
          >
            <ArrowLeft className="size-5" />
          </Link>
        )}
      </div>
      <div className="overflow-hidden rounded-3xl border border-border bg-surface">
        <div className="flex items-center gap-3 border-b border-border px-5 py-4">
          <span className="flex size-8 items-center justify-center rounded-lg bg-signal text-signal-foreground">
            <Zap className="size-4" strokeWidth={2.4} />
          </span>
          <span className="font-display text-base tracking-tight text-foreground">Onlooker</span>
        </div>
        <div className="px-5 py-6">
          <div className="font-display text-5xl leading-none tabular-nums text-signal">
            {credits.toLocaleString()}
          </div>
          <div className="mt-2 text-[0.65rem] uppercase tracking-[0.18em] text-signal/70">
            credits · live view bounty {credits > 0 && `(${formatCreditCash(credits)})`}
          </div>
          <h1 className="mt-4 font-display text-2xl leading-tight text-foreground">
            {title ?? "Someone wants a live view"}
          </h1>
          {place && (
            <p className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
              <MapPin className="size-4" /> {place}
            </p>
          )}
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            Nearby? Head over, send back a live photo or clip, and take the payout.
          </p>
          <Link
            to="/"
            search={{ b: id }}
            className="mt-6 block rounded-full bg-signal px-5 py-3 text-center text-sm font-semibold uppercase tracking-[0.12em] text-signal-foreground"
          >
            Open on the map
          </Link>
        </div>
      </div>
      <BountyBidsPanel requestId={id} />
    </div>
  );
}
