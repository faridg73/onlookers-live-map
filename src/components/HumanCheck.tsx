import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";

import { getTurnstileSiteKey } from "@/lib/turnstile.functions";

/**
 * Cloudflare Turnstile widget. Almost always invisible — people see a small
 * "verifying you're human" strip that resolves itself. Until the keys are
 * configured nothing renders and forms behave exactly as before.
 */

const SCRIPT_SRC =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=onlookerTurnstileReady";

type TurnstileApi = {
  render: (
    el: HTMLElement,
    options: {
      sitekey: string;
      action?: string;
      theme?: "auto" | "light" | "dark";
      callback: (token: string) => void;
      "expired-callback"?: () => void;
      "error-callback"?: () => void;
    },
  ) => string;
  reset: (id?: string) => void;
  remove: (id?: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
    onlookerTurnstileReady?: () => void;
  }
}

let scriptPromise: Promise<TurnstileApi> | null = null;

function loadTurnstile(): Promise<TurnstileApi> {
  if (typeof window === "undefined") return Promise.reject(new Error("no window"));
  if (window.turnstile) return Promise.resolve(window.turnstile);
  scriptPromise ??= new Promise<TurnstileApi>((resolve, reject) => {
    window.onlookerTurnstileReady = () => {
      if (window.turnstile) resolve(window.turnstile);
      else reject(new Error("Turnstile failed to load"));
    };
    const script = document.createElement("script");
    script.src = SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onerror = () => reject(new Error("Turnstile script blocked"));
    document.head.appendChild(script);
  });
  return scriptPromise;
}

/**
 * Gives a form its human check: the widget to render, the token to send, and
 * whether the form is clear to submit.
 */
export function useHumanCheck(action: string): {
  token: string | null;
  required: boolean;
  ready: boolean;
  reset: () => void;
  widget: ReactNode;
} {
  const { data: siteKey } = useQuery({
    queryKey: ["turnstile-site-key"],
    queryFn: () => getTurnstileSiteKey(),
    staleTime: Infinity,
  });
  const [token, setToken] = useState<string | null>(null);
  const [widgetId, setWidgetId] = useState<string | null>(null);
  const required = Boolean(siteKey);

  const reset = useCallback(() => {
    setToken(null);
    if (widgetId && typeof window !== "undefined") window.turnstile?.reset(widgetId);
  }, [widgetId]);

  const widget = siteKey ? (
    <TurnstileWidget
      siteKey={siteKey}
      action={action}
      onToken={setToken}
      onWidget={setWidgetId}
    />
  ) : null;

  return { token, required, ready: !required || Boolean(token), reset, widget };
}

function TurnstileWidget({
  siteKey,
  action,
  onToken,
  onWidget,
}: {
  siteKey: string;
  action: string;
  onToken: (token: string | null) => void;
  onWidget: (id: string | null) => void;
}) {
  const holder = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let id: string | null = null;
    let cancelled = false;
    loadTurnstile()
      .then((api) => {
        if (cancelled || !holder.current) return;
        id = api.render(holder.current, {
          sitekey: siteKey,
          action,
          theme: "dark",
          callback: (value) => onToken(value),
          "expired-callback": () => onToken(null),
          "error-callback": () => onToken(null),
        });
        onWidget(id);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
      onWidget(null);
      if (id && typeof window !== "undefined") window.turnstile?.remove(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteKey, action]);

  if (failed) {
    return (
      <p className="text-xs text-muted-foreground">
        The human check couldn&rsquo;t load. Turn off any ad blocker and reload to continue.
      </p>
    );
  }

  return <div ref={holder} className="min-h-[65px]" />;
}
