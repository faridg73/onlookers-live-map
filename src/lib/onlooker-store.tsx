// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type Context,
  type ReactNode,
} from "react";
import { CATEGORIES, type CategoryId, type LiveRequest } from "./onlooker";
import type { ActiveRequestRow } from "./requests.functions";

const CATEGORY_IDS = new Set<string>(CATEGORIES.map((c) => c.id));

/** Turns a saved request row into the shape the map, feed and cards expect. */
function fromRow(row: ActiveRequestRow): LiveRequest {
  const expiresAt = new Date(row.expiresAt).getTime();
  const createdAt = new Date(row.createdAt).getTime();
  return {
    id: `db-${row.id}`,
    dbId: row.id,
    title: row.prompt,
    place: row.locationName,
    locationType: row.locationType ?? undefined,
    note: row.details,
    instructions: row.details,
    bounty: row.bounty,
    category: row.category && CATEGORY_IDS.has(row.category) ? (row.category as CategoryId) : undefined,
    status: "open",
    minutesAgo: Math.max(0, Math.round((Date.now() - createdAt) / 60_000)),
    watchers: 1,
    responses: 0,
    expiresInMin: Math.max(0, Math.round((expiresAt - createdAt) / 60_000)),
    expiresAt,
    requester: row.mine ? "you" : "a poster nearby",
    lat: row.latitude,
    lng: row.longitude,
    x: 500,
    y: 500,
    bountyTier: row.bountyTier ?? undefined,
    bountyType: row.bountyType,
    captureMinutes: row.captureMinutes,
    scheduledStartAt: row.scheduledStartAt ?? undefined,
    weatherMultiplier: row.weatherMultiplier,
  };
}

/** Stamps an absolute deadline so the timer keeps running across re-renders. */
function withDeadline(r: LiveRequest): LiveRequest {
  return { ...r, expiresAt: r.expiresAt ?? Date.now() + r.expiresInMin * 60_000 };
}

/** A bounty stops accepting claims, uploads and chip-ins once it is closed. */
export function isClosed(r: LiveRequest) {
  return r.status === "fulfilled" || r.status === "expired";
}

type NewRequest = {
  title: string;
  place: string;
  /** Declared spot type, shown as a trust badge on the card. */
  locationType?: string | undefined;
  note: string;
  bounty: number;
  category?: CategoryId;
  instructions?: string;
  accessCode?: string | undefined;
  dbId?: string;
  /** True pin so distances are right the moment the request is posted. */
  lat?: number | undefined;
  lng?: number | undefined;
  /** Minutes until the bounty expires by itself; defaults to one hour. */
  expiresInMin?: number;
};

type Store = {
  requests: LiveRequest[];
  /** null while checking; false = visitor not signed in (bounties hidden). */
  signedIn: boolean | null;
  selectedId: string | null;
  select: (id: string | null) => void;
  addRequest: (input: NewRequest) => LiveRequest;
  claim: (id: string) => void;
  remove: (id: string) => void;
  updateLocationType: (id: string, locationType: string) => void;
};

// Keep one context identity across Vite hot updates. Without this, the root
// provider can retain the previous module's context while a refreshed route
// reads from a newly-created context and incorrectly reports no provider.
const STORE_CONTEXT_KEY = Symbol.for("onlooker.store-context");
const globalContexts = globalThis as typeof globalThis & {
  [STORE_CONTEXT_KEY]?: Context<Store | null>;
};
const existingStoreContext = globalContexts[STORE_CONTEXT_KEY];
const StoreContext = existingStoreContext ?? createContext<Store | null>(null);

if (!existingStoreContext) {
  globalContexts[STORE_CONTEXT_KEY] = StoreContext;
}

