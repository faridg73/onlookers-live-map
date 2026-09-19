// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import { createFileRoute, Link } from "@tanstack/react-router";
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
  return (
    <div className="reading-shell pb-28 pt-[max(env(safe-area-inset-top),3rem)]">
      <h1 className="font-display text-3xl tracking-tight text-foreground">
        Onlooker LLC Terms of Service &amp; Legal Disclaimer
      </h1>
      <div className="mt-3">
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

