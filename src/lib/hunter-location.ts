import { supabase } from "@/integrations/supabase/client";

/**
 * Stores the signed-in person's last known map position so they can be alerted
 * when a new bounty is posted within five miles of them.
 */
export async function saveMyLocation(latitude: number, longitude: number) {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return;
  await supabase
    .from("hunter_locations")
    .upsert({ user_id: auth.user.id, latitude, longitude }, { onConflict: "user_id" });
}