export function OnlookerProvider({ children }: { children: ReactNode }) {
  const [requests, setRequests] = useState<LiveRequest[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);

  // Every live request anyone posted, refreshed so nearby onlookers see new
  // bounties without reloading. Saved rows replace their local placeholder.
  useEffect(() => {
    let active = true;
    const load = async () => {
      const { readActiveRequests } = await import("./bounty-escrow");
      const rows = await readActiveRequests();
      if (!active) return;
      setRequests((prev) => {
        const saved = rows.map(fromRow);
        const localOnly = prev.filter((r) => !r.dbId);
        return [...saved, ...localOnly].map(withDeadline);
      });
    };
    void load();
    const t = setInterval(() => void load(), 30_000);
    // Reload immediately when someone signs in or out, instead of waiting 30s.
    let unsub: (() => void) | undefined;
    void import("@/integrations/supabase/client").then(({ supabase }) => {
      void supabase.auth.getSession().then(({ data }) => active && setSignedIn(!!data.session));
      const { data } = supabase.auth.onAuthStateChange((event, session) => {
        if (event !== "SIGNED_IN" && event !== "SIGNED_OUT") return;
        setSignedIn(!!session);
        void load();
      });
      unsub = () => data.subscription.unsubscribe();
    });
    return () => {
      active = false;
      clearInterval(t);
      unsub?.();
    };
  }, []);

  // Live feel: watcher counts drift upward over time.
  useEffect(() => {
    const t = setInterval(() => {
      setRequests((prev) =>
        prev.map((r) =>
          isClosed(r)
            ? r
            : { ...r, watchers: r.watchers + (Math.random() < 0.45 ? 1 : 0) },
        ),
      );
    }, 4000);
    return () => clearInterval(t);
  }, []);

  // Automatic expiry: once the deadline passes the bounty closes itself and the
  // requester's locked deposit is swept back to their wallet.
  useEffect(() => {
    const tick = () => {
      const now = Date.now();
      setRequests((prev) => {
        let changed = false;
        const next = prev.map((r) => {
          if (isClosed(r) || !r.expiresAt || r.expiresAt > now) return r;
          changed = true;
          return { ...r, status: "expired" as const, expiresInMin: 0 };
        });
        // Imported lazily: the escrow module pulls in server bindings and a
        // static import here creates a cycle that breaks this provider.
        if (changed) void import("./bounty-escrow").then((m) => m.refundExpiredBounties());
        return changed ? next : prev;
      });
    };
    tick();
    const t = setInterval(tick, 15_000);
    return () => clearInterval(t);
  }, []);

  const addRequest = useCallback((input: NewRequest) => {
    const created: LiveRequest = {
      id: `r${Math.random().toString(36).slice(2, 8)}`,
      title: input.title,
      place: input.place,
      locationType: input.locationType,
      note: input.note,
      bounty: input.bounty,
      category: input.category,
      instructions: input.instructions,
      accessCode: input.accessCode,
      dbId: input.dbId,
      status: "open",
      minutesAgo: 0,
      watchers: 1,
      responses: 0,
      expiresInMin: input.expiresInMin ?? 60,
      expiresAt: Date.now() + (input.expiresInMin ?? 60) * 60_000,
      requester: "you",
      lat: input.lat,
      lng: input.lng,
      x: 300 + Math.random() * 400,
      y: 300 + Math.random() * 300,
    };
    setRequests((prev) => [created, ...prev]);
    return created;
  }, []);

  const remove = useCallback((id: string) => {
    setRequests((prev) => prev.filter((r) => r.id !== id));
    setSelectedId((cur) => (cur === id ? null : cur));
  }, []);

  /** Re-tags the filming spot on a bounty the poster owns. */
  const updateLocationType = useCallback((id: string, locationType: string) => {
    setRequests((prev) =>
      prev.map((r) => (r.id === id ? { ...r, locationType } : r)),
    );
  }, []);

  const claim = useCallback((id: string) => {
    setRequests((prev) =>
      prev.map((r) => (r.id === id && !isClosed(r) ? { ...r, status: "claimed" as const, responses: r.responses + 1 } : r)),
    );
  }, []);

  const value = useMemo(
    () => ({ requests, signedIn, selectedId, select: setSelectedId, addRequest, claim, remove, updateLocationType }),
    [requests, signedIn, selectedId, addRequest, claim, remove, updateLocationType],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useOnlooker() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useOnlooker must be used inside OnlookerProvider");
  return ctx;
}
