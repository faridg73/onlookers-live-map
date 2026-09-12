import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { VENUE_GROUPS } from "@/lib/venues";
import { useOnlooker } from "@/lib/onlooker-store";

export const Route = createFileRoute("/discover/")({
  head: () => ({
    meta: [
      { title: "Browse Places — Onlooker Live Views" },
      {
        name: "description",
        content:
          "Browse malls, transit hubs, entertainment venues, landmarks and neighborhoods, then request a live view from anywhere.",
      },
      { property: "og:title", content: "Browse Places — Onlooker Live Views" },
      {
        property: "og:description",
        content: "Pick a place category and request a live view from a nearby onlooker.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DiscoverHome,
});

function DiscoverHome() {
  const { requests } = useOnlooker();

  const activeIn = (keywords: string[]) =>
    requests.filter(
      (r) =>
        r.status === "open" &&
        keywords.some((k) => `${r.place} ${r.title}`.toLowerCase().includes(k)),
    ).length;

  return (
    <div className="mx-auto max-w-lg px-4 pb-28 pt-6">
      <h1 className="font-display text-3xl tracking-tight text-foreground">Browse places</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Start broad, drill down to the exact venue, then ask for a live view.
      </p>

      <div className="mt-5 space-y-3">
        {VENUE_GROUPS.map((group) => {
          const open = group.venues.reduce((sum, v) => sum + activeIn(v.match), 0);
          return (
            <Link
              key={group.slug}
              to="/discover/$group"
              params={{ group: group.slug }}
              className="block overflow-hidden rounded-2xl border border-border bg-surface transition-colors hover:border-signal/60"
            >
              <div
                className={`flex h-24 items-center justify-between bg-gradient-to-br px-5 ${group.art}`}
              >
                <span className="text-4xl" aria-hidden>
                  {group.emoji}
                </span>
                <span className="rounded-full bg-background/70 px-2.5 py-1 text-[0.62rem] font-extrabold uppercase tracking-[0.12em] text-foreground">
                  {group.venues.length} places
                </span>
              </div>
              <div className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-display text-lg text-foreground">{group.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {group.tagline}
                    {open > 0 && <span className="text-signal"> · {open} live now</span>}
                  </p>
                </div>
                <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              </div>
            </Link>
          );
        })}
      </div>

      <div className="mt-6 flex gap-2">
        <Link
          to="/feed"
          className="flex-1 rounded-xl border border-border bg-surface py-3 text-center text-xs font-bold uppercase tracking-[0.12em] text-foreground"
        >
          Live feed
        </Link>
        <Link
          to="/explore"
          className="flex-1 rounded-xl border border-border bg-surface py-3 text-center text-xs font-bold uppercase tracking-[0.12em] text-foreground"
        >
          Explore clips
        </Link>
      </div>
    </div>
  );
}
