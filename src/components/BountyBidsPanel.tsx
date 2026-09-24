// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import { useCallback, useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Crown, Gavel, Loader2, Undo2 } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { formatCreditCash } from "@/lib/credits";

type Bid = {
  id: string;
  bidder_id: string;
  bidder_name?: string;
  amount: number;
  note: string;
  status: string;
  created_at: string;
};

type Req = { requester_id: string; status: string; expires_at: string };

// Supabase types regenerate after migrations; keep calls loosely typed.
const db = supabase as unknown as {
  rpc: (fn: string, args?: Record<string, unknown>) => Promise<{ data: any; error: { message: string } | null }>;
  from: (t: string) => any;
};

const STATUS_LABEL: Record<string, string> = {
  active: "Active",
  won: "Won",
  refunded: "Refunded",
  withdrawn: "Withdrawn",
};

function friendly(msg: string) {
  if (/insufficient/i.test(msg)) return "Not enough credits in your wallet for this bid.";
  return msg.replace(/^.*?:\s*/, "") || "Something went wrong. Please try again.";
}

export function BountyBidsPanel({ requestId }: { requestId: string }) {
  // The bounty map page uses display ids like "db-<uuid>"; the backend wants
  // the bare uuid, so strip the prefix before every query.
  const bountyId = requestId.startsWith("db-") ? requestId.slice(3) : requestId;
  const [userId, setUserId] = useState<string | null>(null);
  const [req, setReq] = useState<Req | null>(null);
  const [summary, setSummary] = useState({ count: 0, top: 0 });
  const [myBid, setMyBid] = useState<Bid | null>(null);
  const [posterBids, setPosterBids] = useState<Bid[]>([]);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    const { data: auth } = await supabase.auth.getUser();
    const uid = auth.user?.id ?? null;
    setUserId(uid);

    const [{ data: r }, { data: s }] = await Promise.all([
      db.from("requests").select("requester_id, status, expires_at").eq("id", bountyId).maybeSingle(),
      db.rpc("bounty_bid_summary", { _request_id: bountyId }),
    ]);
    setReq(r ?? null);
    const row = Array.isArray(s) ? s[0] : s;
    setSummary({ count: Number(row?.bid_count ?? 0), top: Number(row?.top_bid ?? 0) });

    if (uid && r?.requester_id === uid) {
      const { data } = await db.rpc("bounty_bids_for_poster", { _request_id: bountyId });
      setPosterBids((data ?? []) as Bid[]);
    } else if (uid) {
      const { data } = await db
        .from("bounty_bids")
        .select("id, bidder_id, amount, note, status, created_at")
        .eq("request_id", bountyId)
        .eq("bidder_id", uid)
        .order("created_at", { ascending: false })
        .limit(1);
      const mine = (data?.[0] ?? null) as Bid | null;
      setMyBid(mine);
      if (mine?.status === "active") {
        setAmount(String(mine.amount));
        setNote(mine.note);
      }
    }
    setLoaded(true);
  }, [bountyId]);

  useEffect(() => {
    void load();
  }, [load]);

  const refreshWallet = () => window.dispatchEvent(new Event("onlooker:credits-refresh"));

  const placeBid = async () => {
    const n = Math.round(Number(amount));
    if (!Number.isFinite(n) || n < 1) {
      toast.error("Enter how many credits you want to bid.");
      return;
    }
    setBusy("place");
    const { error } = await db.rpc("place_bounty_bid", { _request_id: requestId, _amount: n, _note: note });
    setBusy(null);
    if (error) { toast.error(friendly(error.message)); return; }
    toast.success(myBid?.status === "active" ? "Bid updated." : `Bid placed — ${n} credits held from your wallet.`);
    refreshWallet();
    void load();
  };

  const withdraw = async (id: string) => {
    setBusy(id);
    const { error } = await db.rpc("withdraw_bounty_bid", { _bid_id: id });
    setBusy(null);
    if (error) { toast.error(friendly(error.message)); return; }
    toast.success("Bid withdrawn — credits returned to your wallet.");
    setAmount("");
    setNote("");
    refreshWallet();
    void load();
  };

  const award = async (bid: Bid) => {
    if (!window.confirm(`Choose ${bid.bidder_name ?? "this Onlooker"} for ${bid.amount} credits? Other bids will be refunded.`)) return;
    setBusy(bid.id);
    const { error } = await db.rpc("award_bounty_bid", { _bid_id: bid.id });
    setBusy(null);
    if (error) { toast.error(friendly(error.message)); return; }
    toast.success("Winner confirmed. They can start filming now.");
    refreshWallet();
    void load();
  };

  if (!loaded || !req) return null;

  const isPoster = userId === req.requester_id;
  const open = req.status === "open" && new Date(req.expires_at) > new Date();
  const hasActive = myBid?.status === "active";

  return (
    <section className="mt-4 overflow-hidden rounded-3xl border border-border bg-surface">
      <header className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
        <div className="flex items-center gap-2">
          <Gavel className="size-4 text-signal" />
          <h2 className="font-display text-base tracking-tight text-foreground">
            {isPoster ? "Bids on your bounty" : "Bid to win this job"}
          </h2>
        </div>
        <span className="text-xs text-muted-foreground">
          {summary.count} active{summary.top > 0 && ` · top ${summary.top.toLocaleString()}`}
        </span>
      </header>

      <div className="px-5 py-5">
        {isPoster ? (
          posterBids.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No bids yet. Onlookers nearby can bid credits to be chosen for this job.
            </p>
          ) : (
            <ul className="divide-y divide-border/60">
              {posterBids.map((b) => (
                <li key={b.id} className="flex items-center gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-semibold text-foreground">{b.bidder_name}</span>
                      <StatusPill status={b.status} />
                    </div>
                    {b.note && <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{b.note}</p>}
                  </div>
                  <div className="text-right">
                    <div className="font-display text-lg tabular-nums text-foreground">{b.amount.toLocaleString()}</div>
                    <div className="text-[0.65rem] text-muted-foreground">credits</div>
                  </div>
                  {open && b.status === "active" && (
                    <button
                      type="button"
                      onClick={() => award(b)}
                      disabled={busy !== null}
                      className="inline-flex min-h-10 cursor-pointer items-center gap-1.5 rounded-full bg-signal px-4 text-xs font-semibold uppercase tracking-[0.1em] text-signal-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
                    >
                      {busy === b.id ? <Loader2 className="size-3.5 animate-spin" /> : <Crown className="size-3.5" />}
                      Choose
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )
        ) : !userId ? (
          <div className="text-sm text-muted-foreground">
            <Link to="/auth" className="font-semibold text-signal underline underline-offset-4">
              Sign in
            </Link>{" "}
            to bid credits for this job.
          </div>
        ) : !open && !myBid ? (
          <p className="text-sm text-muted-foreground">This bounty isn&rsquo;t taking bids anymore.</p>
        ) : (
          <div className="space-y-4">
            {myBid && (
              <div className="flex items-center justify-between rounded-2xl border border-border bg-background/60 px-4 py-3">
                <div>
                  <div className="text-xs text-muted-foreground">Your bid</div>
                  <div className="font-display text-xl tabular-nums text-foreground">
                    {myBid.amount.toLocaleString()} <span className="text-xs text-muted-foreground">credits</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <StatusPill status={myBid.status} />
                  {hasActive && open && (
                    <button
                      type="button"
                      onClick={() => withdraw(myBid.id)}
                      disabled={busy !== null}
                      className="inline-flex min-h-9 cursor-pointer items-center gap-1 rounded-full border border-border px-3 text-xs font-semibold text-foreground hover:border-signal/60 disabled:opacity-50"
                    >
                      {busy === myBid.id ? <Loader2 className="size-3.5 animate-spin" /> : <Undo2 className="size-3.5" />}
                      Withdraw
                    </button>
                  )}
                </div>
              </div>
            )}

            {open && (myBid?.status !== "won") && (
              <>
                <label className="block">
                  <span className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                    {hasActive ? "Change your bid" : "Your bid (credits)"}
                  </span>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={1}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="e.g. 20"
                    className="mt-1.5 h-12 w-full rounded-xl border border-border bg-background px-4 text-base tabular-nums text-foreground placeholder:text-muted-foreground focus:border-signal focus:outline-none"
                  />
                  {Number(amount) > 0 && (
                    <span className="mt-1 block text-xs text-muted-foreground">
                      ≈ {formatCreditCash(Math.round(Number(amount)))} held from your wallet
                    </span>
                  )}
                </label>
                <label className="block">
                  <span className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Why pick you? (optional)</span>
                  <textarea
                    value={note}
                    maxLength={280}
                    onChange={(e) => setNote(e.target.value)}
                    rows={2}
                    placeholder="I'm 5 minutes away with a stabilizer."
                    className="mt-1.5 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-signal focus:outline-none"
                  />
                </label>
                <button
                  type="button"
                  onClick={placeBid}
                  disabled={busy !== null}
                  className="flex min-h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-signal text-sm font-semibold uppercase tracking-[0.12em] text-signal-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  {busy === "place" && <Loader2 className="size-4 animate-spin" />}
                  {hasActive ? "Update bid" : "Place bid"}
                </button>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Credits are held when you bid. If the Poster picks someone else, withdraws the bounty, or it
                  expires, you get every credit back automatically.
                </p>
              </>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

function StatusPill({ status }: { status: string }) {
  const active = status === "active" || status === "won";
  return (
    <span
      className={
        "rounded-full px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-[0.12em] " +
        (status === "won"
          ? "bg-signal text-signal-foreground"
          : active
            ? "border border-signal/60 text-signal"
            : "border border-border text-muted-foreground")
      }
    >
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}
