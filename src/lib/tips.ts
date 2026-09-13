import { supabase } from "@/integrations/supabase/client";

/** Standard bystander thank-you for great footage, in Looker Coins. */
export const MICRO_TIP = 5;

/** Moves a small tip from the viewer's wallet to the reporter who filmed the clip. */
export async function tipHunter(videoId: string, amount: number = MICRO_TIP): Promise<number> {
  const { data, error } = await supabase.rpc("tip_hunter", {
    _video_id: videoId,
    _amount: amount,
  });
  if (error) throw new Error(error.message);
  return Number(data ?? 0);
}
