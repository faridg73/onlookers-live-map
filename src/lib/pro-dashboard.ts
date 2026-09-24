// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import type { ProVisitBooking } from "@/lib/pro-visits.functions";

export type ProVisitView = "draft" | "scheduled" | "progress" | "completed";

export function proVisitView(row: ProVisitBooking): ProVisitView {
  if (row.bookingStatus === "draft") return "draft";
  if (row.bookingStatus === "cancelled" || row.requestStatus === "completed" || row.requestStatus === "expired") return "completed";
  if (row.requestStatus === "claimed" || (row.submissionCount ?? 0) > 0 || row.escrowStatus === "disputed") return "progress";
  return "scheduled";
}

export function planLimit(plan: string): number | null {
  if (plan === "starter") return 5;
  if (plan === "pro") return 20;
  if (plan === "team") return null;
  return 0;
}

export function remainingVisits(plan: string, used: number): number | null {
  const limit = planLimit(plan);
  return limit === null ? null : Math.max(0, limit - used);
}

export function escrowLabel(status: string | null, amount: number, payout: number) {
  if (payout > 0) return "Paid out";
  if (status === "refunded") return "Returned";
  if (["held", "reserved", "submitted", "disputed"].includes(status ?? "")) return `${Math.round(amount)} Cr held`;
  return "No escrow";
}