import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { SEED_REQUESTS, type LiveRequest } from "./onlooker";

type NewRequest = {
  title: string;
  place: string;
  note: string;
  bounty: number;
};

type Store = {
  requests: LiveRequest[];
  selectedId: string | null;
  select: (id: string | null) => void;
  addRequest: (input: NewRequest) => LiveRequest;
  claim: (id: string) => void;
};

const StoreContext = createContext<Store | null>(null);

export function OnlookerProvider({ children }: { children: ReactNode }) {
  const [requests, setRequests] = useState<LiveRequest[]>(SEED_REQUESTS);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Live feel: watcher counts drift upward over time.
  useEffect(() => {
    const t = setInterval(() => {
      setRequests((prev) =>
        prev.map((r) =>
          r.status === "fulfilled"
            ? r
            : { ...r, watchers: r.watchers + (Math.random() < 0.45 ? 1 : 0) },
        ),
      );
    }, 4000);
    return () => clearInterval(t);
  }, []);

  const addRequest = useCallback((input: NewRequest) => {
    const created: LiveRequest = {
      id: `r${Math.random().toString(36).slice(2, 8)}`,
      title: input.title,
      place: input.place,
      note: input.note,
      bounty: input.bounty,
      status: "open",
      minutesAgo: 0,
      watchers: 1,
      responses: 0,
      expiresInMin: 60,
      requester: "you",
      x: 300 + Math.random() * 400,
      y: 300 + Math.random() * 300,
    };
    setRequests((prev) => [created, ...prev]);
    return created;
  }, []);

  const claim = useCallback((id: string) => {
    setRequests((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: "claimed", responses: r.responses + 1 } : r)),
    );
  }, []);

  const value = useMemo(
    () => ({ requests, selectedId, select: setSelectedId, addRequest, claim }),
    [requests, selectedId, addRequest, claim],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useOnlooker() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useOnlooker must be used inside OnlookerProvider");
  return ctx;
}
