// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Loader2, Mail, Trash2, Users, Wallet } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { inviteTeamMember } from "@/lib/team.functions";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { formatCredits } from "@/lib/credits";

const KEY = ["team-billing"] as const;
type MemberType = "staff" | "hunter";

async function loadTeam() {
  await supabase.rpc("team_accept_invites");
  const { data: summary, error } = await supabase.rpc("team_wallet_summary");
  if (error) throw error;
  const team = Array.isArray(summary) ? summary[0] ?? null : null;
  if (!team?.is_owner) return { team, members: [], statement: [] };
  const [{ data: members }, { data: statement }] = await Promise.all([
    supabase.from("pro_team_members").select("id, email, member_type, status, joined_at").eq("team_id", team.team_id).order("created_at"),
    supabase.rpc("team_statement"),
  ]);
  return { team, members: members ?? [], statement: statement ?? [] };
}

const STATUS: Record<string, string> = {
  held: "Held", reserved: "Claimed", submitted: "In review", disputed: "Disputed", released: "Paid", refunded: "Refunded",
};

/** Team plan: one shared agency wallet paying every staff bounty, plus a preferred Onlooker roster. */
export function TeamBillingPanel({ plan, onUpgrade }: { plan: string; onUpgrade: () => void }) {
  const qc = useQueryClient();
  const sendInvite = useServerFn(inviteTeamMember);
  const q = useQuery({ queryKey: KEY, queryFn: loadTeam, staleTime: 15_000 });
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [type, setType] = useState<MemberType>("staff");
  const team = q.data?.team ?? null;

  useEffect(() => { if (team?.team_name) setName(team.team_name); }, [team?.team_name]);

  const refresh = () => qc.invalidateQueries({ queryKey: KEY });
  const onErr = (e: unknown) => toast.error(e instanceof Error ? e.message : "Something went wrong.");
  const save = useMutation({
    mutationFn: async () => { const { error } = await supabase.rpc("team_save", { _name: name }); if (error) throw error; },
    onSuccess: async () => { toast.success("Team saved."); await refresh(); }, onError: onErr,
  });
  const invite = useMutation({
    mutationFn: async () => {
      const r = await sendInvite({ data: { email, memberType: type } });
      if ("error" in r) throw new Error(r.error);
      return r;
    },
    onSuccess: async (r) => {
      toast.success(r.emailed ? `Invite emailed to ${email}` : `Added ${email}`, {
        description: r.emailed ? "They join automatically once they sign in with this email." : "We couldn't send the email — let them know to sign in with this address.",
      });
      setEmail(""); await refresh();
    }, onError: onErr,
  });
  const remove = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.rpc("team_remove_member", { _member_id: id }); if (error) throw error; },
    onSuccess: async () => { toast.success("Removed from team."); await refresh(); }, onError: onErr,
  });

  if (q.isPending) return null;

  // Staff member view: they post from the agency wallet.
  if (team && !team.is_owner) {
    return (
      <section className="mt-6 rounded-lg border border-signal/40 bg-card p-4">
        <p className="flex items-center gap-2 text-xs font-bold uppercase text-signal"><Users className="size-4" /> Team member</p>
        <h2 className="mt-1 text-lg font-bold text-foreground">{team.team_name || "Your agency"}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {team.plan_active
            ? `Your bounties are paid from the agency's shared wallet (${formatCredits(Number(team.balance))} available). Refunds go back to it.`
            : "Your agency's Team plan is not active, so bounties use your own wallet for now."}
        </p>
      </section>
    );
  }

  if (plan !== "team") {
    return (
      <section className="mt-6 rounded-lg border border-border bg-card p-4">
        <p className="flex items-center gap-2 text-xs font-bold uppercase text-muted-foreground"><Users className="size-4" /> Shared team billing</p>
        <p className="mt-2 text-sm text-muted-foreground">On the Team plan, your whole agency posts visits from one shared wallet and you get one monthly statement for every Onlooker paid.</p>
        <Button onClick={onUpgrade} variant="outline" className="mt-3 h-12 w-full rounded-xl font-bold sm:w-auto">See Team plan</Button>
      </section>
    );
  }

  const members = q.data?.members ?? [];
  const statement = q.data?.statement ?? [];
  const total = statement.filter((r) => r.status !== "refunded").reduce((s, r) => s + Number(r.amount), 0);

  return (
    <section className="mt-6 space-y-4 rounded-lg border border-signal/40 bg-card p-4">
      <div>
        <p className="flex items-center gap-2 text-xs font-bold uppercase text-signal"><Users className="size-4" /> Team billing</p>
        <p className="mt-1 text-sm text-muted-foreground">Every bounty your staff posts is paid from your wallet. Refunds come back to it.</p>
      </div>

      <form className="flex flex-col gap-2 sm:flex-row" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Agency name" maxLength={80} className="h-12" aria-label="Agency name" />
        <Button type="submit" disabled={save.isPending || !name.trim()} className="h-12 bg-signal font-bold text-signal-foreground">
          {save.isPending ? <Loader2 className="size-4 animate-spin" /> : team ? "Save name" : "Create team"}
        </Button>
      </form>

      {team && (
        <>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg border border-border bg-surface p-3"><Wallet className="size-4 text-signal" /><p className="mt-2 font-display text-xl text-foreground">{formatCredits(Number(team.balance))}</p><p className="text-xs text-muted-foreground">Shared wallet</p></div>
            <div className="rounded-lg border border-border bg-surface p-3"><Users className="size-4 text-signal" /><p className="mt-2 font-display text-xl text-foreground">{formatCredits(Number(team.spent_this_month))}</p><p className="text-xs text-muted-foreground">Spent this month</p></div>
          </div>

          <form className="grid gap-2 sm:grid-cols-[1fr_auto_auto]" onSubmit={(e) => { e.preventDefault(); invite.mutate(); }}>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@agency.com" className="h-12" aria-label="Email to add" required />
            <div role="radiogroup" aria-label="Member type" className="grid grid-cols-2 gap-1 rounded-lg bg-secondary p-1">
              {(["staff", "hunter"] as const).map((t) => (
                <Button key={t} type="button" role="radio" aria-checked={type === t} variant={type === t ? "default" : "ghost"}
                  className={`h-10 ${type === t ? "bg-signal text-signal-foreground" : "text-muted-foreground"}`} onClick={() => setType(t)}>
                  {t === "staff" ? "Staff" : "Onlooker"}
                </Button>
              ))}
            </div>
            <Button type="submit" disabled={invite.isPending} className="h-12 bg-signal font-bold text-signal-foreground"><Mail className="size-4" /> Add</Button>
          </form>
          <p className="text-xs text-muted-foreground">Staff post visits on your wallet. Onlookers are your preferred camera crew, so their payouts are flagged on your statement.</p>

          <ul className="divide-y divide-border rounded-lg border border-border">
            {members.length === 0 && <li className="p-4 text-center text-sm text-muted-foreground">No one added yet.</li>}
            {members.map((m) => (
              <li key={m.id} className="flex items-center justify-between gap-3 p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">{m.email}</p>
                  <p className="text-xs text-muted-foreground">{m.member_type === "staff" ? "Staff" : "Onlooker"} · {m.status === "active" ? "Joined" : "Waiting to sign in"}</p>
                </div>
                <Button variant="ghost" size="icon" className="size-12 shrink-0" aria-label={`Remove ${m.email}`} onClick={() => remove.mutate(m.id)}><Trash2 className="size-4" /></Button>
              </li>
            ))}
          </ul>

          <div>
            <div className="flex items-end justify-between gap-2">
              <h3 className="font-bold text-foreground">This month's statement</h3>
              <p className="text-sm font-bold text-signal">{formatCredits(total)}</p>
            </div>
            <div className="mt-2 overflow-x-auto rounded-lg border border-border">
              <table className="w-full min-w-[560px] text-left text-xs">
                <thead className="bg-secondary text-muted-foreground"><tr><th className="p-2">Date</th><th className="p-2">Visit</th><th className="p-2">Posted by</th><th className="p-2">Onlooker</th><th className="p-2">Status</th><th className="p-2 text-right">Credits</th></tr></thead>
                <tbody className="divide-y divide-border">
                  {statement.length === 0 && <tr><td colSpan={6} className="p-4 text-center text-muted-foreground">No team bounties yet this month.</td></tr>}
                  {statement.map((r) => (
                    <tr key={r.request_id}>
                      <td className="p-2 whitespace-nowrap">{format(new Date(r.created_at), "MMM d")}</td>
                      <td className="p-2"><span className="line-clamp-1">{r.place || r.title}</span></td>
                      <td className="p-2">{r.posted_by}</td>
                      <td className="p-2">{r.hunter || "—"}{r.hunter_on_roster ? " ★" : ""}</td>
                      <td className="p-2">{STATUS[r.status] ?? r.status}</td>
                      <td className="p-2 text-right font-semibold text-foreground">{formatCredits(Number(r.amount))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">★ = Onlooker on your roster.</p>
          </div>
        </>
      )}
    </section>
  );
}
