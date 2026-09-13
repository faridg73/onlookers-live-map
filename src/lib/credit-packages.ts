/** Buyable Credits packs. Price ids match the checkout catalogue. */
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
    id: "credits_starter_pack",
    priceId: "credits_starter_50",
    name: "Starter Pack",
    credits: 20,
    priceCents: 499,
    blurb: "Enough to fund your first couple of live view requests.",
  },
  {
    id: "credits_event_pro",
    priceId: "credits_event_pro_120",
    name: "Event Pro",
    credits: 40,
    priceCents: 999,
    blurb: "Cover a full game day of line checks, seat views and tips.",
    badge: "Best Value",
  },
  {
    id: "credits_super_fan",
    priceId: "credits_super_fan_300",
    name: "Super Fan",
    credits: 80,
    priceCents: 2199,
    blurb: "For heavy requesters who tip onlookers every week.",
  },
];

export const creditPackageById = (id: string): CreditPackage | undefined =>
  CREDIT_PACKAGES.find((pack) => pack.id === id);

export const formatPackPrice = (cents: number) => `$${(cents / 100).toFixed(2)}`;
