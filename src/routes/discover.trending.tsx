// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
// Venues & Events now lives at its own page; keep old links working.
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/discover/trending")({
  head: () => ({
    meta: [
      { title: "Venues & Events — Onlooker" },
      { name: "description", content: "Discover nearby venues, events, and real-time local activity on Onlooker." },
      { property: "og:title", content: "Venues & Events — Onlooker" },
      { property: "og:description", content: "Discover nearby venues, events, and real-time local activity on Onlooker." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  beforeLoad: () => {
    throw redirect({ to: "/events", replace: true });
  },
});
