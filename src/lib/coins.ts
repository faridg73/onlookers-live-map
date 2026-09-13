/**
 * Looker Coins are the single in-app currency. Every bounty, chip-in, tip and
 * reward payout is denominated in whole coins; dollars only ever appear when
 * buying coins by card or cashing coins out to a bank.
 */

/** Fixed conversion: 10 Looker Coins = $1.00 USD. */
export const COINS_PER_USD = 10;

/** Smallest bounty anyone can post. */
export const MIN_BOUNTY_COINS = 50;

/** Cash out is only allowed from 100 coins ($10.00) up. */
export const MIN_CASHOUT_COINS = 100;

/** Micro-tip sent from the global feed. */
export const MICRO_TIP_COINS = 5;

export const coinsToUsd = (coins: number) =>
  Math.round((coins / COINS_PER_USD) * 100) / 100;

export const usdToCoins = (usd: number) => Math.round(usd * COINS_PER_USD);

/** Compact badge form, e.g. "120 LC". */
export const formatCoins = (coins: number) =>
  `${Math.round(Number.isFinite(coins) ? coins : 0).toLocaleString()} LC`;

/** Spelled-out form for sentences, e.g. "120 Looker Coins". */
export const formatCoinWords = (coins: number) => {
  const n = Math.round(Number.isFinite(coins) ? coins : 0);
  return `${n.toLocaleString()} Looker Coin${n === 1 ? "" : "s"}`;
};

/** Cash equivalent, e.g. "$12.00". */
export const formatCoinCash = (coins: number) => `$${coinsToUsd(coins).toFixed(2)}`;
