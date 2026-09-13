import { useState } from "react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ChevronRight, MapPin, Star } from "lucide-react";
import { AreaPicker } from "@/components/AreaPicker";
import { discoveryGroupBySlug, placeSlug } from "@/lib/discovery";
import { groupBySlug, isVenueOnToday } from "@/lib/venues";
import { useDiscoveryArea } from "@/hooks/use-discovery-area";
import { usePlaceList } from "@/hooks/use-place-list";
import { useOnlooker } from "@/lib/onlooker-store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/discover/$group/")({
  loader: ({ params }) => {
    const dynamic = discoveryGroupBySlug(params.group);
    const curated = groupBySlug(params.group);
    const group = dynamic ?? curated;
    if (!group) throw notFound();
    return { name: group.name, tagline: group.tagline };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return { meta: [{ title: "Not found — Onlooker" }, { name: "robots", content: "noindex" }] };
    }
    const title = `${loaderData.name} — Onlooker Live Views`;
    return {
      meta: [
        { title },
        {
          name: "description",
          content: `${loaderData.tagline}. Pick a spot near you and request a live view from a nearby onlooker.`,
        },
        { property: "og:title", content: title },
        { property: "og:description", content: loaderData.tagline },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  component: GroupScreen,
});

function GroupScreen() {
  const { group: slug } = Route.useParams();
  const group = discoveryGroupBySlug(slug);
  const curated = groupBySlug(slug);
  const { requests } = useOnlooker();
  const { area } = useDiscoveryArea();
  const [subId, setSubId] = useState<string | null>(null);

  const { places, loading } = usePlaceList(group, subId, area);

  const heading = group?.name ?? curated?.name ?? "Places";
  const tagline = group?.tagline ?? curated?.tagline ?? "";
  const art = group?.art ?? curated?.art ?? "from-signal/30 to-sky-500/20";
  const emoji = group?.emoji ?? curated?.emoji ?? "\u{1F4CD}";

  const liveCount = (keywords: string[]) =>
    requests.filter(
      (r) =>
        r.status !== "expired" &&
        keywords.some((k) => `${r.place} ${r.title}`.toLowerCase().includes(k)),
    ).length;

  // Curated spots are the safety net when Places has nothing for this area.
  const fallback = !loading && places.length === 0 ? (curated?.venues ?? []) : [];

  return (
    <div className="mx-auto max-w-lg px-4 pb-28 pt-6">
      <Link to="/discover" className="text-xs font-bold uppercase tracking-[0.14em] text-signal">
        ← All places
      </Link>
      <h1 className="mt-2 font-display text-3xl tracking-tight text-foreground">{heading}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{tagline}</p>

      <div className="mt-4">
        <AreaPicker />
      </div>

      {group && (
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setSubId(null)}
            aria-pressed={subId === null}
            className={cn(
              "rounded-full border px-3 py-1.5 text-[0.66rem] font-extrabold uppercase tracking-[0.1em] transition-colors",
              subId === null
                ? "border-signal bg-signal/15 text-signal"
                : "border-border bg-surface text-muted-foreground",
            )}
          >
            All
          </button>
          {group.subs.map((sub) => (
            <button
              key={sub.id}
              type="button"
              onClick={() => setSubId(sub.id)}
              aria-pressed={subId === sub.id}
              className={cn(
                "rounded-full border px-3 py-1.5 text-[0.66rem] font-extrabold uppercase tracking-[0.1em] transition-colors",
                subId === sub.id
                  ? "border-signal bg-signal/15 text-signal"
                  : "border-border bg-surface text-muted-foreground",
              )}
            >
              {sub.label}
            </button>
          ))}
        </div>
      )}

      <div className="mt-5 space-y-3">
        {loading &&
          places.length === 0 &&
          [0, 1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl border border-border bg-surface" />
          ))}

        {places.map((place) => {
          const live = liveCount([place.name.toLowerCase()]);
          return (
            <Link
              key={place.id}
              to="/discover/$group/$venue"
              params={{ group: slug, venue: placeSlug(place.id) }}
              className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-3 transition-colors hover:border-signal/60"
            >
              <span
                className={`flex size-16 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-2xl ${art}`}
                aria-hidden
              >
                {emoji}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-display text-base text-foreground">{place.name}</p>
                <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted-foreground">
                  <MapPin className="size-3 shrink-0" aria-hidden />
                  {place.address ?? area.label}
                </p>
                <p className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                  {place.primaryType && <span className="truncate">{place.primaryType}</span>}
                  {place.rating && (
                    <span className="inline-flex shrink-0 items-center gap-1">
                      <Star className="size-3 text-signal" aria-hidden />
                      {place.rating.toFixed(1)}
                      {place.ratingCount ? ` (${place.ratingCount})` : ""}
                    </span>
                  )}
                </p>
                {live > 0 && (
                  <p className="mt-1 text-[0.66rem] font-extrabold uppercase tracking-[0.1em] text-signal">
                    {live} recent request{live === 1 ? "" : "s"}
                  </p>
                )}
              </div>
              <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            </Link>
          );
        })}

        {fallback.filter((venue) => isVenueOnToday(venue)).map((venue) => (
          <Link
            key={venue.slug}
            to="/discover/$group/$venue"
            params={{ group: slug, venue: venue.slug }}
            className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-3 transition-colors hover:border-signal/60"
          >
            <span
              className={`flex size-16 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-2xl ${art}`}
              aria-hidden
            >
              {venue.emoji}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-display text-base text-foreground">{venue.name}</p>
              <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted-foreground">
                <MapPin className="size-3 shrink-0" aria-hidden />
                {venue.area}
              </p>
              <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{venue.blurb}</p>
            </div>
            <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          </Link>
        ))}

        {!loading && places.length === 0 && fallback.length === 0 && (
          <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            Nothing of this kind found around {area.label}. Try another refinement or switch city.
          </p>
        )}
      </div>
    </div>
  );
}
