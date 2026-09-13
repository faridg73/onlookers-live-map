/** Server-only geofenced alert dispatch for brand new coin bounties. */

const GATEWAY_URL = "https://connector-gateway.lovable.dev/firebase_messaging";
const SITE_URL = "https://onlookerlive.com";

/** How far around the venue pin we wake up onlookers (1.5 miles ≈ 2.4 km). */
export const GEOFENCE_RADIUS_MILES = 1.5;

/** The 20% platform cut, matching the coin ledger. */
export const COIN_FEE_RATE = 0.2;

const CATEGORY_COPY: Record<string, string> = {
  lines: "entry line",
  parking: "parking lot",
  merch: "Merch Truck Line",
  tailgate: "tailgate scene",
  rideshare: "rideshare pickup",
  events: "venue entrance",
};

function readableCategory(category: string | null, prompt: string): string {
  if (category && CATEGORY_COPY[category]) return CATEGORY_COPY[category]!;
  if (category) return category.replace(/[_-]+/g, " ");
  return prompt.slice(0, 60);
}

/** Sends one high-urgency push per device token, if push delivery is configured. */
async function sendPush(
  tokens: string[],
  payload: { title: string; body: string; path: string },
): Promise<number> {
  const lovableKey = process.env["LOVABLE_API_KEY"];
  const connectionKey = process.env["FIREBASE_MESSAGING_API_KEY"];
  if (!lovableKey || !connectionKey || tokens.length === 0) return 0;

  let sent = 0;
  for (const token of tokens) {
    try {
      const response = await fetch(`${GATEWAY_URL}/v1/projects/_/messages:send`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${lovableKey}`,
          "X-Connection-Api-Key": connectionKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: {
            token,
            notification: { title: payload.title, body: payload.body },
            data: { path: payload.path, urgency: "high" },
            android: { priority: "HIGH", notification: { channel_id: "bounties" } },
            apns: { headers: { "apns-priority": "10" } },
            webpush: { fcm_options: { link: `${SITE_URL}${payload.path}` } },
          },
        }),
      });
      if (!response.ok) {
        const detail = await response.text();
        console.error(`[geo-alert] push failed [${response.status}]: ${detail}`);
        if (response.status === 404 || response.status === 400) {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          await supabaseAdmin.from("push_tokens").delete().eq("token", token);
        }
        continue;
      }
      sent += 1;
    } catch (error) {
      console.error("[geo-alert] push error", error);
    }
  }
  return sent;
}

/**
 * notify_local_onlookers_of_bounty — wakes up every active onlooker whose last
 * GPS point sits within 1.5 miles of the venue pin (the requester excluded) with
 * an in-app alert and a device push that deep-links straight to the camera.
 */
export async function notifyLocalOnlookersOfBounty(
  requestId: string,
  requesterId: string,
): Promise<{ nearby: number; pushed: number }> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: request } = await supabaseAdmin
    .from("requests")
    .select("id, prompt, category, bounty_amount, latitude, longitude, location_name")
    .eq("id", requestId)
    .maybeSingle();
  if (!request) return { nearby: 0, pushed: 0 };

  const gross = Math.round(Number(request.bounty_amount ?? 0));
  if (!(gross > 0)) return { nearby: 0, pushed: 0 };

  const net = gross - Math.floor(gross * COIN_FEE_RATE);

  const { data: nearby, error } = await supabaseAdmin.rpc("onlookers_within_radius", {
    _latitude: Number(request.latitude),
    _longitude: Number(request.longitude),
    _radius_miles: GEOFENCE_RADIUS_MILES,
    _exclude_user_id: requesterId,
  });
  if (error) {
    console.error("[geo-alert] radius lookup failed", error.message);
    return { nearby: 0, pushed: 0 };
  }

  const userIds = (nearby ?? []).map((row) => row.user_id).filter((id) => id !== requesterId);
  if (userIds.length === 0) return { nearby: 0, pushed: 0 };

  const title = "🚨 New Bounty Near You!";
  const body = `Someone wants a live view of the ${readableCategory(
    request.category,
    request.prompt,
  )} outside the venue! Fulfill it right now to earn ${net} Looker Coins!`;
  const path = `/?b=${request.id}&snap=1`;

  await supabaseAdmin.from("notifications").insert(
    userIds.map((userId) => ({
      user_id: userId,
      kind: "nearby_bounty",
      request_key: request.id,
      preview: body,
    })),
  );

  const { data: tokens } = await supabaseAdmin
    .from("push_tokens")
    .select("token")
    .in("user_id", userIds);

  const pushed = await sendPush(
    (tokens ?? []).map((row) => row.token),
    { title, body, path },
  );

  console.log("[geo-alert] dispatched", { requestId, nearby: userIds.length, pushed });
  return { nearby: userIds.length, pushed };
}
