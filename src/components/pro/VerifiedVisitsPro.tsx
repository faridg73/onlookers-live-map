// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { BadgeCheck, CalendarClock, Check, Loader2, Send, Sparkles, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { supabase } from "@/integrations/supabase/client";
import { createProVisitBooking } from "@/lib/pro-visits.functions";
import {
  PRO_PLANS,
  PRO_ROLES,
  PRO_VISIT_DRAFT_KEY,
  TRIAL_VISITS,
  formatUsd,
  isTrialPlan,
  needsUpgrade,
  planVisitLimit,
  proPlanById,
  type ProPlan,
  type ProPlanId,
  type ProRole,
  type ProVisitDraft,
} from "@/lib/pro-plans";
import { ProPaywallDialog } from "@/components/pro/ProPaywallDialog";
import { Button } from "@/components/ui/button";

interface ProAccount {
  pro_role: ProRole;
  company: string;
  plan: "none" | "starter" | "pro" | "team";
  visits_used: number;
  visit_period_start: string | null;
}

// pro_accounts is newer than the generated types; keep the client loosely typed here.
const db = supabase as unknown as { from: (t: string) => any };

function useProAccount() {
  const [userId, setUserId] = useState<string | null | undefined>(undefined);
  const [account, setAccount] = useState<ProAccount | null>(null);

  const load = async () => {
    const { data } = await supabase.auth.getSession();
    const uid = data.session?.user.id ?? null;
    setUserId(uid);
    if (!uid) {
      setAccount(null);
      return;
    }
    const { data: row } = await db
      .from("pro_accounts")
      .select("pro_role, company, plan, visits_used, visit_period_start")
      .eq("user_id", uid)
      .maybeSingle();
    setAccount((row as ProAccount | null) ?? null);
  };

  useEffect(() => {
    void load();
    const { data: sub } = supabase.auth.onAuthStateChange(() => void load());
    return () => sub.subscription.unsubscribe();
  }, []);

  return { userId, account, reload: load };
}

const signupSchema = z.object({
  role: z.enum(["agent", "property_manager", "home_builder"]),
  company: z.string().trim().min(1, "Enter your company name").max(120),
});

const requestSchema = z.object({
  address: z.string().trim().min(5, "Enter the property address").max(200),
  purpose: z.string().trim().min(10, "Tell the Onlooker what to capture (10+ characters)").max(1000),
  startAt: z.string().optional(),
  agentName: z.string().trim().min(1, "Enter the on-site contact's name").max(120),
  agentPhone: z.string().trim().max(30),
  agentEmail: z.string().trim().max(255).email("Enter a valid email").or(z.literal("")),
}).refine((d) => d.agentPhone || d.agentEmail, {
  message: "Add a phone or email so the contact gets their PIN",
  path: ["agentPhone"],
});

type PaywallState = { reason: "trial-exhausted" | "allowance-used" | "upgrade"; plan?: ProPlanId };

export function VerifiedVisitsPro() {
  const { userId, account, reload } = useProAccount();
  const [paywall, setPaywall] = useState<PaywallState | null>(null);
  const signupRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("pro") === "success") {
      toast.success("Payment received — your plan activates in a moment.");
      const t = setTimeout(() => void reload(), 2500);
      return () => clearTimeout(t);
    }
    return undefined;
  }, []);

  const choosePlan = (plan: ProPlan) => {
    if (!account) {
      toast("Create your professional account first.");
      signupRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    if (account.plan === plan.id) return;
    setPaywall({ reason: "upgrade", plan: plan.id });
  };

  return (
    <>
      <TrialBanner account={account} onUpgrade={() => setPaywall({ reason: account && !isTrialPlan(account.plan) ? "allowance-used" : "trial-exhausted" })} />
      <PricingSection current={account?.plan ?? "none"} onChoose={choosePlan} />
      <section ref={signupRef} id="pro-signup" className="mt-12 scroll-mt-6" aria-labelledby="pro-signup-title">
        <ProSignup userId={userId} account={account} onSaved={reload} />
      </section>
      <section id="request-visit" className="mt-12 scroll-mt-6" aria-labelledby="request-visit-title">
        <RequestVisitForm
          account={account}
          onNeedsUpgrade={() =>
            setPaywall({ reason: account && !isTrialPlan(account.plan) ? "allowance-used" : "trial-exhausted" })
          }
        />
      </section>
      {paywall && (
        <ProPaywallDialog
          currentPlan={account?.plan ?? "none"}
          trialVisitsUsed={account?.visits_used ?? 0}
          reason={paywall.reason}
          initialPlan={paywall.plan ?? "pro"}
          onClose={() => { setPaywall(null); void reload(); }}
        />
      )}
    </>
  );
}

