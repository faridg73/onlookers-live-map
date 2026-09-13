import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { attachSupabaseAuth } from "@/lib/auth-attacher";

const SITE_URL = "https://onlookerlive.com";

/** Straight-line distance in miles between two points. */
function milesBetween(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 3958.8 * 2 * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Texts every nearby onlooker who asked for text alerts about a brand new
 * bounty. Safe to call right after a request is created; failures are logged
 * and never block the request itself.
 */
export async function textNearbyHunters(requestId: string, skipUserId: string): Promise<number> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { sendSms } = await import("@/lib/sms.server");

  const { data: request } = await supabaseAdmin
    .from("requests")
    .select("id, prompt, location_name, category, bounty_amount, latitude, longitude")
    .eq("id", requestId)
    .maybeSingle();
  if (!request) return 0;

  const { data: prefs } = await supabaseAdmin
    .from("alert_preferences")
    .select("user_id, phone, radius_miles")
    .eq("sms_enabled", true);
  if (!prefs || prefs.length === 0) return 0;

  const candidates = prefs.filter(
    (p) => p.user_id !== skipUserId && (p.phone ?? "").trim().length > 0,
  );
  if (candidates.length === 0) return 0;

  const { data: locations } = await supabaseAdmin
    .from("hunter_locations")
    .select("user_id, latitude, longitude")
    .in(
      "user_id",
      candidates.map((p) => p.user_id),
    );

  const pin = { lat: Number(request.latitude), lng: Number(request.longitude) };
  const payout = Number(request.bounty_amount).toFixed(0);
  const category = request.category ? ` (${request.category})` : "";
  const body = `Onlooker: New bounty nearby! ${request.prompt} at ${request.location_name}${category} — $${payout}. Claim it: ${SITE_URL}/?b=${request.id}`;

  let sent = 0;
  for (const location of locations ?? []) {
    const pref = candidates.find((p) => p.user_id === location.user_id);
    if (!pref) continue;
    const radius = Number(pref.radius_miles ?? 5);
    const distance = milesBetween(pin, {
      lat: Number(location.latitude),
      lng: Number(location.longitude),
    });
    if (distance > radius) continue;

    const result = await sendSms(pref.phone ?? "", body);
    if (result.ok) sent += 1;
    else console.error(`[sms] nearby alert to ${pref.user_id} failed: ${result.error}`);
  }

  return sent;
}

/**
 * Sends a one-off confirmation text so someone can check their number works
 * before they rely on bounty alerts.
 */
export const sendTestAlertText = createServerFn({ method: "POST" })
  .middleware([attachSupabaseAuth, requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ phone: z.string().min(5).max(32) }).parse(data))
  .handler(async ({ data }): Promise<{ ok: boolean; error?: string }> => {
    const { sendSms } = await import("@/lib/sms.server");
    const result = await sendSms(
      data.phone,
      "Onlooker: your number is confirmed. You'll get a text the moment a bounty lands near you.",
    );
    return result.ok ? { ok: true } : { ok: false, error: result.error };
  });
