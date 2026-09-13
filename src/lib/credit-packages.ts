/**
 * Buyable Credits packs. Every tier follows the fixed platform rate of
 * 4 Credits per $1 USD, so the dollar value is always credits / 4.
 */
export type CreditPackage = {
  id: string;
  priceId: string;
  name: string;
  credits: number;
  priceCents: number;
  blurb: string;
  badge?: string;
};

export const CREDIT_PACKAGES: CreditPackage[] = [
  {
    id: "credits_pack_20",
    priceId: "credits_pack_20_usd",
    name: "Starter",
    credits: 20,
    priceCents: 500,
    blurb: "Funds your first live view request.",
  },
  {
    id: "credits_pack_40",
    priceId: "credits_pack_40_usd",
    name: "Event Pro",
    credits: 40,
    priceCents: 1000,
    blurb: "A full game day of line checks and seat views.",
    badge: "Most Popular",
  },
  {
    id: "credits_pack_80",
    priceId: "credits_pack_80_usd",
    name: "Super Fan",
    credits: 80,
    priceCents: 2000,
    blurb: "For requesters who tip onlookers every week.",
  },
  {
    id: "credits_pack_200",
    priceId: "credits_pack_200_usd",
    name: "Insider",
    credits: 200,
    priceCents: 5000,
    blurb: "Best for teams and heavy weekly requesters.",
    badge: "Best Value",
  },
];

export const creditPackageById = (id: string): CreditPackage | undefined =>
  CREDIT_PACKAGES.find((pack) => pack.id === id);

export const formatPackPrice = (cents: number) => `$${(cents / 100).toFixed(2)}`;
