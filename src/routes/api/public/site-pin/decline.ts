// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import { createFileRoute } from "@tanstack/react-router";

/**
 * Decline endpoint for a property contact who never authorized the visit.
 *
 * The agent has no Onlooker account: they act on the one-time link inside the
 * PIN text or email. The link's opaque token is the only credential, so the
 * database function validates it, cancels the bounty, refunds the poster and
 * pays the onlooker a trip fee when they had already claimed it.
 */
export const Route = createFileRoute("/api/public/site-pin/decline")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return Response.json({ error: "Invalid request." }, { status: 400 });
        }

        const payload = (body ?? {}) as { token?: unknown; note?: unknown };
        const token = typeof payload.token === "string" ? payload.token.trim() : "";
        const note = typeof payload.note === "string" ? payload.note.slice(0, 1000) : "";
        if (token.length < 16 || token.length > 128 || !/^[A-Za-z0-9_-]+$/.test(token)) {
          return Response.json({ error: "This link is not valid." }, { status: 400 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin.rpc("decline_site_pin_authorization", {
          _token: token,
          _note: note,
        });
        if (error) {
          console.error("[site-pin] decline failed", error.message);
          return Response.json({ error: error.message }, { status: 400 });
        }

        const result = (data ?? {}) as { already?: boolean };
        return Response.json({ ok: true, already: Boolean(result.already) });
      },
    },
  },
});
