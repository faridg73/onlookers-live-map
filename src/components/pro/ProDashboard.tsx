// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Building2, CalendarClock, Camera, ChevronRight, CircleDollarSign, Clock, Loader2, Lock, MapPin, RefreshCw, UserRound } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

import { BountyVideoDialog } from "@/components/BountyVideoDialog";
import { DeadlineNote } from "@/components/DeadlineNote";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { refundBounty } from "@/lib/bounty-escrow";
import { formatCredits } from "@/lib/credits";
import { escrowLabel, planLimit, proVisitView, remainingVisits, type ProVisitView } from "@/lib/pro-dashboard";
import { PRO_ROLES, PRO_VISIT_DRAFT_KEY, proPlanById, type ProVisitDraft } from "@/lib/pro-plans";
import { getMyProDashboard, type ProVisitBooking } from "@/lib/pro-visits.functions";
import type { LiveRequest } from "@/lib/onlooker";

const QUERY_KEY = ["pro-dashboard"] as const;
const VIEWS: Array<{ id: ProVisitView; label: string }> = [
  { id: "draft", label: "Needs confirmation" }, { id: "scheduled", label: "Scheduled" },
  { id: "progress", label: "In progress" }, { id: "completed", label: "Completed" },
];

function asLiveRequest(row: ProVisitBooking): LiveRequest {
  return { id: `db-${row.requestId}`, dbId: row.requestId ?? undefined, title: row.purpose, place: row.address,
    note: row.purpose, instructions: row.purpose, bounty: row.bountyAmount ?? 0,
    status: row.requestStatus === "completed" ? "fulfilled" : row.requestStatus === "expired" ? "expired" : "open",
    minutesAgo: 0, watchers: 1, responses: row.submissionCount ?? 0, expiresInMin: 0,
    expiresAt: row.requestExpiresAt ? Date.parse(row.requestExpiresAt) : Date.now(), requester: "you", x: 500, y: 500 } as LiveRequest;
}

