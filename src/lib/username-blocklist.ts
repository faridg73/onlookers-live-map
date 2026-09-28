// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import {
  RegExpMatcher,
  englishDataset,
  englishRecommendedTransformers,
} from "obscenity";

/**
 * Names nobody may claim: our own brand, staff/system-sounding words, page
 * names and impersonation-risk words. The database enforces the same list, so
 * this copy exists only to answer the live "is it free?" check instantly.
 * Everything is compared after stripping punctuation and undoing common
 * character swaps, so "adm1n" and "0fficial" are caught too.
 */
const RESERVED_NAMES = new Set([
  // brand protection
  "onlooker",
  "onlookerofficial",
  "onlookerapp",
  "onlookerlive",
  "onlookerteam",
  "onlookerllc",
  "onlookerhq",
  "onlookerco",
  // staff / system sounding
  "admin",
  "administrator",
  "moderator",
  "mod",
  "support",
  "help",
  "official",
  "staff",
  "security",
  "billing",
  "verified",
  "team",
  "system",
  "root",
  "superuser",
  // route collisions
  "settings",
  "profile",
  "terms",
  "rules",
  "login",
  "signup",
  "logout",
  "api",
  "discover",
  "earn",
  "post",
  "home",
  "feed",
  "community",
  "events",
  "auth",
  "dashboard",
  "account",
  // impersonation risk
  "police",
  "fbi",
  "irs",
  "government",
  "gov",
]);

const SWAPS: Record<string, string> = {
  "0": "o",
  "1": "i",
  "3": "e",
  "4": "a",
  "5": "s",
  "7": "t",
  $: "s",
  "@": "a",
};

/** Strips punctuation and undoes leetspeak swaps before comparing. */
function normalize(username: string): string {
  return username
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9$@]/g, "")
    .replace(/[01345 7$@]/g, (char) => SWAPS[char] ?? char);
}

export function isReservedUsername(username: string): boolean {
  return RESERVED_NAMES.has(normalize(username));
}

// Maintained English profanity/slur dataset; more languages can be added by
// registering further datasets here.
const profanityMatcher = new RegExpMatcher({
  ...englishDataset.build(),
  ...englishRecommendedTransformers,
});

/** True when a username contains profanity or a slur. */
export function isOffensiveUsername(username: string): boolean {
  const spaced = username.trim().toLowerCase().replace(/[._]+/g, " ");
  return profanityMatcher.hasMatch(spaced) || profanityMatcher.hasMatch(normalize(username));
}

/** Any reason a username may not be claimed, regardless of who holds it. */
export function isBlockedUsername(username: string): boolean {
  return isReservedUsername(username) || isOffensiveUsername(username);
}
