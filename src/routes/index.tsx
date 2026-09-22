// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo } from "react";
import { useBoosts } from "@/lib/boosts-store";
import { isClosed, useOnlooker } from "@/lib/onlooker-store";
import { refundExpiredBounties } from "@/lib/bounty-escrow";
import {
  requestMapPosition,
  type LiveRequest,
} from "@/lib/onlooker";

import { HomeLiveStage } from "@/components/HomeLiveStage";

const CRISIS_TERMS = [
  "accident", "crash", "collision", "emergency", "fire", "flood", "hazard", "rescue", "smoke", "storm",
];

function isCrisisRequest(request: LiveRequest) {
  if (request.category !== "community" && request.category !== "weather") return false;
  const text = `${request.title} ${request.note} ${request.instructions ?? ""}`.toLowerCase();
  return CRISIS_TERMS.some((term) => text.includes(term));
}

export const Route = createFileRoute("/")({
  validateSearch: (
    search: Record<string, unknown>,
  ): { b?: string | undefined; snap?: string | undefined; at?: string | undefined } => ({
    b: typeof search["b"] === "string" ? search["b"] : undefined,
    snap: search["snap"] === "1" ? "1" : undefined,
    at: typeof search["at"] === "string" ? search["at"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Onlooker, Live views from people already there" },
      {
        name: "description",
        content:
          "Onlooker connects live streaming with real-world accountability. Post a bounty, lock credits, and release them after verified proof.",
      },
      { property: "og:title", content: "Onlooker | Live proof backed by locked credits" },
      {
        property: "og:description",
        content: "Post a bounty, lock credits, and release them only after real-world proof is verified.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MapScreen,
});

function MapScreen() {
  const { requests } = useOnlooker();
  const navigate = useNavigate();
  const { b, at } = Route.useSearch();

  const openOnMap = useCallback((request: LiveRequest) => {
    const position = requestMapPosition(request);
    void navigate({
      to: "/discover",
      search: { view: "map", lat: position.lat, lng: position.lng, label: request.title },
    });
  }, [navigate]);

  // Legacy Home map links now open the dedicated standard map view.
  useEffect(() => {
    if (!at) return;
    const [lat, lng] = at.split(",").map((n) => Number.parseFloat(n)) as [number, number];
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      void navigate({ to: "/discover", search: { view: "map", lat, lng, label: "Chosen spot" }, replace: true });
    }
  }, [at, navigate]);

  const { boostOf } = useBoosts();

  // Send expired, unfulfilled deposits back to their requesters.
  useEffect(() => {
    void refundExpiredBounties();
  }, []);

  useEffect(() => {
    if (!b) return;
    const target = requests.find((r) => r.id === b);
    if (!target) return;
    openOnMap(target);
  }, [b, openOnMap, requests]);

  const poolOf = useCallback((request: LiveRequest) => request.bounty + boostOf(request.id), [boostOf]);

  const hotSpotRequests = useMemo(() => {
    return requests
      .filter((request) => !isClosed(request))
      .sort((a, b) => b.watchers - a.watchers)
      .slice(0, 12);
  }, [requests]);
  return (
    <div className="home-marketplace fixed inset-0 overflow-hidden bg-surface">
      <HomeLiveStage
        requests={requests}
        poolOf={poolOf}
        isCrisis={isCrisisRequest}
        onGoLive={() => void navigate({ to: "/post", search: { mode: "broadcast" } })}
        onPostBounty={() => void navigate({ to: "/post", search: { mode: "bounty" } })}
        onOpenRequest={(request) => {
          openOnMap(request);
        }}
        hotSpot={hotSpotRequests[0] ?? null}
        hotSpotRequests={hotSpotRequests}
        onOpenHighBounty={(request) => {
          openOnMap(request);
        }}
        onOpenLive={(request) => {
          void navigate({ to: "/live/$id", params: { id: request.id } });
        }}
        onOpenEmergency={(request) => {
          openOnMap(request);
        }}
        onOpenDispatches={() => {
          void navigate({ to: "/hunt" });
        }}
        onOpenHotSpot={(request) => {
          openOnMap(request);
        }}
      />
    </div>
  );
}
