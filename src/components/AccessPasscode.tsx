// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import { KeyRound, Lock } from "lucide-react";
import { useEffect, useState } from "react";
import { readAccessCode } from "@/lib/bounty-escrow";
import type { LiveRequest } from "@/lib/onlooker";

/**
 * Private access passcode panel. It stays hidden while the bounty is open and
 * only shows the code once the bounty is claimed, so the onlooker can quote it
 * on site if anyone asks who authorised them to be there.
 */
export function AccessPasscode({ request }: { request: LiveRequest }) {
  const [code, setCode] = useState<string | null>(request.accessCode ?? null);
  /** null while the lookup runs, so a public spot never reads as "locked". */
  const [checked, setChecked] = useState(Boolean(request.accessCode));
  const unlocked = request.status !== "open";

  useEffect(() => {
    if (!unlocked || code || !request.dbId) return;
    let live = true;
    void readAccessCode(request.dbId).then((value) => {
      if (!live) return;
      if (value) setCode(value);
      setChecked(true);
    });
    return () => {
      live = false;
    };
  }, [unlocked, code, request.dbId]);

  if (!request.accessCode && !request.dbId) return null;
  // Most bounties are in public places and carry no passcode at all. Showing a
  // permanently "hidden" box there reads as a broken unlock, so hide it.
  if (unlocked && checked && !code) return null;

  return (
    <div className="mt-3 rounded-xl border border-signal/40 bg-signal/5 p-3">
      <div className="flex items-center gap-1.5 text-[0.6rem] uppercase tracking-[0.16em] text-signal">
        <KeyRound className="size-3.5" /> Private access passcode
      </div>
      {unlocked && code ? (
        <>
          <div className="mt-2 font-display text-2xl tracking-[0.4em] text-foreground">{code}</div>
          <p className="mt-1 text-xs text-muted-foreground">
            Show or say this code on site to confirm the owner, agent or manager authorised your
            visit. Do not share it with anyone else.
          </p>
        </>
      ) : unlocked ? (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Lock className="size-3.5" /> Checking this bounty&rsquo;s passcode…
        </p>
      ) : (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Lock className="size-3.5" /> Hidden until this bounty is claimed.
        </p>
      )}
    </div>
  );
}
