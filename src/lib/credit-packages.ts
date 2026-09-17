/**
 * Buyable Credits packs. Every tier follows the fixed platform rate of
 * 4 Credits per $1 USD, so the dollar value is always baseCredits / 4.
 * The `credits` field is the total received (base + bonus), so the backend
 * webhook credits the user's wallet with the full amount.
 */
export type CreditPackage = {
  id: string;
  priceId: string;
  name: string;
  /** Credits the user pays for at the 4:$1 baseline. */
  baseCredits: number;
  /** Extra free credits included in the pack. */
  bonusCredits: number;
  /** Total credits received (baseCredits + bonusCredits). */
  credits: number;
  priceCents: number;
  blurb: string;
  badge?: string;
};

export const CREDIT_PACKAGES: CreditPackage[] = [
  // Entry-level packs
  {
    id: "credits_pack_20",
    priceId: "credits_pack_20_usd",
    name: "Starter",
    baseCredits: 20,
    bonusCredits: 0,
    credits: 20,
    priceCents: 500,
    blurb: "Funds your first live view request.",
  },
  {
    id: "credits_pack_40",
    priceId: "credits_pack_40_usd",
    name: "Event Pro",
    baseCredits: 40,
    bonusCredits: 0,
    credits: 40,
    priceCents: 1000,
    blurb: "A full game day of line checks and seat views.",
  },
  {
    id: "credits_pack_80",
    priceId: "credits_pack_80_usd",
    name: "Super Fan",
    baseCredits: 80,
    bonusCredits: 0,
    credits: 80,
    priceCents: 2000,
    blurb: "For requesters who tip onlookers every week.",
  },
  // High-commitment packs with bonus credits
  {
    id: "credits_pack_500",
    priceId: "credits_pack_500_usd",
    name: "Standard",
    baseCredits: 500,
    bonusCredits: 0,
    credits: 500,
    priceCents: 12500,
    blurb: "Perfect for occasional live view requests and tips.",
  },
  {
    id: "credits_pack_1000",
    priceId: "credits_pack_1000_usd",
    name: "Popular",
    baseCredits: 1000,
    bonusCredits: 50,
    credits: 1050,
    priceCents: 25000,
    blurb: "1,000 credits plus 50 bonus credits free.",
    badge: "Best Value",
  },
  {
    id: "credits_pack_2500",
    priceId: "credits_pack_2500_usd",
    name: "Pro Commitment",
    baseCredits: 2500,
    bonusCredits: 200,
    credits: 2700,
    priceCents: 62500,
    blurb: "2,500 credits plus 200 bonus credits free.",
    badge: "Pro Commitment",
  },
  {
    id: "credits_pack_5000",
    priceId: "credits_pack_5000_usd",
    name: "Enterprise",
    baseCredits: 5000,
    bonusCredits: 500,
    credits: 5500,
    priceCents: 125000,
    blurb: "5,000 credits plus 500 bonus credits free.",
    badge: "Enterprise / Power User",
  },
];

/**
 * Wallet top-up presets shown in the profile account centre. Each pack pays for
 * credits at the 4:$1 baseline and throws in bonus credits on top.
 */
export const TOPUP_PACKAGES: CreditPackage[] = [
  {
    id: "topup_50",
    priceId: "topup_50_usd",
    name: "Quick top-up",
    baseCredits: 40,
    bonusCredits: 10,
    credits: 50,
    priceCents: 1000,
    blurb: "50 credits for $10.",
  },
  {
    id: "topup_150",
    priceId: "topup_150_usd",
    name: "Regular top-up",
    baseCredits: 100,
    bonusCredits: 50,
    credits: 150,
    priceCents: 2500,
    blurb: "150 credits for $25.",
    badge: "Popular",
  },
  {
    id: "topup_500",
    priceId: "topup_500_usd",
    name: "Big top-up",
    baseCredits: 320,
    bonusCredits: 180,
    credits: 500,
    priceCents: 8000,
    blurb: "500 credits for $80.",
    badge: "Best Value",
  },
];

CREDIT_PACKAGES.push(...TOPUP_PACKAGES);

export const creditPackageById = (id: string): CreditPackage | undefined =>
  CREDIT_PACKAGES.find((pack) => pack.id === id);

export const formatPackPrice = (cents: number) => `$${(cents / 100).toFixed(2)}`;

/** Custom-credit limits and pricing. */
export const CUSTOM_CREDIT_MIN = 20;
export const CUSTOM_CREDIT_MAX = 25000;
export const CREDITS_PER_DOLLAR = 4;
export const CENTS_PER_CREDIT = 25; // 4 credits = $1 → 1 credit = $0.25

export function customCreditPriceCents(credits: number): number {
  return Math.round(credits * CENTS_PER_CREDIT);
}
