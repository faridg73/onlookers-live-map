// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
/**
 * Plain-language mappers for auth failures and password rules, shared by the
 * /auth screen and the inline sign-in card so both surfaces speak the same
 * language and stay in sync.
 */

/** Strong-password rules checked before the account service is called. */
export function describePasswordProblem(value: string, email: string): string | null {
  if (value.length < 10) return "Use at least 10 characters for your password.";
  if (!/[a-z]/.test(value) || !/[A-Z]/.test(value)) {
    return "Include both a small letter and a capital letter in your password.";
  }
  if (!/[0-9]/.test(value)) return "Include at least one number in your password.";
  if (!/[^A-Za-z0-9]/.test(value)) {
    return "Include at least one symbol, such as ! or ?, in your password.";
  }
  if (email && value.toLowerCase().includes(email.split("@")[0]?.toLowerCase() ?? "@@@")) {
    return "Your password can't contain your email name.";
  }
  return null;
}

/** Turns raw auth failures into a message people can act on. */
export function describeAuthError(err: unknown): {
  message: string;
  needsEmailConfirm: boolean;
} {
  const raw = err instanceof Error ? err.message : "";
  const code =
    typeof err === "object" && err !== null && "code" in err
      ? String((err as { code?: unknown }).code ?? "")
      : "";
  const text = `${code} ${raw}`.toLowerCase();
  if (text.includes("email_not_confirmed") || text.includes("email not confirmed")) {
    return {
      message:
        "Confirm your email address first, check your inbox for the verification link we sent.",
      needsEmailConfirm: true,
    };
  }
  if (text.includes("invalid login") || text.includes("invalid_credentials")) {
    return {
      message: "That email or password is incorrect. Check them and try again.",
      needsEmailConfirm: false,
    };
  }
  if (text.includes("user already registered") || text.includes("already_exists")) {
    return {
      message: "An account already exists for that email. Try signing in instead.",
      needsEmailConfirm: false,
    };
  }
  if (text.includes("too many") || text.includes("rate limit")) {
    return {
      message: "Too many attempts. Please wait a minute and try again.",
      needsEmailConfirm: false,
    };
  }
  if (text.includes("pwned") || text.includes("compromised") || text.includes("leaked")) {
    return {
      message:
        "That password has appeared in a known data breach. Please choose a different one.",
      needsEmailConfirm: false,
    };
  }
  if (text.includes("weak_password") || text.includes("password should")) {
    return {
      message:
        "That password is too weak. Use 10+ characters with a capital letter, a number and a symbol.",
      needsEmailConfirm: false,
    };
  }
  return {
    message: raw || "Something went wrong. Please try again.",
    needsEmailConfirm: false,
  };
}
