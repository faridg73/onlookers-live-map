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

export const creditPackageById = (id: string): CreditPackage | undefined =>
  CREDIT_PACKAGES.find((pack) => pack.id === id);

export const formatPackPrice = (cents: number) => `$${(cents / 100).toFixed(2)}`;
