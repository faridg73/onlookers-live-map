// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import { supabase } from "@/integrations/supabase/client";
import { PLATFORM_FEE_RATE } from "@/lib/credits";

/** Per-minute rates a viewer can pick when joining a live session. */
export const STREAM_RATES = [2, 4, 8] as const;
export const DEFAULT_STREAM_RATE = 4;

/** What the host keeps out of each charged minute. */
export function hostShare(creditsPerMinute: number) {
  return creditsPerMinute - Math.floor(creditsPerMinute * PLATFORM_FEE_RATE);
}

export type StreamMeter = {
  minutesBilled: number;
  creditsSpent: number;
  hostEarned: number;
};

/** Opens a paid session with a host. The first minute is charged right away. */
export async function startStreamSession(input: {
  hostId: string;
  creditsPerMinute?: number;
  postId?: string | null;
}): Promise<string> {
  const { data, error } = await supabase.rpc("start_stream_session", {
    _host_id: input.hostId,
    _credits_per_minute: input.creditsPerMinute ?? DEFAULT_STREAM_RATE,
    ...(input.postId ? { _post_id: input.postId } : {}),
  });
  if (error) throw new Error(error.message);
  return data as unknown as string;
}

/** Charges the viewer one minute and pays the host their share. */
export async function billStreamMinute(sessionId: string): Promise<StreamMeter> {
  const { data, error } = await supabase.rpc("bill_stream_minute", { _session_id: sessionId });
  if (error) {
    if (/insufficient credits/i.test(error.message)) throw new Error("Insufficient Credits");
    if (/minutes_billed.*ambiguous/i.test(error.message)) {
      throw new Error("The live meter could not update. End this session and try again.");
    }
    throw new Error(error.message);
  }
  const row = (Array.isArray(data) ? data[0] : data) as
    | { minutes_billed: number; credits_spent: number; host_earned: number }
    | undefined;
  return {
    minutesBilled: Number(row?.minutes_billed ?? 0),
    creditsSpent: Number(row?.credits_spent ?? 0),
    hostEarned: Number(row?.host_earned ?? 0),
  };
}

export async function endStreamSession(sessionId: string) {
  const { error } = await supabase.rpc("end_stream_session", { _session_id: sessionId });
  if (error) throw new Error(error.message);
}
