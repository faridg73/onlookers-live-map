import type { SubscriptionTier } from "@/lib/wallet-ledger";

/** Billing cadence for an Onlooker+ membership. */
export type BillingCycle = "monthly" | "yearly";

export type PlusPlan = {
  id: Exclude<SubscriptionTier, "free">;
  name: string;
  tagline: string;
  /** Monthly price in cents. */
  monthlyCents: number;
  /** Full-year price in cents. */
  yearlyCents: number;
  /** Credits included with every monthly billing period. */
  monthlyCredits: number;
  /** Shown as "350+" style copy when the plan tops out the ladder. */
  creditsLabel: string;
  perks: string[];
  /** Tailwind accent classes for the coloured header. */
  accent: { text: string; border: string; bg: string; chip: string };
  highlight?: boolean;
};

export const PLUS_PLANS: PlusPlan[] = [
  {
    id: "observer",
    name: "Observer",
    tagline: "Watch more, pay less per view.",
    monthlyCents: 999,
    yearlyCents: 9500,
    monthlyCredits: 50,
    creditsLabel: "50 credits",
    perks: [
      "50 credits every month",
      "Ad-free live feed",
      "Saved areas and alerts",
    ],
    accent: {
      text: "text-sky-300",
      border: "border-sky-400/50",
      bg: "bg-sky-400/10",
      chip: "bg-sky-400 text-black",
    },
  },
  {
    id: "hunter",
    name: "Hunter",
    tagline: "For onlookers filming every week.",
    monthlyCents: 1999,
    yearlyCents: 19000,
    monthlyCredits: 150,
    creditsLabel: "150 credits",
    perks: [
      "150 credits every month",
      "Priority on nearby bounty alerts",
      "Faster payouts and lower cash-out floor",
    ],
    accent: {
      text: "text-signal",
      border: "border-signal/60",
      bg: "bg-signal/10",
      chip: "bg-signal text-signal-foreground",
    },
    highlight: true,
  },
  {
    id: "operative",
    name: "Operative",
    tagline: "Media desks and pro dispatchers.",
    monthlyCents: 4999,
    yearlyCents: 48000,
    monthlyCredits: 350,
    creditsLabel: "350+ credits",
    perks: [
      "350+ credits every month",
      "Pro / Media Desk dispatch tools",
      "Raw archive stream and extended retention",
    ],
    accent: {
      text: "text-fuchsia-300",
      border: "border-fuchsia-400/50",
      bg: "bg-fuchsia-400/10",
      chip: "bg-fuchsia-400 text-black",
    },
  },
];

export const planById = (id: string): PlusPlan | undefined =>
  PLUS_PLANS.find((plan) => plan.id === id);

export const planPriceCents = (plan: PlusPlan, cycle: BillingCycle) =>
  cycle === "monthly" ? plan.monthlyCents : plan.yearlyCents;

/** Credits granted per billing period (a year pays out 12 months up front). */
export const planCredits = (plan: PlusPlan, cycle: BillingCycle) =>
  cycle === "monthly" ? plan.monthlyCredits : plan.monthlyCredits * 12;

export const formatMoney = (cents: number) => `$${(cents / 100).toFixed(2)}`;

/** How much a member saves versus paying monthly for a year, e.g. 21. */
export const annualSavingPercent = (plan: PlusPlan) =>
  Math.round((1 - plan.yearlyCents / (plan.monthlyCents * 12)) * 100);

/** Headline discount tag shown next to the yearly toggle. */
export const ANNUAL_DISCOUNT_TAG = "Save 20% on Annual";
