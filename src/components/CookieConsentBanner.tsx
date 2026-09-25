// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import { Link } from "@tanstack/react-router";
import { Cookie } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  readCookieConsent,
  saveCookieConsent,
  type CookieConsentChoice,
} from "@/lib/cookie-consent";

/** First-visit choice for optional cookies and similar browser storage. */
export function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setVisible(readCookieConsent() === null || params.get("cookie-preferences") === "1");
  }, []);

  const choose = (choice: CookieConsentChoice) => {
    saveCookieConsent(choice);
    const url = new URL(window.location.href);
    if (url.searchParams.delete("cookie-preferences")) {
      window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
    }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <aside
      role="dialog"
      aria-modal="false"
      aria-labelledby="cookie-consent-title"
      aria-describedby="cookie-consent-description"
      className="fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-[80] mx-auto max-w-2xl border border-signal/45 bg-surface-raised p-4 shadow-2xl sm:bottom-5 sm:p-5"
    >
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-full border border-signal/50 bg-signal/10 text-signal">
          <Cookie className="size-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h2 id="cookie-consent-title" className="font-display text-base font-bold text-foreground">
            Your privacy, your choice
          </h2>
          <p id="cookie-consent-description" className="mt-1 text-xs leading-relaxed text-muted-foreground sm:text-sm">
            Essential cookies and browser storage keep sign-in, security, and preferences working.
            With your permission, optional diagnostics help us find and fix problems. We do not use
            advertising trackers or sell personal information.
          </p>
          <Link
            to="/privacy"
            className="mt-2 inline-flex text-xs font-semibold text-signal underline underline-offset-4 sm:text-sm"
          >
            Read our Privacy Policy
          </Link>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-1 gap-2 min-[420px]:grid-cols-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => choose("declined")}
          className="h-11 border-border bg-background font-bold"
        >
          Decline optional cookies
        </Button>
        <Button type="button" onClick={() => choose("accepted")} className="h-11 font-extrabold">
          Accept optional cookies
        </Button>
      </div>
    </aside>
  );
}