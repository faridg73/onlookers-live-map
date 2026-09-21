// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import { createFileRoute, Link, useCanGoBack, useRouter } from "@tanstack/react-router";
import { X } from "lucide-react";
import { TermsBody } from "@/components/legal/legal-content";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service | Onlooker LLC live view bounties" },
      {
        name: "description",
        content:
          "Onlooker LLC's Terms of Service: platform role, lawful recording rules, content rights, assumption of risk, liability waiver and indemnification.",
      },
      { property: "og:title", content: "Onlooker LLC Terms of Service" },
      {
        property: "og:description",
        content:
          "Read the rules for posting and fulfilling live view bounties on Onlooker LLC, including safety, privacy and liability terms.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
  const router = useRouter();
  const canGoBack = useCanGoBack();

  const close = () => {
    if (canGoBack) router.history.back();
    else void router.navigate({ to: "/" });
  };

  return (
    <div className="reading-shell pb-28 pt-[max(env(safe-area-inset-top),3rem)]">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
        <h1 className="font-display text-3xl tracking-tight text-foreground">
          Onlooker LLC <span className="text-signal">Terms of Service</span> &amp; Legal Disclaimer
        </h1>
        <button
          type="button"
          aria-label="Close Terms of Service"
          onClick={close}
          className="flex size-11 shrink-0 items-center justify-center rounded-full border border-border bg-secondary/80 text-foreground shadow-sm transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X className="size-5" />
        </button>
      </header>
      <div className="mt-4">
        <TermsBody />
      </div>

      <Link
        to="/auth"
        className="mt-10 inline-flex min-h-11 items-center rounded-full border border-border bg-secondary/80 px-4 py-3 text-sm font-semibold text-foreground"
      >
        Back to sign in
      </Link>
    </div>
  );
}

