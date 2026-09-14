import { describe, expect, test } from "bun:test";

import { isAuthStorageKey } from "./auth-session";

describe("authentication storage isolation", () => {
  test("recognizes stored authentication sessions", () => {
    expect(isAuthStorageKey("sb-project-auth-token")).toBe(true);
    expect(isAuthStorageKey("sb-project-auth-token-code-verifier")).toBe(true);
    expect(isAuthStorageKey("supabase.auth.token")).toBe(true);
    expect(isAuthStorageKey("lovable-preview-auth")).toBe(true);
  });

  test("preserves non-authentication preferences", () => {
    expect(isAuthStorageKey("onlooker.terms-accepted")).toBe(false);
    expect(isAuthStorageKey("onlooker_discover_radius")).toBe(false);
  });
});