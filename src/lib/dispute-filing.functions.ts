// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { attachSupabaseAuth } from "@/lib/auth-attacher";

const fileSchema = z
  .object({
    storagePath: z.string().regex(/^[A-Za-z0-9._/-]+$/).max(300),
    fileName: z.string().trim().min(1).max(180),
    fileType: z.enum([
      "image/jpeg",
      "image/png",
      "image/webp",
      "video/mp4",
      "video/quicktime",
      "video/webm",
      "application/pdf",
    ]),
    fileSize: z.number().int().min(1).max(20 * 1024 * 1024),
  })
  .nullable();

const filingSchema = z.object({
  requestId: z.string().uuid(),
  reasonCode: z.enum([
    "failure_to_deliver",
    "quality_issue",
    "verification_mismatch",
    "conditions_mismatch",
  ]),
  description: z.string().trim().min(10).max(3000),
  file: fileSchema,
});

export type EligibleDisputeBounty = {
  requestId: string;
  prompt: string;
  locationName: string;
  amount: number;
  submittedAt: string;
  reviewEndsAt: string | null;
};

type RpcResult<T> = Promise<{ data: T | null; error: { message: string } | null }>;
type RpcClient = {
  rpc: (name: string, args?: Record<string, unknown>) => RpcResult<unknown>;
};

export const listEligibleDisputeBounties = createServerFn({ method: "GET" })
  .middleware([attachSupabaseAuth, requireSupabaseAuth])
  .handler(async ({ context }): Promise<EligibleDisputeBounty[]> => {
    const client = context.supabase as unknown as RpcClient;
    const { data, error } = await client.rpc("list_eligible_dispute_bounties");
    if (error) throw new Error(error.message);
    if (!Array.isArray(data)) return [];

    return data.map((row) => {
      const value = row as Record<string, unknown>;
      return {
        requestId: String(value["request_id"]),
        prompt: String(value["prompt"]),
        locationName: String(value["location_name"]),
        amount: Number(value["amount"]),
        submittedAt: String(value["submitted_at"]),
        reviewEndsAt: value["review_ends_at"] ? String(value["review_ends_at"]) : null,
      };
    });
  });

export type EligibleConditionsBounty = EligibleDisputeBounty & {
  declaredMultiplier: number;
};

/** Bounties the signed-in onlooker is working, for raising a conditions review. */
export const listEligibleConditionsDisputes = createServerFn({ method: "GET" })
  .middleware([attachSupabaseAuth, requireSupabaseAuth])
  .handler(async ({ context }): Promise<EligibleConditionsBounty[]> => {
    const client = context.supabase as unknown as RpcClient;
    const { data, error } = await client.rpc("list_eligible_conditions_disputes");
    if (error) throw new Error(error.message);
    if (!Array.isArray(data)) return [];

    return data.map((row) => {
      const value = row as Record<string, unknown>;
      return {
        requestId: String(value["request_id"]),
        prompt: String(value["prompt"]),
        locationName: String(value["location_name"]),
        amount: Number(value["amount"]),
        declaredMultiplier: Number(value["declared_multiplier"] ?? 1),
        submittedAt: String(value["submitted_at"]),
        reviewEndsAt: value["review_ends_at"] ? String(value["review_ends_at"]) : null,
      };
    });
  });

export const openDisputeWithEvidence = createServerFn({ method: "POST" })
  .middleware([attachSupabaseAuth, requireSupabaseAuth])
  .inputValidator((input: z.input<typeof filingSchema>) => filingSchema.parse(input))
  .handler(async ({ data, context }) => {
    if (data.file && !data.file.storagePath.startsWith(`${context.userId}/${data.requestId}/`)) {
      throw new Error("That evidence file does not belong to this bounty.");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const client = supabaseAdmin as unknown as RpcClient;
    const { error } = await client.rpc("open_dispute_with_evidence", {
      _user_id: context.userId,
      _request_id: data.requestId,
      _reason_code: data.reasonCode,
      _description: data.description,
      _storage_path: data.file?.storagePath ?? null,
      _file_name: data.file?.fileName ?? null,
      _file_type: data.file?.fileType ?? null,
      _file_size: data.file?.fileSize ?? null,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });