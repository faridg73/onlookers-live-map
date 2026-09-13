import { CalendarDays, ExternalLink, MapPin, Radio, Ticket, Video } from "lucide-react";
import { VenueBountyDialog } from "@/components/VenueBountyDialog";
import type { LiveEvent } from "@/lib/ticketmaster.functions";
import type { Venue } from "@/lib/venues";

type Props = {
  event: LiveEvent;
  liveCount: number;
};

function eventVenue(event: LiveEvent): Venue | null {
  if (event.latitude === null || event.longitude === null) return null;
  return {
    slug: `tm-${event.id}`,
    name: event.venueName ? `${event.name} — ${event.venueName}` : event.name,
    area: event.city ?? event.venueName ?? "Event venue",
    blurb: `${event.segment ?? "Live event"}${event.genre ? ` · ${event.genre}` : ""} — ask for a live look from inside or outside the gates.`,
    emoji: "\u{1F3DF}\u{FE0F}",
    category: "events",
    latitude: event.latitude,
    longitude: event.longitude,
    match: [event.name.toLowerCase(), (event.venueName ?? "").toLowerCase()].filter(Boolean),
  };
}

function whenLabel(event: LiveEvent) {
  if (!event.localDate) return "Date TBA";
  const iso = event.localTime ? `${event.localDate}T${event.localTime}` : event.localDate;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return event.localDate;
  return date.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    ...(event.localTime ? { hour: "numeric", minute: "2-digit" } : {}),
  });
}

/** One live ticketed event with its thumbnail, tag, bounty count and CTAs. */
export function EventCard({ event, liveCount }: Props) {
  const venue = eventVenue(event);
  const tag = event.genre ?? event.segment ?? "Live event";

  return (
    <article className="overflow-hidden rounded-2xl border border-border bg-surface">
      <div className="flex gap-3 p-3">
        <div className="relative size-20 shrink-0 overflow-hidden rounded-xl bg-gradient-to-br from-signal/40 to-orange-500/20">
          {event.imageUrl ? (
            <img
              src={event.imageUrl}
              alt={`${event.name}${event.venueName ? ` at ${event.venueName}` : ""}`}
              loading="lazy"
              className="size-full object-cover"
            />
          ) : (
            <span className="flex size-full items-center justify-center text-3xl" aria-hidden>
              🎟️
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="rounded-full bg-signal/15 px-2 py-0.5 text-[0.6rem] font-extrabold uppercase tracking-[0.12em] text-signal">
              {tag}
            </span>
            <span className="rounded-full border border-border px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-[0.12em] text-muted-foreground">
              Tickets on sale
            </span>
          </div>

          <p className="mt-1 line-clamp-2 text-sm font-bold text-foreground">{event.name}</p>

          <p className="mt-0.5 flex items-center gap-1 truncate text-[0.68rem] text-muted-foreground">
            <CalendarDays className="size-3 shrink-0" aria-hidden />
            <span className="truncate">{whenLabel(event)}</span>
          </p>
          <p className="mt-0.5 flex items-center gap-1 truncate text-[0.68rem] text-muted-foreground">
            <MapPin className="size-3 shrink-0" aria-hidden />
            <span className="truncate">
              {event.venueName ?? "Venue TBA"}
              {event.city ? ` · ${event.city}` : ""}
            </span>
          </p>

          <p className="mt-1 inline-flex items-center gap-1 text-[0.68rem] font-extrabold uppercase tracking-[0.1em] text-signal">
            <Radio className="size-3" aria-hidden />
            {liveCount > 0
              ? `${liveCount} active ${liveCount === 1 ? "bounty" : "bounties"}`
              : "No bounties yet"}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 border-t border-border">
        {venue ? (
          <VenueBountyDialog venue={venue}>
            <button
              type="button"
              className="flex items-center justify-center gap-2 bg-signal/10 py-3 text-[0.68rem] font-extrabold uppercase tracking-[0.14em] text-signal transition-colors hover:bg-signal/20"
            >
              <Video className="size-4" aria-hidden /> Trigger live view
            </button>
          </VenueBountyDialog>
        ) : (
          <span className="flex items-center justify-center py-3 text-[0.68rem] font-bold uppercase tracking-[0.14em] text-muted-foreground">
            Location TBA
          </span>
        )}

        <a
          href={event.ticketUrl}
          target="_blank"
          rel="noopener noreferrer nofollow"
          className="flex items-center justify-center gap-2 border-l border-border py-3 text-[0.68rem] font-extrabold uppercase tracking-[0.14em] text-foreground transition-colors hover:bg-surface-raised"
        >
          <Ticket className="size-4" aria-hidden /> Tickets
          <ExternalLink className="size-3" aria-hidden />
        </a>
      </div>
    </article>
  );
}
