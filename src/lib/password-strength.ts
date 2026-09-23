// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
/**
 * Client-side password strength estimation for the signup form. Runs on every
 * keystroke and returns a 0-4 score plus plain-language warnings, including a
 * check against a list of commonly reused passwords. The backend's breached-
 * password check still applies as a second layer.
 */

/** A trimmed list of the most reused passwords; kept short on purpose. */
const COMMON_PASSWORDS = new Set([
  "password", "password1", "password123", "123456", "12345678", "123456789",
  "1234567890", "12345678910", "qwerty", "qwerty123", "qwertyuiop", "abc123",
  "letmein", "welcome", "welcome1", "iloveyou", "dragon", "monkey", "football",
  "baseball", "sunshine", "princess", "shadow", "master", "superman", "batman",
  "trustno1", "whatever", "freedom", "starwars", "ninja", "hunter", "hunter2",
  "michael", "jordan", "charlie", "donald", "harley", "ranger", "buster",
  "soccer", "hockey", "killer", "george", "computer", "michelle", "jessica",
  "pepper", "daniel", "access", "andrew", "joshua", "maggie", "secret",
  "summer", "ashley", "bailey", "passw0rd", "p@ssw0rd", "passw0rd1", "admin123",
  "onlooker", "onlooker1", "onlooker123", "live123", "bounty123",
]);

export type PasswordStrength = {
  /** 0 (terrible) to 4 (great). */
  score: 0 | 1 | 2 | 3 | 4;
  label: "Very weak" | "Weak" | "Okay" | "Strong" | "Great";
  /** True when the password is a well-known reused one. */
  common: boolean;
  warnings: string[];
  suggestions: string[];
};

export function checkPasswordStrength(password: string, email: string): PasswordStrength {
  const warnings: string[] = [];
  const suggestions: string[] = [];
  const lower = password.toLowerCase();
  const common = COMMON_PASSWORDS.has(lower) || COMMON_PASSWORDS.has(lower.replace(/[0-9!@#$]+$/g, ""));

  if (common) {
    warnings.push("This is one of the most reused passwords online, attackers try it first.");
    suggestions.push("Avoid common words, even with numbers or symbols tacked on.");
  }

  const emailName = email.split("@")[0]?.toLowerCase() ?? "";
  if (emailName.length >= 3 && lower.includes(emailName)) {
    warnings.push("It contains your email name, which is easy to guess.");
  }

  if (/(.)\1{2,}/.test(password)) {
    warnings.push("Avoid repeating the same character three or more times.");
  }
  if (/(?:0123|1234|2345|3456|4567|5678|6789|abcd|qwer)/i.test(password)) {
    warnings.push("Avoid runs like 1234 or abcd, they're the first guesses.");
  }

  let raw = 0;
  if (password.length >= 10) raw += 1;
  if (password.length >= 14) raw += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) raw += 1;
  if (/[0-9]/.test(password) && /[^A-Za-z0-9]/.test(password)) raw += 1;

  if (common) raw = Math.min(raw, 1);
  if (password.length < 10) raw = Math.min(raw, 1);
  const score = Math.max(0, Math.min(4, raw)) as PasswordStrength["score"];

  if (password.length < 10) suggestions.push("Use at least 10 characters, 14+ is stronger.");
  if (!/[^A-Za-z0-9]/.test(password)) suggestions.push("Add a symbol like ! or ?.");
  if (!/[0-9]/.test(password)) suggestions.push("Add a number.");
  if (!common && warnings.length === 0 && score >= 4) {
    suggestions.push("A passphrase of a few random words works great and is easier to remember.");
  }

  const label = (["Very weak", "Weak", "Okay", "Strong", "Great"] as const)[score];
  return { score, label, common, warnings, suggestions };
}
