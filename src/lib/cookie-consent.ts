// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
export type CookieConsentChoice = "accepted" | "declined";

const CONSENT_STORAGE_KEY = "onlooker.cookie-consent.v1";
export const COOKIE_CONSENT_EVENT = "onlooker:cookie-consent-changed";
export const OPEN_COOKIE_PREFERENCES_EVENT = "onlooker:open-cookie-preferences";

export function readCookieConsent(): CookieConsentChoice | null {
  if (typeof window === "undefined") return null;
  try {
    const value = window.localStorage.getItem(CONSENT_STORAGE_KEY);
    return value === "accepted" || value === "declined" ? value : null;
  } catch {
    return null;
  }
}

export function hasOptionalCookieConsent() {
  return readCookieConsent() === "accepted";
}

export function saveCookieConsent(choice: CookieConsentChoice) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, choice);
  } catch {
    // The choice lasts for this page when browser storage is unavailable.
  }
  window.dispatchEvent(new CustomEvent<CookieConsentChoice>(COOKIE_CONSENT_EVENT, { detail: choice }));
}

export function openCookiePreferences() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(OPEN_COOKIE_PREFERENCES_EVENT));
}