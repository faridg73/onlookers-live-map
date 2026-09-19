// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import { createElement, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AuthContext, type AuthState } from "@/hooks/auth-context";

const SIGNED_OUT: AuthState = { user: null, loading: true };

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

    const refreshVerifiedUser = async (session?: { access_token: string; user: User }) => {
      const version = ++requestVersion.current;
      const { data, error } = session
        ? await supabase.auth.getUser(session.access_token)
        : await supabase.auth.getUser();
      if (!alive || version !== requestVersion.current) return;
      const verified = !error && data.user && (!session || data.user.id === session.user.id)
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
        void refreshVerifiedUser(session ?? undefined);
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
