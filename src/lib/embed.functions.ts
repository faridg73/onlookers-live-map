import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/integrations/supabase/types";

export type EmbedMarker = {
  id: string;
  locationName: string;
  category: string;
  bounty: number;
  latitude: number;
  longitude: number;
  expiresAt: string;
};

/**
 * Active Onlooker feeds for the public embed, read with the publishable key so
 * a news site's readers see it without signing in. Coordinates are the same
 * approximate ones the public map shows — never an exact person's position.
 */
export const listEmbedMarkers = createServerFn({ method: "GET" }).handler(
  async (): Promise<EmbedMarker[]> => {
    const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
    const client = createClient<Database>(process.env["SUPABASE_URL"]!, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        fetch: (input, init) => {
          const headers = new Headers(init?.headers);
          if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) {
            headers.delete("Authorization");
          }
          headers.set("apikey", key);
          return fetch(input, { ...init, headers });
        },
      },
    });

    const { data, error } = await client.rpc("public_request_markers");
    if (error) return [];
    return (data ?? []).slice(0, 60).map((row) => ({
      id: row.id,
      locationName: row.location_name,
      category: row.category,
      bounty: Number(row.bounty_amount),
      latitude: Number(row.approx_latitude),
      longitude: Number(row.approx_longitude),
      expiresAt: row.expires_at,
    }));
  },
);
