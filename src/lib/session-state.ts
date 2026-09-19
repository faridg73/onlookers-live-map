// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
export type SavedMapViewport = { lat: number; lng: number; zoom: number };

export function readSessionState<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.sessionStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function writeSessionState<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

export function readMapViewport(key?: string): SavedMapViewport | null {
  if (!key) return null;
  const saved = readSessionState<Partial<SavedMapViewport> | null>(key, null);
  if (!saved || typeof saved.lat !== "number" || typeof saved.lng !== "number" || typeof saved.zoom !== "number") return null;
  return { lat: saved.lat, lng: saved.lng, zoom: saved.zoom };
}
