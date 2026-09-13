/** Buyable Looker Coins packs. Price ids match the checkout catalogue. */
export type CoinPackage = {
  id: string;
  priceId: string;
  name: string;
  coins: number;
  priceCents: number;
  blurb: string;
  badge?: string;
};

export const COIN_PACKAGES: CoinPackage[] = [
  {
    id: "coins_starter_pack",
    priceId: "coins_starter_50",
    name: "Starter Pack",
    coins: 20,
    priceCents: 499,
    blurb: "Enough to fund your first couple of live view requests.",
  },
  {
    id: "coins_event_pro",
    priceId: "coins_event_pro_120",
    name: "Event Pro",
    coins: 40,
    priceCents: 999,
    blurb: "Cover a full game day of line checks, seat views and tips.",
    badge: "Best Value",
  },
  {
    id: "coins_super_fan",
    priceId: "coins_super_fan_300",
    name: "Super Fan",
    coins: 80,
    priceCents: 2199,
    blurb: "For heavy requesters who tip onlookers every week.",
  },
];

export const coinPackageById = (id: string): CoinPackage | undefined =>
  COIN_PACKAGES.find((pack) => pack.id === id);

export const formatPackPrice = (cents: number) => `$${(cents / 100).toFixed(2)}`;
