// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
/**
 * Receives SMS delivery status events (delivered, failed, etc.) from the
 * texting provider. Secured by a random token embedded in the webhook URL,
 * which is only ever configured in the provider's own dashboard — treat the
 * full URL as a shared secret. Each verified event is logged to
 * sms_delivery_events for later reconciliation with the PIN/SMS flows.
 */
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const TOKEN_RE = /^[A-Za-z0-9_-]{16,128}$/;

const eventSchema = z
  .object({
    // Accept the common field spellings providers use; extras pass through
    // into the raw payload log.
    messageId: z.string().max(200).optional(),
    message_id: z.string().max(200).optional(),
    sid: z.string().max(200).optional(),
    id: z.union([z.string().max(200), z.number()]).optional(),
    status: z.string().max(60).optional(),
    messageStatus: z.string().max(60).optional(),
    to: z.string().max(40).optional(),
    recipient: z.string().max(40).optional(),
    errorCode: z.union([z.string().max(40), z.number()]).optional(),
    error_code: z.union([z.string().max(40), z.number()]).optional(),
    errorMessage: z.string().max(500).optional(),
    error_message: z.string().max(500).optional(),
  })
  .passthrough();

async function parseBody(request: Request): Promise<Record<string, unknown>> {
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/x-www-form-urlencoded")) {
    const text = await request.text();
    return Object.fromEntries(new URLSearchParams(text));
  }
  const text = await request.text();
  try {
    const parsed = JSON.parse(text) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    return { raw: text.slice(0, 4000) };
  } catch {
    return { raw: text.slice(0, 4000) };
  }
}

export const Route = createFileRoute("/api/public/webhooks/signalhouse")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const expectedToken = process.env["SIGNALHOUSE_WEBHOOK_TOKEN"];
        const url = new URL(request.url);
        const providedToken = url.searchParams.get("token") ?? "";
        if (
          !expectedToken ||
          !TOKEN_RE.test(providedToken) ||
          providedToken !== expectedToken
        ) {
          return new Response("Invalid token", { status: 401 });
        }

        const body = await parseBody(request);
        const parsed = eventSchema.safeParse(body);
        if (!parsed.success) {
          return new Response("Invalid payload", { status: 400 });
        }
        const event = parsed.data;

        const messageId =
          event.messageId ?? event.message_id ?? event.sid ?? (event.id != null ? String(event.id) : null);
        const status = event.status ?? event.messageStatus ?? null;
        const recipient = event.to ?? event.recipient ?? null;
        const errorCode =
          event.errorCode != null ? String(event.errorCode)
            : event.error_code != null ? String(event.error_code)
            : null;
        const errorMessage = event.errorMessage ?? event.error_message ?? null;

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { error } = await supabaseAdmin.from("sms_delivery_events").insert({
          provider: "signalhouse",
          message_id: messageId,
          status,
          recipient,
          error_code: errorCode,
          error_message: errorMessage,
          payload: JSON.parse(JSON.stringify(body)) as never,
        });
        if (error) {
          console.error("[signalhouse webhook] insert failed", error);
          return new Response("Log failed", { status: 500 });
        }

        return Response.json({ ok: true });
      },
    },
  },
});
