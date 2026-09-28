// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import { Check, Circle, X } from "lucide-react";

/** The signup password rules; every one must pass before an account can be created. */
export const PASSWORD_RULES: Array<{ id: string; label: string; test: (p: string) => boolean }> = [
  { id: "length", label: "At least 10 characters", test: (p) => p.length >= 10 },
  { id: "upper", label: "An uppercase letter", test: (p) => /[A-Z]/.test(p) },
  { id: "lower", label: "A lowercase letter", test: (p) => /[a-z]/.test(p) },
  { id: "number", label: "A number", test: (p) => /\d/.test(p) },
  { id: "symbol", label: "A symbol (like ! @ # ?)", test: (p) => /[^A-Za-z0-9]/.test(p) },
];

export function passwordMeetsRules(password: string) {
  return PASSWORD_RULES.every((rule) => rule.test(password));
}

/** Live checklist: neutral while empty, then pass/fail feedback while typing. */
export function PasswordChecklist({ password }: { password: string }) {
  const hasInput = password.length > 0;

  return (
    <ul className="space-y-1 px-1" aria-live="polite">
      {PASSWORD_RULES.map((rule) => {
        const ok = rule.test(password);
        const state = !hasInput ? "neutral" : ok ? "valid" : "invalid";
        return (
          <li
            key={rule.id}
            className={`flex items-center gap-2 text-xs ${
              state === "valid"
                ? "text-signal"
                : state === "invalid"
                  ? "text-destructive"
                  : "text-muted-foreground"
            }`}
          >
            {state === "valid" ? (
              <Check className="size-3.5" aria-hidden />
            ) : state === "invalid" ? (
              <X className="size-3.5" aria-hidden />
            ) : (
              <Circle className="size-3.5" aria-hidden />
            )}
            {rule.label}
          </li>
        );
      })}
    </ul>
  );
}