/** Free-trial / allowance strip above the plans. */
function TrialBanner({ account, onUpgrade }: { account: ProAccount | null; onUpgrade: () => void }) {
  if (!account) return null;
  const trial = isTrialPlan(account.plan);
  const limit = planVisitLimit(account.plan);
  const used = account.visits_used;
  const exhausted = needsUpgrade(account.plan, used);
  const remaining = limit === null ? null : Math.max(0, limit - used);

  return (
    <div
      className={`mt-8 grid gap-3 rounded-2xl border p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:p-5 ${exhausted ? "border-destructive/50 bg-destructive/10" : "border-signal/40 bg-signal/10"}`}
    >
      <div className="min-w-0">
        <p className="flex items-center gap-2 text-[0.65rem] font-bold uppercase tracking-[0.18em] text-signal">
          <Sparkles className="size-3.5 shrink-0" aria-hidden />
          {trial ? "Free trial" : `${proPlanById(account.plan)?.name} plan`}
        </p>
        <p className="mt-1 text-sm font-bold text-foreground sm:text-base">
          {trial
            ? `Trial: ${Math.min(used, TRIAL_VISITS)} of ${TRIAL_VISITS} free verified visits used`
            : remaining === null
              ? `${used} verified visits this billing month · Unlimited`
              : `${remaining} of ${limit} verified visits left this month`}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {exhausted
            ? "Choose a plan to keep scheduling verified visits. You still fund each Onlooker's bounty separately."
            : "No card needed for trial visits — you only fund the Onlooker's bounty."}
        </p>
      </div>
      <Button
        type="button"
        onClick={onUpgrade}
        className="h-12 w-full rounded-xl bg-signal px-5 font-bold text-signal-foreground hover:brightness-110 sm:w-auto"
      >
        {exhausted ? "Choose a plan" : "See plans"}
      </Button>
    </div>
  );
}