export function ProDashboard() {
  const fetchDashboard = useServerFn(getMyProDashboard);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [view, setView] = useState<ProVisitView>("scheduled");
  const query = useQuery({ queryKey: QUERY_KEY, queryFn: () => fetchDashboard(), staleTime: 15_000 });
  const data = query.data;

  useEffect(() => {
    const refresh = () => void queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    const channel = supabase.channel(`pro-dashboard-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "pro_visit_bookings" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "requests" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "escrows" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "claims" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "bounty_videos" }, refresh)
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [queryClient]);

  const cancelMutation = useMutation({
    mutationFn: (id: string) => refundBounty(id),
    onSuccess: async () => { toast.success("Bounty cancelled and escrow returned."); await queryClient.invalidateQueries({ queryKey: QUERY_KEY }); },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Could not cancel that bounty."),
  });

  const rows = data?.bookings ?? [];
  const visible = rows.filter((row) => proVisitView(row) === view);
  const totals = useMemo(() => ({
    active: rows.filter((r) => ["scheduled", "progress"].includes(proVisitView(r))).length,
    review: rows.filter((r) => (r.submissionCount ?? 0) > 0 && r.requestStatus !== "completed").length,
    held: rows.reduce((sum, r) => ["held", "reserved", "submitted", "disputed"].includes(r.escrowStatus ?? "") ? sum + (r.escrowAmount ?? 0) : sum, 0),
    paid: rows.reduce((sum, r) => sum + (r.payoutAmount ?? 0), 0),
  }), [rows]);

  const resume = (row: ProVisitBooking) => {
    const draft: ProVisitDraft = { bookingId: row.id, address: row.address, purpose: row.purpose, startAt: row.scheduledStartAt,
      agentName: row.contactName, agentPhone: row.contactPhone, agentEmail: row.contactEmail };
    sessionStorage.setItem(PRO_VISIT_DRAFT_KEY, JSON.stringify(draft));
    void navigate({ to: "/post", search: { mode: "bounty" } });
  };

  if (query.isPending) return <div className="grid min-h-[50vh] place-items-center"><Loader2 className="size-6 animate-spin text-signal" aria-label="Loading Pro Dashboard" /></div>;
  if (query.isError) return <div role="alert" className="rounded-lg border border-destructive/40 bg-card p-6 text-center"><p className="text-sm text-foreground">The Pro Dashboard could not load.</p><Button variant="outline" className="mt-4" onClick={() => void query.refetch()}><RefreshCw className="size-4" /> Try again</Button></div>;
  if (!data?.account) return <div className="rounded-lg border border-border bg-card p-6 text-center"><Building2 className="mx-auto size-7 text-signal" /><h2 className="mt-3 text-lg font-bold">Create your professional account</h2><p className="mt-2 text-sm text-muted-foreground">Register as an agent, property manager, or builder before using the dashboard.</p><Button asChild className="mt-4 bg-signal text-signal-foreground"><Link to="/verification" hash="pro-signup">Get started</Link></Button></div>;

  const plan = proPlanById(data.account.plan); const limit = planLimit(data.account.plan); const remaining = remainingVisits(data.account.plan, data.account.visitsUsed);
  const role = PRO_ROLES.find((item) => item.id === data.account?.role)?.label ?? "Property professional";
  return <>
    <section className="border-b border-border pb-6">
      <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase text-signal">{role}</p><h1 className="mt-1 font-display text-3xl text-foreground">{data.account.company}</h1><p className="mt-1 text-sm text-muted-foreground">Verified visits, bounties, and escrow in one place.</p></div><Button asChild className="bg-signal font-bold text-signal-foreground"><Link to="/verification" hash="request-visit">Schedule visit</Link></Button></div>
      <div className="mt-5 grid gap-3 sm:grid-cols-[1.4fr_1fr]">
        <div className="rounded-lg border border-signal/40 bg-card p-4"><div className="flex items-center justify-between"><div><p className="text-xs uppercase text-muted-foreground">Active subscription</p><p className="mt-1 text-xl font-bold text-foreground">{plan?.name ?? "No plan"}</p></div><span className="rounded-full bg-signal px-3 py-1 text-xs font-bold text-signal-foreground">{plan ? `$${plan.priceCents / 100}/mo` : "Inactive"}</span></div><Button asChild variant="outline" className="mt-4 h-9"><Link to="/verification" hash="pro-pricing">Manage plan</Link></Button></div>
        <div className="rounded-lg border border-border bg-card p-4"><p className="text-xs uppercase text-muted-foreground">Monthly usage</p><div className="mt-2 flex items-end justify-between"><p className="text-2xl font-bold text-foreground">{remaining === null ? "Unlimited" : `${remaining} left`}</p><p className="text-xs text-muted-foreground">{data.account.visitsUsed}{limit === null ? " used" : ` / ${limit}`}</p></div>{limit !== null && limit > 0 && <div className="mt-3 h-2 overflow-hidden rounded-full bg-secondary"><div className="h-full bg-signal" style={{ width: `${Math.min(100, (data.account.visitsUsed / limit) * 100)}%` }} /></div>}</div>
      </div>
    </section>
    <section className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4">{[
      [CalendarClock, "Active visits", totals.active], [Camera, "Needs review", totals.review], [Lock, "In escrow", formatCredits(totals.held)], [CircleDollarSign, "Paid out", formatCredits(totals.paid)],
    ].map(([Icon, label, value]) => { const I = Icon as typeof CalendarClock; return <div key={String(label)} className="rounded-lg border border-border bg-surface p-3"><I className="size-4 text-signal"/><p className="mt-2 font-display text-xl text-foreground">{String(value)}</p><p className="text-xs text-muted-foreground">{String(label)}</p></div>; })}</section>
    <section className="mt-8"><div className="flex items-end justify-between gap-3"><div><h2 className="font-display text-xl text-foreground">Visit pipeline</h2><p className="text-sm text-muted-foreground">Track every scheduled property visit from setup to settlement.</p></div><Button variant="ghost" size="icon" aria-label="Refresh dashboard" onClick={() => void query.refetch()}><RefreshCw className={`size-4 ${query.isFetching ? "animate-spin" : ""}`} /></Button></div>
      <div role="tablist" aria-label="Visit states" className="mt-4 grid grid-cols-2 gap-1 rounded-lg bg-secondary p-1 sm:grid-cols-4">{VIEWS.map((item) => { const count=rows.filter((r)=>proVisitView(r)===item.id).length; return <Button key={item.id} variant={view===item.id?"default":"ghost"} className={view===item.id?"bg-signal text-signal-foreground":"text-muted-foreground"} onClick={()=>setView(item.id)}>{item.label} {count > 0 && <span>{count}</span>}</Button>; })}</div>
      <div className="mt-4 space-y-3">{visible.length===0 ? <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">No visits in this stage.</div> : visible.map((row)=><VisitRow key={row.id} row={row} onResume={()=>resume(row)} onCancel={()=>row.requestId && cancelMutation.mutate(row.requestId)} cancelling={cancelMutation.isPending}/>)}</div>
    </section>
  </>;
}

function VisitRow({ row, onResume, onCancel, cancelling }: { row: ProVisitBooking; onResume: () => void; onCancel: () => void; cancelling: boolean }) {
  const stage=proVisitView(row); const deadline=row.autoReleaseAt ?? row.reservedUntil ?? row.requestExpiresAt;
  return <article className="rounded-lg border border-border bg-card p-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><h3 className="line-clamp-2 font-semibold text-foreground">{row.purpose}</h3><p className="mt-1 flex items-start gap-2 text-sm text-muted-foreground"><MapPin className="mt-0.5 size-4 shrink-0 text-signal"/>{row.address}</p></div><span className="shrink-0 text-xs font-bold uppercase text-signal">{VIEWS.find((v)=>v.id===stage)?.label}</span></div>
    <div className="mt-4 grid gap-2 text-xs text-muted-foreground sm:grid-cols-3"><p className="flex items-center gap-2"><CalendarClock className="size-4"/>{row.scheduledStartAt?format(new Date(row.scheduledStartAt),"MMM d, h:mm a"):"Time not set"}</p><p className="flex items-center gap-2"><UserRound className="size-4"/>{row.contactName}</p><p className="flex items-center gap-2"><Lock className="size-4"/>{escrowLabel(row.escrowStatus ?? null,row.escrowAmount ?? 0,row.payoutAmount ?? 0)}</p></div>
    {deadline && ["scheduled","progress"].includes(stage) && <DeadlineNote className="mt-3" deadline={deadline} prefix={row.submissionCount?"Approves in":"Updates in"} passed="Updating now"/>}
    <div className="mt-4 flex flex-wrap items-center justify-end gap-2 border-t border-border pt-3">{stage==="draft" && <Button onClick={onResume} className="bg-signal text-signal-foreground">Continue setup <ChevronRight className="size-4"/></Button>}{row.requestId && <Button asChild variant="outline"><Link to="/b/$id" params={{id:row.requestId}}>View bounty</Link></Button>}{row.requestId && row.submissionCount !== undefined && <BountyVideoDialog request={asLiveRequest(row)}><Button variant={row.submissionCount>0?"default":"outline"} className={row.submissionCount>0?"bg-signal text-signal-foreground":""}><Camera className="size-4"/>{row.submissionCount>0?`Review footage (${row.submissionCount})`:"Footage"}</Button></BountyVideoDialog>}{row.requestId && row.requestStatus==="open" && <Button variant="outline" disabled={cancelling} onClick={onCancel}>{cancelling?<Loader2 className="size-4 animate-spin"/>:<Clock className="size-4"/>} Cancel</Button>}</div>
  </article>;
}