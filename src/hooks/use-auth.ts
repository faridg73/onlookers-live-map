import { createContext, createElement, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

type AuthState = { user: User | null; loading: boolean };

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const queryClient = useQueryClient();
  const requestVersion = useRef(0);
  const activeUserId = useRef<string | null>(null);

  useEffect(() => {
    let alive = true;

    const applyUser = (nextUser: User | null) => {
      if (!alive) return;
      if (activeUserId.current !== nextUser?.id) queryClient.clear();
      activeUserId.current = nextUser?.id ?? null;
      setUser(nextUser);
      setLoading(false);
    };

    const refreshVerifiedUser = async (expectedId?: string) => {
      const version = ++requestVersion.current;
      const { data, error } = await supabase.auth.getUser();
      if (!alive || version !== requestVersion.current) return;
      const verified = !error && data.user && (!expectedId || data.user.id === expectedId)
        ? data.user
        : null;
      applyUser(verified);
    };

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        requestVersion.current += 1;
        applyUser(null);
        return;
      }
      if (event === "SIGNED_IN" || event === "USER_UPDATED" || event === "INITIAL_SESSION") {
        void refreshVerifiedUser(session?.user.id);
      }
    });

    void refreshVerifiedUser();

    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, [queryClient]);

  return createElement(AuthContext.Provider, { value: { user, loading } }, children);
}

export function useAuth() {
  const state = useContext(AuthContext);
  if (!state) throw new Error("useAuth must be used inside AuthProvider");
  return state;
}