function PricingSection({ current, onChoose }: { current: string; onChoose: (p: ProPlan) => void }) {
  return (
    <section className="mt-12" aria-labelledby="pro-pricing">
      <h2 id="pro-pricing" className="text-center text-lg font-bold text-foreground">
        Plans for professionals
      </h2>
      <p className="mx-auto mt-2 max-w-md text-center text-sm text-muted-foreground">
        Monthly plans, cancel anytime. Bounty payouts to Onlookers are held in escrow separately.
      </p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {PRO_PLANS.map((plan) => {
          const active = current === plan.id;
          return (
            <div
              key={plan.id}
              className={`flex flex-col rounded-2xl border bg-card p-5 ${plan.featured ? "border-signal" : "border-border"}`}
            >
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
                <h3 className="truncate font-bold text-foreground">{plan.name}</h3>
                {plan.featured && (
                  <span className="shrink-0 rounded-full bg-signal px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-wider text-signal-foreground">
                    Popular
                  </span>
                )}
              </div>
              <p className="mt-3 text-3xl font-extrabold text-foreground">
                {formatUsd(plan.priceCents)}
                <span className="text-sm font-medium text-muted-foreground">/mo</span>
              </p>
              <p className="mt-1 text-sm font-semibold text-signal">{plan.visits}</p>
              <p className="mt-2 text-xs text-muted-foreground">{plan.tagline}</p>
              <ul className="mt-4 flex-1 space-y-2">
                {plan.features.map((f) => (
                  <li key={f} className="flex gap-2 text-sm text-foreground">
                    <Check className="mt-0.5 size-4 shrink-0 text-signal" aria-hidden />
                    <span className="min-w-0">{f}</span>
                  </li>
                ))}
              </ul>
              <Button
                type="button"
                disabled={active}
                onClick={() => onChoose(plan)}
                variant={plan.featured ? "default" : "outline"}
                className={`mt-5 h-12 rounded-xl font-bold ${plan.featured ? "bg-signal text-signal-foreground hover:brightness-110" : ""}`}
              >
                {active ? "Current plan" : `Choose ${plan.name}`}
              </Button>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function ProSignup({
  userId,
  account,
  onSaved,
}: {
  userId: string | null | undefined;
  account: ProAccount | null;
  onSaved: () => Promise<void>;
}) {
  const [role, setRole] = useState<ProRole>("agent");
  const [company, setCompany] = useState("");
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (account) {
      setRole(account.pro_role);
      setCompany(account.company);
    }
  }, [account]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = signupSchema.safeParse({ role, company });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Check the form");
      return;
    }
    if (!userId) return;
    setSaving(true);
    const payload = { pro_role: parsed.data.role, company: parsed.data.company };
    const { error } = account
      ? await db.from("pro_accounts").update(payload).eq("user_id", userId)
      : await db.from("pro_accounts").insert({ user_id: userId, ...payload });
    setSaving(false);
    if (error) {
      toast.error("Couldn't save your account. Please try again.");
      return;
    }
    toast.success(account ? "Account updated." : "Welcome aboard — your professional account is ready.");
    setEditing(false);
    await onSaved();
  };

  const title = (
    <h2 id="pro-signup-title" className="flex items-center justify-center gap-2 text-center text-lg font-bold text-foreground">
      <UserPlus className="size-5 text-signal" aria-hidden /> Professional account
    </h2>
  );

  if (userId === undefined) {
    return <div className="rounded-2xl border border-border bg-card p-6">{title}<Loader2 className="mx-auto mt-4 size-5 animate-spin text-muted-foreground" /></div>;
  }

  if (!userId) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 text-center">
        {title}
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          Sign in or create a free Onlooker account, then register as an agent, property manager or home builder.
        </p>
        <Button asChild className="mt-4 h-11 rounded-xl bg-signal px-6 font-bold text-signal-foreground hover:brightness-110">
          <Link to="/auth">Sign in to join</Link>
        </Button>
      </div>
    );
  }

  if (account && !editing) {
    const plan = proPlanById(account.plan);
    return (
      <div className="rounded-2xl border border-signal/40 bg-card p-6">
        {title}
        <div className="mt-4 flex items-center justify-center gap-2 text-sm text-foreground">
          <BadgeCheck className="size-4 text-signal" aria-hidden />
          <span className="font-semibold">{account.company}</span>
          <span className="text-muted-foreground">· {PRO_ROLES.find((r) => r.id === account.pro_role)?.label}</span>
        </div>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          Plan: <span className="font-semibold text-foreground">{plan ? `${plan.name} — ${plan.visits}` : "No plan yet"}</span>
        </p>
        {account.plan !== "none" && (
          <p className="mt-1 text-center text-sm font-semibold text-signal">
            {account.plan === "team"
              ? `${account.visits_used} verified visits this billing month · Unlimited`
              : `${account.visits_used} of ${account.plan === "starter" ? 5 : 20} verified visits used this billing month`}
          </p>
        )}
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          <Button asChild className="h-11 rounded-xl bg-signal px-5 font-bold text-signal-foreground hover:brightness-110">
            <Link to="/pro-dashboard">Open Pro Dashboard</Link>
          </Button>
          <Button type="button" variant="outline" className="h-11 rounded-xl" onClick={() => setEditing(true)}>
            Edit details
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={save} className="rounded-2xl border border-border bg-card p-6">
      {title}
      <p className="mt-2 text-center text-sm text-muted-foreground">Tell us who you are. It takes ten seconds.</p>
      <fieldset className="mt-5">
        <legend className="text-xs font-bold uppercase tracking-widest text-muted-foreground">I am a</legend>
        <div className="mt-2 grid gap-2 sm:grid-cols-3">
          {PRO_ROLES.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setRole(r.id)}
              aria-pressed={role === r.id}
              className={`h-11 rounded-xl border px-3 text-sm font-semibold transition-colors ${role === r.id ? "border-signal bg-signal/10 text-foreground" : "border-border text-muted-foreground hover:text-foreground"}`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </fieldset>
      <label className="mt-4 block">
        <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Company</span>
        <input value={company} onChange={(e) => setCompany(e.target.value)} maxLength={120} placeholder="e.g. Reyes Realty Group" className="field mt-2" />
      </label>
      <div className="mt-5 flex justify-center gap-3">
        {account && <Button type="button" variant="outline" className="h-11 rounded-xl" onClick={() => setEditing(false)}>Cancel</Button>}
        <Button type="submit" disabled={saving} className="h-11 rounded-xl bg-signal px-6 font-bold text-signal-foreground hover:brightness-110">
          {saving ? <Loader2 className="size-4 animate-spin" /> : account ? "Save" : "Create professional account"}
        </Button>
      </div>
    </form>
  );
}

function RequestVisitForm({ account, onNeedsUpgrade }: { account: ProAccount | null; onNeedsUpgrade: () => void }) {
  const navigate = useNavigate();
  const saveBooking = useServerFn(createProVisitBooking);
  const [form, setForm] = useState({ address: "", purpose: "", startAt: "", agentName: "", agentPhone: "", agentEmail: "" });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));
  const trial = account !== null && isTrialPlan(account.plan);
  const limit = account ? planVisitLimit(account.plan) : null;
  const allowanceUsed = account !== null && needsUpgrade(account.plan, account.visits_used);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!account) {
      setError("Create your free professional account first (the \"Join as a professional\" form on this page), then tap Continue again.");
      document.querySelector("form")?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    if (allowanceUsed) {
      // Third visit onward: open the paywall instead of a dead-end message.
      setError(null);
      onNeedsUpgrade();
      return;
    }
    const parsed = requestSchema.safeParse(form);
    if (!parsed.success) return setError(parsed.error.issues[0]?.message ?? "Check the form");
    if (form.startAt && new Date(form.startAt).getTime() < Date.now()) return setError("Pick a visit time in the future");
    setError(null);
    setSaving(true);
    try {
      const scheduledStartAt = form.startAt ? new Date(form.startAt).toISOString() : null;
      const booking = await saveBooking({ data: {
        address: parsed.data.address,
        purpose: parsed.data.purpose,
        scheduledStartAt,
        contactName: parsed.data.agentName,
        contactPhone: parsed.data.agentPhone,
        contactEmail: parsed.data.agentEmail,
      } });
      const draft: ProVisitDraft = {
        bookingId: booking.id,
        address: parsed.data.address,
        purpose: parsed.data.purpose,
        startAt: scheduledStartAt,
        agentName: parsed.data.agentName,
        agentPhone: parsed.data.agentPhone,
        agentEmail: parsed.data.agentEmail,
      };
      window.sessionStorage.setItem(PRO_VISIT_DRAFT_KEY, JSON.stringify(draft));
      void navigate({ to: "/post", search: { mode: "bounty" } });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save this visit. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="rounded-2xl border border-border bg-card p-6">
      <h2 id="request-visit-title" className="flex items-center justify-center gap-2 text-lg font-bold text-foreground">
        <CalendarClock className="size-5 text-signal" aria-hidden /> Request a verified visit
      </h2>
      <p className="mt-2 text-center text-sm text-muted-foreground">
        Fill this in and we'll open a verified bounty with everything pre-filled. You set the payout and confirm before anything is charged.
      </p>
      <div className="mt-5 space-y-4">
        <Field label="Property address"><input value={form.address} onChange={set("address")} maxLength={200} placeholder="123 Main St, Los Angeles, CA" className="field" /></Field>
        <Field label="What should be captured?"><textarea value={form.purpose} onChange={set("purpose")} maxLength={1000} rows={3} placeholder="Walkthrough of every room, exterior and backyard…" className="field min-h-24" /></Field>
        <Field label="Preferred visit time (optional)"><input type="datetime-local" value={form.startAt} onChange={set("startAt")} className="field" /></Field>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="On-site contact"><input value={form.agentName} onChange={set("agentName")} maxLength={120} placeholder="Dana Reyes" className="field" /></Field>
          <Field label="Contact phone"><input type="tel" value={form.agentPhone} onChange={set("agentPhone")} maxLength={30} placeholder="(555) 555-0123" className="field" /></Field>
          <Field label="Contact email"><input type="email" value={form.agentEmail} onChange={set("agentEmail")} maxLength={255} placeholder="dana@realty.com" className="field" /></Field>
        </div>
        <p className="text-xs text-muted-foreground">The contact receives a one-time PIN by text or email — no account needed.</p>
        {hasPlan && account && (
          <p className={`text-xs font-semibold ${allowanceUsed ? "text-destructive" : "text-signal"}`}>
            {account.plan === "team"
              ? `Plan usage: ${account.visits_used} visits this billing month · Unlimited`
              : `Plan usage: ${account.visits_used} of ${account.plan === "starter" ? 5 : 20} visits`}
          </p>
        )}
        {error && <p role="alert" className="text-sm font-semibold text-destructive">{error}</p>}
        <Button type="submit" disabled={allowanceUsed || saving} className="h-11 w-full rounded-xl bg-signal font-bold uppercase text-signal-foreground hover:brightness-110">
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />} {saving ? "Saving visit" : "Continue to verified bounty"}
        </Button>
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{label}</span>
      <div className="mt-2">{children}</div>
    </label>
  );
}

