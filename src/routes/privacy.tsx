// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import { createFileRoute, Link, useCanGoBack, useRouter } from "@tanstack/react-router";
import { X } from "lucide-react";
import { PrivacyBody } from "@/components/legal/legal-content";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy | Onlooker LLC live view bounties" },
      {
        name: "description",
        content:
          "How Onlooker LLC collects and uses account details, precise GPS location and uploaded bounty videos, plus your deletion and consent rights.",
      },
      { property: "og:title", content: "Onlooker LLC Privacy Policy" },
      {
        property: "og:description",
        content:
          "Account data, real-time location, camera media, retention, sharing and your rights on Onlooker LLC.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  const router = useRouter();
  const canGoBack = useCanGoBack();

  const close = () => {
    if (canGoBack) router.history.back();
    else void router.navigate({ to: "/" });
  };

  return (
    <div className="reading-shell pb-32 pt-[max(env(safe-area-inset-top),3rem)]">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
        <h1 className="font-display text-3xl tracking-tight text-foreground">
          Onlooker LLC <span className="text-signal">Privacy Policy</span>
        </h1>
        <button
          type="button"
          aria-label="Close Privacy Policy"
          onClick={close}
          className="flex size-11 shrink-0 items-center justify-center rounded-full border border-border bg-secondary/80 text-foreground shadow-sm transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X className="size-5" />
        </button>
      </header>
      <div className="mt-4">
        <PrivacyBody />
      </div>

      <p className="mt-8 text-sm text-muted-foreground">
        Privacy questions or data deletion requests:{" "}
        <span className="font-semibold text-foreground">support@onlooker.io</span>
      </p>


      <p className="mt-10 text-sm text-muted-foreground">
        See also our{" "}
        <Link to="/terms" className="font-semibold text-foreground underline underline-offset-4">
          Terms of Service
        </Link>
        .
      </p>
    </div>
  );
}

