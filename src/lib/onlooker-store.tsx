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
import { SEED_REQUESTS, type CategoryId, type LiveRequest } from "./onlooker";

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
  note: string;
  bounty: number;
  category?: CategoryId;
  instructions?: string;
  dbId?: string;
};

type Store = {
  requests: LiveRequest[];
  selectedId: string | null;
  select: (id: string | null) => void;
  addRequest: (input: NewRequest) => LiveRequest;
  claim: (id: string) => void;
  remove: (id: string) => void;
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
  const [requests, setRequests] = useState<LiveRequest[]>(() => SEED_REQUESTS.map(withDeadline));
  const [selectedId, setSelectedId] = useState<string | null>(null);

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
      note: input.note,
      bounty: input.bounty,
      category: input.category,
      instructions: input.instructions,
      dbId: input.dbId,
      status: "open",
      minutesAgo: 0,
      watchers: 1,
      responses: 0,
      expiresInMin: 60,
      expiresAt: Date.now() + 60 * 60_000,
      requester: "you",
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

  const claim = useCallback((id: string) => {
    setRequests((prev) =>
      prev.map((r) => (r.id === id && !isClosed(r) ? { ...r, status: "claimed" as const, responses: r.responses + 1 } : r)),
    );
  }, []);

  const value = useMemo(
    () => ({ requests, selectedId, select: setSelectedId, addRequest, claim, remove }),
    [requests, selectedId, addRequest, claim, remove],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useOnlooker() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useOnlooker must be used inside OnlookerProvider");
  return ctx;
}
