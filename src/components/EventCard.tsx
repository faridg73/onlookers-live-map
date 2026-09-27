// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import { CalendarDays, ExternalLink, MapPin, Radio, Ticket, Video } from "lucide-react";
import { VenueBountyDialog } from "@/components/VenueBountyDialog";
import { PlacePhoto } from "@/components/PlacePhoto";
import type { LiveEvent } from "@/lib/events.functions";
import type { Venue } from "@/lib/venues";

type Props = {
  event: LiveEvent;
  liveCount: number;
};

const SOURCE_LABEL: Record<LiveEvent["source"], string> = {
  ticketmaster: "Ticketmaster",
  seatgeek: "SeatGeek",
  eventbrite: "Eventbrite",
  onlooker: "Posted by a member",
};

function eventVenue(event: LiveEvent): Venue | null {
  if (event.latitude === null || event.longitude === null) return null;
  return {
    slug: event.id,
    name: event.venueName ? `${event.name}, ${event.venueName}` : event.name,
    area: event.city ?? event.venueName ?? "Event venue",
    blurb: `${event.category ?? "Live event"}, ask for a live look from inside or outside the gates.`,
    emoji: "\u{1F3DF}\u{FE0F}",
    category: event.scope === "local" ? "events" : "events",
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

/** One live event with its thumbnail, tag, bounty count and CTAs. */
export function EventCard({ event, liveCount }: Props) {
  const venue = eventVenue(event);
  const tag = event.category ?? (event.scope === "local" ? "Community" : "Live event");
  const when = whenLabel(event);
  const prefillNote = [
    `Event: ${event.name}`,
    event.venueName ? `Venue: ${event.venueName}${event.city ? `, ${event.city}` : ""}` : null,
    `When: ${when}`,
    "Film from outside the venue only: the crowd out front, the entry or box-office line, the marquee and the pre/after-party atmosphere on the public sidewalk.",
  ]
    .filter(Boolean)
    .join("\n");

  return (
    <article className="overflow-hidden rounded-2xl border border-border bg-surface">
      <div className="flex gap-3 p-3">
        <div className="relative size-20 shrink-0 overflow-hidden rounded-xl bg-surface-raised">
          <PlacePhoto
            src={event.imageUrl}
            identity={event.name}
            identityNote={event.venueName ?? event.city}
            alt={`${event.name}${event.venueName ? ` at ${event.venueName}` : ""}`}
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="rounded-full bg-signal/15 px-2 py-0.5 text-[0.6rem] font-extrabold uppercase tracking-[0.12em] text-signal">
              {tag}
            </span>
            <span className="rounded-full border border-border px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-[0.12em] text-muted-foreground">
              {SOURCE_LABEL[event.source]}
            </span>
            {event.priceFrom !== null ? (
              <span className="rounded-full border border-border px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                From ${Math.round(event.priceFrom)}
              </span>
            ) : null}
          </div>

          <p className="mt-1 line-clamp-2 text-sm font-bold text-foreground">{event.name}</p>

          <p className="mt-0.5 flex items-center gap-1 truncate text-[0.68rem] font-semibold text-signal">
            <CalendarDays className="size-3 shrink-0" aria-hidden />
            <span className="truncate">{when}</span>
          </p>
          <p className="mt-0.5 flex items-center gap-1 truncate text-[0.68rem] font-semibold text-signal">
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

      <div className="space-y-2 border-t border-border p-3">
        <div className="grid grid-cols-2 gap-2">
          {venue ? (
            <VenueBountyDialog
              venue={venue}
              defaultTitle={`Outside ${event.name}`}
              defaultNote={prefillNote}
              eventContext={
                event.source === "onlooker"
                  ? undefined
                  : { name: event.name, venueName: event.venueName, when, imageUrl: event.imageUrl }
              }
            >
              <button
                type="button"
                className="flex items-center justify-center gap-1.5 rounded-xl bg-signal px-2 py-3 text-center text-[0.66rem] font-extrabold uppercase leading-tight tracking-[0.1em] text-signal-foreground transition-opacity hover:opacity-90"
              >
                <Video className="size-4 shrink-0" aria-hidden /> Post a bounty for this event
              </button>
            </VenueBountyDialog>
          ) : (
            <span className="flex items-center justify-center rounded-xl border border-border py-3 text-[0.66rem] font-bold uppercase tracking-[0.1em] text-muted-foreground">
              Location TBA
            </span>
          )}

          {event.source === "onlooker" ? (
            <a
              href={event.ticketUrl}
              className="flex items-center justify-center gap-2 rounded-xl border border-border py-3 text-[0.66rem] font-extrabold uppercase tracking-[0.1em] text-foreground transition-colors hover:bg-surface-raised"
            >
              <MapPin className="size-4" aria-hidden /> See on map
            </a>
          ) : (
            <a
              href={event.ticketUrl}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="flex items-center justify-center gap-2 rounded-xl border border-border py-3 text-[0.66rem] font-extrabold uppercase tracking-[0.1em] text-foreground transition-colors hover:bg-surface-raised"
            >
              <Ticket className="size-4" aria-hidden /> Get Tickets
              <ExternalLink className="size-3" aria-hidden />
            </a>
          )}
        </div>
        {venue && event.source !== "onlooker" ? (
          <p className="text-center text-[0.68rem] text-muted-foreground">
            Can&apos;t make it? Get exterior, line, or pre/after-party footage from an onlooker nearby.
          </p>
        ) : null}
      </div>
    </article>
  );
}
