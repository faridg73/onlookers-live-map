// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import {
  callerAddress,
  RATE_LIMITED_MESSAGE,
  RATE_LIMITS,
  withinRateLimit,
} from "@/lib/rate-limit.server";

/**
 * Throttles sign-in and sign-up attempts before they reach the accounts
 * service, so a script cannot grind through passwords for an email address.
 * Counted per address and per email, and fails open if the counter is down.
 */
export const checkAuthAttempt = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        email: z.string().trim().toLowerCase().max(255).optional(),
        mode: z.enum(["signin", "signup", "reset"]).default("signin"),
      })
      .parse(data),
  )
  .handler(async ({ data }): Promise<{ ok: boolean; error?: string }> => {
    const address = callerAddress();
    const perAddress = await withinRateLimit(RATE_LIMITS.auth, `${data.mode}:${address}`);
    const perEmail = data.email
      ? await withinRateLimit(RATE_LIMITS.auth, `${data.mode}:email:${data.email}`)
      : true;

    if (!perAddress || !perEmail) {
      return { ok: false, error: RATE_LIMITED_MESSAGE };
    }
    return { ok: true };
  });
