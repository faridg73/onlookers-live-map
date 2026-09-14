/** Server-only geofenced alert dispatch for brand new credit bounties. */

const GATEWAY_URL = "https://connector-gateway.lovable.dev/firebase_messaging";
const SITE_URL = "https://onlookerlive.com";

/** How far around the venue pin we wake up onlookers (1.5 miles ≈ 2.4 km). */
export const GEOFENCE_RADIUS_MILES = 1.5;

/** Widest ring we ever consider, before each person's own alert distance applies. */
export const OUTER_RADIUS_MILES = 25;

/** The 20% platform cut, matching the credit ledger. */
export const CREDIT_FEE_RATE = 0.2;

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

/**
 * Sends one high-urgency push per device token, if push delivery is configured.
 * Flash-priority alerts are marked time-sensitive so they break through Focus
 * modes and stay pinned on the lock screen until the person acts on them.
 */
async function sendPush(
  tokens: string[],
  payload: { title: string; body: string; path: string; flash?: boolean },
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
            data: {
              path: payload.path,
              urgency: payload.flash ? "flash" : "high",
              // Consumed by the native shell to start a lock-screen Live Activity.
              live_activity: payload.flash ? "bounty_flash" : "bounty_nearby",
            },
            android: {
              priority: "HIGH",
              notification: {
                channel_id: payload.flash ? "bounties_flash" : "bounties",
                visibility: "PUBLIC",
                sticky: Boolean(payload.flash),
                notification_priority: "PRIORITY_MAX",
                tag: payload.flash ? "bounty_flash" : "bounty_nearby",
              },
            },
            apns: {
              headers: {
                "apns-priority": "10",
                ...(payload.flash ? { "apns-push-type": "alert" } : {}),
              },
              payload: {
                aps: {
                  sound: "default",
                  "interruption-level": payload.flash ? "time-sensitive" : "active",
                  "relevance-score": payload.flash ? 1 : 0.5,
                },
              },
            },
            webpush: {
              headers: { Urgency: "high" },
              notification: { requireInteraction: Boolean(payload.flash) },
              fcm_options: { link: `${SITE_URL}${payload.path}` },
            },
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
    .select(
      "id, prompt, category, bounty_amount, latitude, longitude, location_name, bounty_tier, bounty_type, duration_minutes",
    )
    .eq("id", requestId)
    .maybeSingle();
  if (!request) return { nearby: 0, pushed: 0 };

  const gross = Math.round(Number(request.bounty_amount ?? 0));
  if (!(gross > 0)) return { nearby: 0, pushed: 0 };

  const net = gross - Math.floor(gross * CREDIT_FEE_RATE);

  // Cast the wide net once, then keep only the people whose own alert distance
  // covers this pin — someone set to 2 miles never hears about a 20-mile pin.
  const { data: nearby, error } = await supabaseAdmin.rpc("onlookers_within_radius", {
    _latitude: Number(request.latitude),
    _longitude: Number(request.longitude),
    _radius_miles: OUTER_RADIUS_MILES,
    _exclude_user_id: requesterId,
  });
  if (error) {
    console.error("[geo-alert] radius lookup failed", error.message);
    return { nearby: 0, pushed: 0 };
  }

  const candidates = (nearby ?? []).filter((row) => row.user_id !== requesterId);
  if (candidates.length === 0) return { nearby: 0, pushed: 0 };

  const { data: prefs } = await supabaseAdmin
    .from("alert_preferences")
    .select("user_id, radius_miles")
    .in(
      "user_id",
      candidates.map((row) => row.user_id),
    );
  const radiusOf = new Map<string, number>(
    (prefs ?? []).map((row) => [row.user_id, Number(row.radius_miles)]),
  );

  const matched = candidates.filter(
    (row) => Number(row.distance_miles) <= (radiusOf.get(row.user_id) ?? GEOFENCE_RADIUS_MILES),
  );
  if (matched.length === 0) return { nearby: 0, pushed: 0 };

  // Verified broadcasters near the pin hear about it first.
  const { data: verified } = await supabaseAdmin
    .from("profiles")
    .select("id, is_verified")
    .in(
      "id",
      matched.map((row) => row.user_id),
    );
  const isVerified = new Set(
    (verified ?? []).filter((row) => row.is_verified).map((row) => row.id),
  );

  const userIds = matched
    .sort((a, b) => {
      const rank = Number(isVerified.has(b.user_id)) - Number(isVerified.has(a.user_id));
      if (rank !== 0) return rank;
      return Number(a.distance_miles) - Number(b.distance_miles);
    })
    .map((row) => row.user_id);

  // Paid live-stream bounties and the premium tiers get the flash treatment:
  // a pinned, time-sensitive lock-screen alert that names the spot to go to.
  const spot = (request.location_name ?? "").trim();
  const liveNow = (request.bounty_type ?? "live_stream") === "live_stream";
  const premiumTier = request.bounty_tier === "fast_catch" || request.bounty_tier === "priority_hunt";
  const flash = liveNow && (premiumTier || gross >= 80);
  const where = spot || "a spot near you";
  const title = flash
    ? `⚡ Bounty Alert: ${where}`
    : `Bounty Alert: ${where}`;
  const minutes = Number(request.duration_minutes ?? 0);
  const ask = liveNow
    ? `Start a ${minutes > 0 ? `${minutes}-minute ` : ""}live stream of the ${readableCategory(
        request.category,
        request.prompt,
      )}`
    : `Film the ${readableCategory(request.category, request.prompt)}`;
  const body = `${ask} — ${net} Credits are already locked in escrow and pay out once your stream is verified.`;
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
    { title, body, path, flash },
  );

  console.log("[geo-alert] dispatched", { requestId, nearby: userIds.length, pushed });
  return { nearby: userIds.length, pushed };
}
