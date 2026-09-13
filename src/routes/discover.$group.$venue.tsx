import { useEffect, useState } from "react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { Camera, MapPin, Radar, Radio, Star } from "lucide-react";
import { toast } from "sonner";
import { useRadar } from "@/hooks/use-radar";
import { RequestCard } from "@/components/RequestCard";
import { BountyDetailsDialog } from "@/components/BountyDetailsDialog";
import { VenueBountyDialog } from "@/components/VenueBountyDialog";
import { LocationPreviewMap } from "@/components/LocationPreviewMap";
import { useOnlooker } from "@/lib/onlooker-store";
import { groupBySlug, venueBySlug, type Venue } from "@/lib/venues";
import {
  DISCOVERY_GROUPS,
  discoveryGroupBySlug,
  placeIdFromSlug,
  venueFromPlace,
} from "@/lib/discovery";
import { fetchPlaceById, type DiscoveredPlace } from "@/lib/places.functions";

export const Route = createFileRoute("/discover/$group/$venue")({
  loader: ({ params }) => {
    const placeId = placeIdFromSlug(params.venue);
    if (placeId) {
      const group = discoveryGroupBySlug(params.group) ?? DISCOVERY_GROUPS[0]!;
      return {
        name: group.short,
        area: group.name,
        blurb: `${group.tagline}.`,
      };
    }
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
  const placeId = placeIdFromSlug(params.venue);
  const dynamicGroup = discoveryGroupBySlug(params.group);
  const curatedGroup = groupBySlug(params.group);
  const curatedVenue = placeId ? null : venueBySlug(params.group, params.venue);

  const { requests, claim } = useOnlooker();
  const { isWatched, toggle } = useRadar();
  const [place, setPlace] = useState<DiscoveredPlace | null>(null);
  const [loading, setLoading] = useState(Boolean(placeId));

  useEffect(() => {
    if (!placeId) return;
    let cancelled = false;
    setLoading(true);
    void fetchPlaceById({ data: { placeId } })
      .then((result) => {
        if (!cancelled) setPlace(result);
      })
      .catch((error) => console.error("[discovery] place details failed", error))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [placeId]);

  const group = dynamicGroup ?? DISCOVERY_GROUPS[0]!;
  const venue: Venue | null = curatedVenue ?? (place ? venueFromPlace(place, group) : null);
  const backLabel = dynamicGroup?.name ?? curatedGroup?.name ?? "All places";
  const art = dynamicGroup?.art ?? curatedGroup?.art ?? "from-signal/30 to-sky-500/20";

  if (!venue) {
    return (
      <div className="mx-auto max-w-lg px-4 pb-28 pt-6">
        <Link to="/discover" className="text-xs font-bold uppercase tracking-[0.14em] text-signal">
          ← All places
        </Link>
        <div className="mt-6 h-28 animate-pulse rounded-2xl border border-border bg-surface" />
        <p className="mt-4 text-sm text-muted-foreground">
          {loading ? "Loading this spot…" : "We couldn't load this spot. Go back and pick another."}
        </p>
      </div>
    );
  }

  const watched = isWatched(venue.slug);

  const watch = () => {
    const on = toggle({
      slug: venue.slug,
      name: venue.name,
      area: venue.area,
      latitude: venue.latitude,
      longitude: venue.longitude,
    });
    toast.success(
      on
        ? `Following ${venue.name} — you'll be alerted about new bounties within five miles.`
        : `Stopped following ${venue.name}.`,
    );
  };

  const related = requests.filter((r) =>
    venue.match.some((k) => `${r.place} ${r.title} ${r.note}`.toLowerCase().includes(k)),
  );
  const live = related.filter((r) => r.status === "open" || r.status === "claimed");
  const past = related.filter((r) => r.status === "fulfilled");

  return (
    <div className="mx-auto max-w-lg px-4 pb-32 pt-6">
      <Link
        to="/discover/$group"
        params={{ group: params.group }}
        className="text-xs font-bold uppercase tracking-[0.14em] text-signal"
      >
        ← {backLabel}
      </Link>

      <div
        className={`mt-3 flex h-28 items-center justify-center rounded-2xl bg-gradient-to-br text-5xl ${art}`}
        aria-hidden
      >
        {venue.emoji}
      </div>

      <h1 className="mt-4 font-display text-3xl tracking-tight text-foreground">{venue.name}</h1>
      <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
        <MapPin className="size-3.5" aria-hidden /> {venue.area}
      </p>
      {place?.rating && (
        <p className="mt-1 inline-flex items-center gap-1 text-sm text-muted-foreground">
          <Star className="size-3.5 text-signal" aria-hidden />
          {place.rating.toFixed(1)}
          {place.ratingCount ? ` · ${place.ratingCount} reviews` : ""}
        </p>
      )}
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

      <button
        type="button"
        onClick={watch}
        aria-pressed={watched}
        className={`mt-2 flex w-full items-center justify-center gap-2 rounded-2xl border-2 py-3 text-xs font-extrabold uppercase tracking-[0.14em] transition-colors ${
          watched
            ? "border-signal bg-signal/15 text-signal"
            : "border-border bg-surface text-foreground"
        }`}
      >
        <Radar className="size-4" aria-hidden />
        {watched ? "On your radar" : "Add to Bounty Radar"}
      </button>

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
