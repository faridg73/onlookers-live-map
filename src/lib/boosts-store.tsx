import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { addBoost, fetchBoostTotals, type BoostTotals } from "@/lib/boosts";

type BoostStore = {
  totals: BoostTotals;
  boostOf: (requestId: string) => number;
  boost: (requestId: string, amount: number) => Promise<void>;
  refresh: () => Promise<void>;
};

const KEY = "__onlooker_boost_ctx__";
const globalScope = globalThis as unknown as Record<string, unknown>;
const BoostContext =
  (globalScope[KEY] as React.Context<BoostStore | null> | undefined) ??
  createContext<BoostStore | null>(null);
globalScope[KEY] = BoostContext;

export function BoostProvider({ children }: { children: ReactNode }) {
  const [totals, setTotals] = useState<BoostTotals>({});

  const refresh = useCallback(async () => {
    try {
      setTotals(await fetchBoostTotals());
    } catch {
      // Signed-out visitors simply see the base bounty.
      setTotals({});
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const boost = useCallback(
    async (requestId: string, amount: number) => {
      await addBoost(requestId, amount);
      setTotals((prev) => ({ ...prev, [requestId]: (prev[requestId] ?? 0) + amount }));
    },
    [],
  );

  const boostOf = useCallback((requestId: string) => totals[requestId] ?? 0, [totals]);

  const value = useMemo(
    () => ({ totals, boostOf, boost, refresh }),
    [totals, boostOf, boost, refresh],
  );

  return <BoostContext.Provider value={value}>{children}</BoostContext.Provider>;
}

export function useBoosts() {
  const ctx = useContext(BoostContext);
  if (!ctx) throw new Error("useBoosts must be used inside BoostProvider");
  return ctx;
}
