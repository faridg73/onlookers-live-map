// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { AccountCenter } from "@/components/AccountCenter";

export const Route = createFileRoute("/membership")({
  head: () => ({
    meta: [
      { title: "Onlooker+ Membership — Compare Plans" },
      { name: "description", content: "Compare Observer, Hunter and Operative Onlooker+ plans, top up credits and see your wallet history." },
      { property: "og:title", content: "Onlooker+ Membership — Compare Plans" },
      { property: "og:description", content: "Compare Onlooker+ plans, top up credits and see your wallet history." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MembershipPage,
});

function MembershipPage() {
  return (
    <div className="app-shell pb-8 pt-[max(env(safe-area-inset-top),3rem)]">
      <Link
        to="/profile"
        aria-label="Back to profile"
        className="mb-3 inline-flex size-9 items-center justify-center rounded-full border border-border bg-surface text-muted-foreground hover:text-signal"
      >
        <ArrowLeft className="size-4" />
      </Link>
      <h1 className="font-display text-2xl tracking-tight text-foreground">Onlooker+ membership</h1>
      <p className="mt-1 text-sm text-muted-foreground">Compare plans, top up credits and view your history.</p>
      <AccountCenter />
    </div>
  );
}
