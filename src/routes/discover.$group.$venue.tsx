import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { Camera, MapPin, Radio } from "lucide-react";
import { RequestCard } from "@/components/RequestCard";
import { BountyDetailsDialog } from "@/components/BountyDetailsDialog";
import { VenueBountyDialog } from "@/components/VenueBountyDialog";
import { LocationPreviewMap } from "@/components/LocationPreviewMap";
import { useOnlooker } from "@/lib/onlooker-store";
import { groupBySlug, venueBySlug } from "@/lib/venues";

export const Route = createFileRoute("/discover/$group/$venue")({
  loader: ({ params }) => {
    const venue = venueBySlug(params.group, params.venue);
    if (!venue) throw notFound();
    return { name: venue.name, area: venue.area, blurb: venue.blurb };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return { meta: [{ title: "Not found — Onlooker" }, { name: "robots", content: "noindex" }] };
    }
    const title = `${loaderData.name} Live Views — Onlooker`;
    const description = `${loaderData.blurb} Post a bounty and get a live view from ${loaderData.name}, ${loaderData.area}.`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  component: VenueScreen,
});

function VenueScreen() {
  const params = Route.useParams();
  const group = groupBySlug(params.group)!;
  const venue = venueBySlug(params.group, params.venue)!;
  const { requests, claim } = useOnlooker();

  const related = requests.filter((r) =>
    venue.match.some((k) => `${r.place} ${r.title} ${r.note}`.toLowerCase().includes(k)),
  );
  const live = related.filter((r) => r.status === "open" || r.status === "claimed");
  const past = related.filter((r) => r.status === "fulfilled");

  return (
    <div className="mx-auto max-w-lg px-4 pb-32 pt-6">
      <Link
        to="/discover/$group"
        params={{ group: group.slug }}
        className="text-xs font-bold uppercase tracking-[0.14em] text-signal"
      >
        ← {group.name}
      </Link>

      <div
        className={`mt-3 flex h-28 items-center justify-center rounded-2xl bg-gradient-to-br text-5xl ${group.art}`}
        aria-hidden
      >
        {venue.emoji}
      </div>

      <h1 className="mt-4 font-display text-3xl tracking-tight text-foreground">{venue.name}</h1>
      <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
        <MapPin className="size-3.5" aria-hidden /> {venue.area}
      </p>
      <p className="mt-2 text-sm text-foreground/80">{venue.blurb}</p>

      <div className="mt-4 overflow-hidden rounded-2xl border border-border">
        <LocationPreviewMap address={`${venue.name}, ${venue.area}`} />
      </div>

      <VenueBountyDialog venue={venue}>
        <button
          type="button"
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-signal py-4 text-sm font-extrabold uppercase tracking-[0.16em] text-signal-foreground"
        >
          <Camera className="size-4" aria-hidden /> Post a bounty here
        </button>
      </VenueBountyDialog>

      <h2 className="mt-7 flex items-center gap-2 text-[0.68rem] font-bold uppercase tracking-[0.14em] text-muted-foreground">
        <Radio className="size-3.5 text-signal" aria-hidden /> Active live views
      </h2>
      <div className="mt-2 space-y-3">
        {live.map((r) => (
          <BountyDetailsDialog key={r.id} request={r} onClaim={claim}>
            <RequestCard request={r} compact />
          </BountyDetailsDialog>
        ))}
        {live.length === 0 && (
          <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            Nothing live here right now — be the first to ask for a view.
          </p>
        )}
      </div>

      {past.length > 0 && (
        <>
          <h2 className="mt-7 text-[0.68rem] font-bold uppercase tracking-[0.14em] text-muted-foreground">
            Recently delivered
          </h2>
          <div className="mt-2 space-y-3">
            {past.map((r) => (
              <BountyDetailsDialog key={r.id} request={r} onClaim={claim}>
                <RequestCard request={r} compact />
              </BountyDetailsDialog>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
