// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import { createFileRoute, Link } from "@tanstack/react-router";
import { Building2 } from "lucide-react";
import { PageBackButton } from "@/components/PageBackButton";
import { ProDashboard } from "@/components/pro/ProDashboard";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/pro-dashboard")({
  head: () => ({ meta: [
    { title: "Pro Dashboard | Onlooker" },
    { name: "description", content: "Manage professional Verified Visits, bounties, usage, and escrow." },
    { property: "og:title", content: "Onlooker Pro Dashboard" },
    { property: "og:description", content: "Manage professional Verified Visits, bounties, usage, and escrow." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  component: ProDashboardPage,
});

function ProDashboardPage() {
  const { user, loading } = useAuth();
  return <div className="min-h-screen bg-background pb-safe"><div className="mx-auto w-full max-w-6xl px-4 pb-24 pt-[max(env(safe-area-inset-top),1rem)] sm:px-6 lg:px-8"><PageBackButton label="Profile" fallback="/profile"/><div className="mt-6">{loading ? <div className="grid min-h-[50vh] place-items-center text-sm text-muted-foreground">Opening dashboard…</div> : !user ? <div className="rounded-lg border border-border bg-card p-8 text-center"><Building2 className="mx-auto size-8 text-signal"/><h1 className="mt-3 text-xl font-bold">Sign in to Pro Dashboard</h1><p className="mt-2 text-sm text-muted-foreground">Your professional visits and escrow details stay private.</p><Button asChild className="mt-5 bg-signal text-signal-foreground"><Link to="/auth">Sign in</Link></Button></div> : <ProDashboard/>}</div></div></div>;
}