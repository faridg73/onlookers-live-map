// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
export type ProPlanId = "starter" | "pro" | "team";
export type ProRole = "agent" | "property_manager" | "home_builder";

export interface ProPlan {
  id: ProPlanId;
  name: string;
  priceCents: number;
  visits: string;
  tagline: string;
  features: string[];
  featured?: boolean;
}

export const PRO_PLANS: ProPlan[] = [
  {
    id: "starter",
    name: "Starter",
    priceCents: 4900,
    visits: "5 verified visits / mo",
    tagline: "For solo agents testing verified visits.",
    features: ["PIN handshake on every visit", "Text + email PIN delivery", "Decline & unreachable protection"],
  },
  {
    id: "pro",
    name: "Pro",
    priceCents: 14900,
    visits: "20 verified visits / mo",
    tagline: "For busy agents and property managers.",
    features: ["Everything in Starter", "Priority Onlooker matching", "Visit history & delivery logs"],
    featured: true,
  },
  {
    id: "team",
    name: "Team",
    priceCents: 34900,
    visits: "Unlimited seats & verified visits",
    tagline: "For brokerages, management firms and builders.",
    features: ["Everything in Pro", "Unlimited team seats", "Multi-site scheduling", "Priority dispute review"],
  },
];

/** Free trial: every new professional account gets this many verified visits. */
export const TRIAL_VISITS = 2;

/** Monthly verified-visit allowance. `null` means unlimited. */
export function planVisitLimit(plan: string): number | null {
  if (plan === "starter") return 5;
  if (plan === "pro") return 20;
  if (plan === "team") return null;
  return TRIAL_VISITS;
}

export const isTrialPlan = (plan: string) => plan !== "starter" && plan !== "pro" && plan !== "team";

/** True when the account has no verified visits left and must upgrade. */
export function needsUpgrade(plan: string, visitsUsed: number): boolean {
  const limit = planVisitLimit(plan);
  return limit !== null && visitsUsed >= limit;
}

export const PRO_ROLES: Array<{ id: ProRole; label: string }> = [
  { id: "agent", label: "Real estate agent" },
  { id: "property_manager", label: "Property manager" },
  { id: "home_builder", label: "Home builder" },
];

export const proPlanById = (id: string) => PRO_PLANS.find((p) => p.id === id);
export const formatUsd = (cents: number) => `$${(cents / 100).toFixed(cents % 100 ? 2 : 0)}`;

/** Draft handed from the Verified Visits request form to the bounty form. */
export const PRO_VISIT_DRAFT_KEY = "onlooker:pro-visit-draft";
export interface ProVisitDraft {
  bookingId: string;
  address: string;
  purpose: string;
  startAt: string | null;
  agentName: string;
  agentPhone: string;
  agentEmail: string;
}
