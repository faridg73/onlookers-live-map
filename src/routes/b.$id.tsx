import { createFileRoute, Link } from "@tanstack/react-router";
import { MapPin, Zap } from "lucide-react";

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
      ? `$${amt} bounty${place ? ` — ${place}` : ""} · Onlooker`
      : "Live view bounty · Onlooker";
    const desc = title
      ? `${title}${place ? ` at ${place}` : ""}. Capture a live photo or clip and claim the bounty.`
      : "Open this bounty on the Onlooker map and claim it with a live photo or clip.";
    return {
      meta: [
        { title: heading },
        { name: "description", content: desc },
        { property: "og:title", content: heading },
        { property: "og:description", content: desc },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  component: BountyPreview,
});

function BountyPreview() {
  const { id } = Route.useParams();
  const { amt, place, title } = Route.useSearch();

  return (
    <div className="mx-auto flex min-h-[80vh] max-w-lg flex-col justify-center px-4 pb-28 pt-6">
      <div className="overflow-hidden rounded-3xl border border-border bg-surface">
        <div className="flex items-center gap-3 border-b border-border px-5 py-4">
          <span className="flex size-8 items-center justify-center rounded-lg bg-signal text-signal-foreground">
            <Zap className="size-4" strokeWidth={2.4} />
          </span>
          <span className="font-display text-base tracking-tight text-foreground">Onlooker</span>
        </div>
        <div className="px-5 py-6">
          <div className="font-display text-5xl leading-none text-signal">${amt ?? "—"}</div>
          <div className="mt-2 text-[0.65rem] uppercase tracking-[0.18em] text-signal/70">
            live view bounty
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
    </div>
  );
}
