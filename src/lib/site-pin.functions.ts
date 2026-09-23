// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Resends a property bounty's 6-digit on-site PIN to the agent, by text and/or
 * email. The PIN itself never reaches the caller's browser: the database gate
 * (`authorize_site_pin_resend`) decides whether this person may trigger a
 * resend, and the delivery happens entirely server side.
 */
export const resendSitePin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { requestId: string }) =>
    z.object({ requestId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error: gateError } = await context.supabase.rpc("authorize_site_pin_resend", {
      _request_id: data.requestId,
    });
    if (gateError) throw new Error(gateError.message);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: pinRow, error: readError } = await supabaseAdmin
      .from("request_site_pins")
      .select("pin, agent_name, agent_phone, agent_email, decline_token, send_count")
      .eq("request_id", data.requestId)
      .maybeSingle();
    if (readError || !pinRow) throw new Error("Couldn't load this bounty's on-site PIN.");

    const phone = (pinRow.agent_phone ?? "").trim();
    const email = (pinRow.agent_email ?? "").trim();
    if (!phone && !email) {
      throw new Error(
        "No phone number or email was saved for the property contact, so there is nothing to resend.",
      );
    }

    const { data: request } = await supabaseAdmin
      .from("requests")
      .select("location_name")
      .eq("id", data.requestId)
      .maybeSingle();

    const { sendAgentPin } = await import("@/lib/agent-pin.server");
    const delivery = await sendAgentPin(
      { name: pinRow.agent_name ?? "", phone, email },
      {
        pin: pinRow.pin,
        requestId: data.requestId,
        locationName: request?.location_name ?? "the property",
        declineToken: pinRow.decline_token ?? null,
      },
    );

    if (!delivery.sms && !delivery.email) {
      throw new Error(
        delivery.smsError ?? delivery.emailError ?? "The PIN could not be delivered. Try again shortly.",
      );
    }

    return {
      sms: delivery.sms,
      email: delivery.email,
      smsError: delivery.smsError ?? null,
      emailError: delivery.emailError ?? null,
      sendCount: pinRow.send_count ?? 1,
    };
  });
