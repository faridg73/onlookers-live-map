// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
// Venues & Events now lives at its own page; keep old links working.
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/discover/trending")({
  beforeLoad: () => {
    throw redirect({ to: "/events", replace: true });
  },
});
