// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import { Link } from "@tanstack/react-router";
import { Radio, Upload } from "lucide-react";
import {
  STRANGE_SIGHTINGS_ID,
  STRANGE_SIGHTINGS_IMAGE_URL,
  STRANGE_SIGHTINGS_LABEL,
} from "@/lib/strange-sightings";

const CHIPS = ["🛸 UFO / UAP", "✨ Unexplained Lights", "✈️ Unusual Aircraft", "☄️ Sky Phenomena", "🔊 Strange Sounds"];

/** Full-width Home spotlight: free, public, one-tap live or upload for sudden sky sightings. */
export function StrangeSightingsSpotlight() {
  return (
    <section aria-labelledby="home-sightings" className="relative overflow-hidden rounded-2xl border border-signal/50 bg-home-charcoal">
      <img
        src={STRANGE_SIGHTINGS_IMAGE_URL}
        alt="Night sky with an unexplained light"
        loading="lazy"
        className="absolute inset-0 size-full object-cover opacity-60"
      />
      <span className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-background/20" aria-hidden />
      <div className="relative flex min-w-0 flex-col gap-3 p-4 sm:p-5">
        <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-signal/50 bg-background/70 px-2.5 py-1 font-mono text-[0.58rem] font-extrabold uppercase tracking-[0.18em] text-signal">
          <span className="relative flex size-1.5" aria-hidden>
            <span className="absolute inset-0 animate-ping rounded-full bg-signal opacity-75 motion-reduce:animate-none" />
            <span className="relative size-1.5 rounded-full bg-signal" />
          </span>
          Eyewitness · Free &amp; public
        </span>
        <Link
          to="/community"
          search={{ cat: STRANGE_SIGHTINGS_ID }}
          className="min-w-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal"
        >
          <h3 id="home-sightings" className="home-display text-lg font-extrabold leading-tight text-foreground sm:text-xl">
            🛸 {STRANGE_SIGHTINGS_LABEL}
          </h3>
          <p className="mt-1 text-[0.8rem] font-medium leading-snug text-muted-foreground">
            Seeing something strange in the sky? Go live or post your clip in seconds — no credits, everyone can watch.
          </p>
        </Link>
        <div className="flex flex-wrap gap-1.5">
          {CHIPS.map((chip) => (
            <Link
              key={chip}
              to="/community"
              search={{ cat: STRANGE_SIGHTINGS_ID }}
              className="rounded-full border border-home-line bg-background/70 px-2.5 py-1 text-[0.68rem] font-bold text-foreground hover:border-signal"
            >
              {chip}
            </Link>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Link
            to="/community"
            search={{ cat: STRANGE_SIGHTINGS_ID, action: "live" }}
            className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-destructive px-3 text-sm font-extrabold text-destructive-foreground hover:opacity-90"
          >
            <Radio className="size-4" aria-hidden /> Go live
          </Link>
          <Link
            to="/community"
            search={{ cat: STRANGE_SIGHTINGS_ID, action: "post" }}
            className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-signal px-3 text-sm font-extrabold text-signal-foreground hover:opacity-90"
          >
            <Upload className="size-4" aria-hidden /> Upload clip
          </Link>
        </div>
      </div>
    </section>
  );
}
