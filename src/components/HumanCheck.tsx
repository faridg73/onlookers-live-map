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
      size?: "normal" | "compact";
      appearance?: "always" | "execute" | "interaction-only";
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

function isTestingHost() {
  if (typeof window === "undefined") return false;
  return (
    window.location.hostname === "localhost" || window.location.hostname.startsWith("id-preview--")
  );
}

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
export function useHumanCheck(
  action: string,
  options: { discreet?: boolean } = {},
): {
  token: string | null;
  required: boolean;
  ready: boolean;
  reset: () => void;
  widget: ReactNode;
} {
  const { data: siteKey, isError } = useQuery({
    queryKey: ["turnstile-site-key"],
    queryFn: () => getTurnstileSiteKey(),
    staleTime: Infinity,
  });
  const [token, setToken] = useState<string | null>(null);
  const [widgetId, setWidgetId] = useState<string | null>(null);
  // When the widget can't run at all — hostname not allowed on this domain, a
  // blocked script, a network hiccup — we must never trap a real person behind
  // a disabled button. We stand down and let the form through.
  const [unavailable, setUnavailable] = useState(false);
  useEffect(() => {
    if (isTestingHost()) setUnavailable(true);
  }, []);
  const required = Boolean(siteKey) && !isError && !unavailable;

  const reset = useCallback(() => {
    setToken(null);
    if (widgetId && typeof window !== "undefined") window.turnstile?.reset(widgetId);
  }, [widgetId]);

  const widget = siteKey ? (
    <TurnstileWidget
      siteKey={siteKey}
      action={action}
      discreet={Boolean(options.discreet)}
      onToken={setToken}
      onWidget={setWidgetId}
      onUnavailable={() => setUnavailable(true)}
    />
  ) : null;

  return { token, required, ready: !required || Boolean(token), reset, widget };
}

/** How long we wait for a token before assuming the check can't complete here. */
const GRACE_MS = 12000;

function TurnstileWidget({
  siteKey,
  action,
  discreet,
  onToken,
  onWidget,
  onUnavailable,
}: {
  siteKey: string;
  action: string;
  /** Runs the challenge in the background with no visible box. */
  discreet: boolean;
  onToken: (token: string | null) => void;
  onWidget: (id: string | null) => void;
  onUnavailable: () => void;
}) {
  const holder = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);
  const solved = useRef(false);

  useEffect(() => {
    let id: string | null = null;
    let cancelled = false;
    const giveUp = (why: string) => {
      if (cancelled || solved.current) return;
      console.warn("[turnstile] standing down:", why);
      setFailed(true);
      onUnavailable();
    };
    const timer = window.setTimeout(() => giveUp("no token within grace period"), GRACE_MS);

    loadTurnstile()
      .then((api) => {
        if (cancelled || !holder.current) return;
        id = api.render(holder.current, {
          sitekey: siteKey,
          action,
          theme: "dark",
          size: discreet ? "compact" : "normal",
          appearance: discreet ? "interaction-only" : "always",
          callback: (value) => {
            solved.current = true;
            window.clearTimeout(timer);
            onToken(value);
          },
          "expired-callback": () => onToken(null),
          "error-callback": () => giveUp("widget error (hostname or challenge failure)"),
        });
        onWidget(id);
      })
      .catch(() => giveUp("script blocked or failed to load"));

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      onWidget(null);
      if (id && typeof window !== "undefined") window.turnstile?.remove(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteKey, action, discreet]);

  if (failed) {
    if (discreet) return null;
    return (
      <p className="text-xs text-muted-foreground">
        Skipping the human check on this device, you can carry on.
      </p>
    );
  }

  return <div ref={holder} className={discreet ? "" : "min-h-[65px]"} />;
}
