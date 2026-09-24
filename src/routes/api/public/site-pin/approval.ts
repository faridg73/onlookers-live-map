// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import { createFileRoute } from "@tanstack/react-router";

/**
 * Account-free approval endpoint for the property contact. The one-hour token
 * in their text/email is the only credential; the database validates it.
 * GET ?t= returns who checked in; POST { token, approve, note } records the decision.
 */
function validToken(t: unknown): string | null {
  const token = typeof t === "string" ? t.trim() : "";
  return token.length >= 32 && token.length <= 128 && /^[A-Za-z0-9]+$/.test(token) ? token : null;
}

export const Route = createFileRoute("/api/public/site-pin/approval")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const token = validToken(new URL(request.url).searchParams.get("t"));
        if (!token) return Response.json({ error: "This link is not valid." }, { status: 400 });
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin.rpc("site_approval_lookup", { _token: token });
        if (error) return Response.json({ error: error.message }, { status: 400 });
        return Response.json(data, { headers: { "Cache-Control": "no-store" } });
      },
      POST: async ({ request }) => {
        let body: { token?: unknown; approve?: unknown; note?: unknown } = {};
        try {
          body = await request.json();
        } catch {
          return Response.json({ error: "Invalid request." }, { status: 400 });
        }
        const token = validToken(body.token);
        if (!token || typeof body.approve !== "boolean") {
          return Response.json({ error: "This link is not valid." }, { status: 400 });
        }
        const note = typeof body.note === "string" ? body.note.slice(0, 1000) : "";
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin.rpc("site_approval_decide", {
          _token: token,
          _approve: body.approve,
          _note: note,
        });
        if (error) return Response.json({ error: error.message }, { status: 400 });
        return Response.json(data);
      },
    },
  },
});
