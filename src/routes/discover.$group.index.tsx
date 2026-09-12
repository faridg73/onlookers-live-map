import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ChevronRight, MapPin } from "lucide-react";
import { groupBySlug, isVenueOnToday } from "@/lib/venues";
import { useOnlooker } from "@/lib/onlooker-store";

export const Route = createFileRoute("/discover/$group/")({
  loader: ({ params }) => {
    const group = groupBySlug(params.group);
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
        { name: "description", content: `${loaderData.tagline}. Pick a venue and request a live view from a nearby onlooker.` },
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
  const group = groupBySlug(slug)!;
  const { requests } = useOnlooker();

  const liveCount = (keywords: string[]) =>
    requests.filter(
      (r) =>
        r.status !== "expired" &&
        keywords.some((k) => `${r.place} ${r.title}`.toLowerCase().includes(k)),
    ).length;

  return (
    <div className="mx-auto max-w-lg px-4 pb-28 pt-6">
      <Link to="/discover" className="text-xs font-bold uppercase tracking-[0.14em] text-signal">
        ← All places
      </Link>
      <h1 className="mt-2 font-display text-3xl tracking-tight text-foreground">{group.name}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{group.tagline}</p>

      <div className="mt-5 space-y-3">
        {group.venues.filter((venue) => isVenueOnToday(venue)).map((venue) => {
          const live = liveCount(venue.match);
          return (
            <Link
              key={venue.slug}
              to="/discover/$group/$venue"
              params={{ group: group.slug, venue: venue.slug }}
              className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-3 transition-colors hover:border-signal/60"
            >
              <span
                className={`flex size-16 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-2xl ${group.art}`}
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
      </div>
    </div>
  );
}
