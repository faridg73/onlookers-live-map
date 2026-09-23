// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import { useMemo } from "react";
import { ShieldAlert, ShieldCheck } from "lucide-react";
import { checkPasswordStrength } from "@/lib/password-strength";

const BAR_COLORS = ["bg-destructive", "bg-destructive", "bg-amber-500", "bg-signal", "bg-signal"];

/** Live password strength meter shown under the signup password field. */
export function PasswordStrengthMeter({ password, email }: { password: string; email: string }) {
  const strength = useMemo(
    () => (password ? checkPasswordStrength(password, email) : null),
    [password, email],
  );
  if (!strength) return null;

  const strong = strength.score >= 3;
  const Icon = strong ? ShieldCheck : ShieldAlert;

  return (
    <div className="rounded-2xl border border-border bg-surface px-4 py-3" aria-live="polite">
      <div className="flex items-center gap-2">
        <div className="flex flex-1 gap-1">
          {[0, 1, 2, 3].map((i) => (
            <span
              key={i}
              className={`h-1.5 flex-1 rounded-full ${
                i < strength.score ? BAR_COLORS[strength.score] : "bg-border"
              }`}
            />
          ))}
        </div>
        <span
          className={`flex items-center gap-1 text-xs font-semibold ${
            strong ? "text-signal" : strength.score <= 1 ? "text-destructive" : "text-muted-foreground"
          }`}
        >
          <Icon className="size-3.5" />
          {strength.label}
        </span>
      </div>
      {strength.warnings.length > 0 ? (
        <ul className="mt-2 space-y-1 text-xs text-destructive">
          {strength.warnings.map((w) => (
            <li key={w}>• {w}</li>
          ))}
        </ul>
      ) : null}
      {strength.suggestions.length > 0 ? (
        <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
          {strength.suggestions.map((s) => (
            <li key={s}>• {s}</li>
          ))}
        </ul>
      ) : null}
      <p className="mt-2 text-[0.7rem] text-muted-foreground">
        Protecting your account matters — you'll be linking this to real payments. Passwords found
        in known data breaches are rejected automatically.
      </p>
    </div>
  );
}