function ProCheckoutSheet({ plan, onClose }: { plan: ProPlan; onClose: () => void }) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void (async () => {
      try {
        const result = await startProCheckout({ data: { planId: plan.id } });
        if (result.error) throw new Error(result.error);
        if (!result.clientSecret) throw new Error("The payment form could not be opened.");
        setClientSecret(result.clientSecret);
      } catch (cause) {
        const msg = cause instanceof Error ? cause.message : "Could not open checkout";
        setError(msg.toLowerCase().includes("unauthorized") ? "Please sign in to choose a plan." : msg);
      }
    })();
  }, [plan.id]);

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-background/80 backdrop-blur-sm sm:items-center">
      <div className="flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border border-border bg-surface-raised sm:rounded-3xl" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">Verified Visits {plan.name}, {formatUsd(plan.priceCents)}/mo</p>
            <p className="text-xs text-muted-foreground">{plan.visits}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close checkout" className="grid size-11 shrink-0 place-items-center rounded-full border border-border bg-secondary/80 text-foreground hover:bg-secondary">
            <X className="size-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto overscroll-contain px-2 py-3">
          {error ? (
            <div className="px-3 py-8 text-center">
              <p className="text-sm text-foreground">{error}</p>
              <Button type="button" onClick={onClose} className="mt-4 rounded-full bg-signal text-signal-foreground">Close</Button>
            </div>
          ) : clientSecret ? (
            <EmbeddedCheckoutProvider stripe={getStripe()} options={{ clientSecret }}>
              <EmbeddedCheckout />
            </EmbeddedCheckoutProvider>
          ) : (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Opening secure checkout…
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
