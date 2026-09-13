import { Link } from "@tanstack/react-router";
import { MapPin, Radio, Star, Video } from "lucide-react";
import { VenueBountyDialog } from "@/components/VenueBountyDialog";
import { venueFromPlace, placeSlug, type DiscoveryGroup } from "@/lib/discovery";
import type { DiscoveredPlace } from "@/lib/places.functions";

type Props = {
  place: DiscoveredPlace;
  group: DiscoveryGroup;
  tag: string;
  photoUrl: string | null;
  liveCount: number;
  weekend: boolean;
};

/** One trending event/hotspot card with a thumbnail, tag and instant bounty CTA. */
export function TrendingCard({ place, group, tag, photoUrl, liveCount, weekend }: Props) {
  const venue = venueFromPlace(place, group);

  return (
    <article className="overflow-hidden rounded-2xl border border-border bg-surface">
      <div className="flex gap-3 p-3">
        <div
          className={`relative size-20 shrink-0 overflow-hidden rounded-xl bg-gradient-to-br ${group.art}`}
        >
          {photoUrl ? (
            <img
              src={photoUrl}
              alt={`${place.name} in ${venue.area}`}
              loading="lazy"
              className="size-full object-cover"
            />
          ) : (
            <span className="flex size-full items-center justify-center text-3xl" aria-hidden>
              {group.emoji}
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="rounded-full bg-signal/15 px-2 py-0.5 text-[0.6rem] font-extrabold uppercase tracking-[0.12em] text-signal">
              {tag}
            </span>
            {weekend && (
              <span className="rounded-full border border-border px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                This weekend
              </span>
            )}
          </div>

          <Link
            to="/discover/$group/$venue"
            params={{ group: group.slug, venue: placeSlug(place.id) }}
            className="mt-1 block line-clamp-2 text-sm font-bold text-foreground hover:text-signal"
          >
            {place.name}
          </Link>

          <p className="mt-0.5 flex items-center gap-1 truncate text-[0.68rem] text-muted-foreground">
            <MapPin className="size-3 shrink-0" aria-hidden />
            <span className="truncate">{venue.area}</span>
            {place.rating ? (
              <>
                <Star className="size-3 shrink-0 text-signal" aria-hidden />
                {place.rating.toFixed(1)}
              </>
            ) : null}
          </p>

          <p className="mt-1 inline-flex items-center gap-1 text-[0.68rem] font-extrabold uppercase tracking-[0.1em] text-signal">
            <Radio className="size-3" aria-hidden />
            {liveCount > 0 ? `${liveCount} active ${liveCount === 1 ? "bounty" : "bounties"}` : "No bounties yet"}
          </p>
        </div>
      </div>

      <VenueBountyDialog venue={venue}>
        <button
          type="button"
          className="flex w-full items-center justify-center gap-2 border-t border-border bg-signal/10 py-3 text-[0.68rem] font-extrabold uppercase tracking-[0.14em] text-signal transition-colors hover:bg-signal/20"
        >
          <Video className="size-4" aria-hidden /> Trigger live view
        </button>
      </VenueBountyDialog>
    </article>
  );
}
