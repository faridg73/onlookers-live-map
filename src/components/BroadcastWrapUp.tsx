// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { CheckCircle2, CloudUpload, Coins, Home, MapPin, Radio, Tag, User } from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatCreditCash, formatCredits } from "@/lib/credits";
import { readWalletBalance } from "@/lib/bounty-escrow";

/**
 * Closing screen for a finished broadcast: it confirms whether the recording
 * was uploaded, recaps the stream and the wallet, and gives one clear way back
 * into the app instead of dropping people on a blank page.
 */
export function BroadcastWrapUp({
  title,
  place,
  categoryLabel,
  saved,
  seconds,
  onGoLiveAgain,
  onHome,
  onProfile,
}: {
  title: string;
  place: string;
  categoryLabel?: string | null;
  /** True once the recording finished uploading to the person's library. */
  saved: boolean;
  /** Length of the saved recording, when we could measure it. */
  seconds?: number | null;
  onGoLiveAgain: () => void;
  onHome: () => void;
  onProfile: () => void;
}) {
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    void readWalletBalance().then((next) => {
      if (active) setBalance(next);
    });
    return () => {
      active = false;
    };
  }, []);

  const duration =
    seconds && seconds > 0
      ? `${Math.floor(seconds / 60)}m ${String(Math.round(seconds % 60)).padStart(2, "0")}s`
      : null;

  const panel = (
    <div className="fixed inset-0 z-[85] overflow-y-auto bg-background px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1.5rem,env(safe-area-inset-top))]">
      <div className="mx-auto max-w-lg animate-rise space-y-5">
        <div className="text-center">
          <span className="mx-auto grid size-14 place-items-center rounded-full border border-signal/50 bg-signal/10">
            <CheckCircle2 className="size-7 text-signal" />
          </span>
          <h2 className="mt-3 font-display text-2xl font-extrabold text-foreground">
            That&apos;s a wrap
          </h2>
          <p className="mt-1 text-sm font-medium text-muted-foreground">
            Your broadcast has ended. Here&apos;s everything that happened.
          </p>
        </div>

        <div className="space-y-3 rounded-2xl border border-border bg-surface p-4">
          <p className="flex items-start gap-2 text-sm font-extrabold text-foreground">
            <Radio className="mt-0.5 size-4 shrink-0 text-signal" />
            {title}
          </p>
          <p className="flex items-start gap-2 text-xs font-medium text-muted-foreground">
            <MapPin className="mt-0.5 size-3.5 shrink-0 text-signal" />
            {place}
          </p>
          {categoryLabel && (
            <p className="flex items-start gap-2 text-xs font-medium text-muted-foreground">
              <Tag className="mt-0.5 size-3.5 shrink-0 text-signal" />
              {categoryLabel}
            </p>
          )}
          <p className="flex items-start gap-2 text-xs font-medium text-muted-foreground">
            <CloudUpload className="mt-0.5 size-3.5 shrink-0 text-signal" />
            {saved
              ? `Recording uploaded to your library${duration ? ` · ${duration}` : ""}. Watch or share it any time from your profile.`
              : "No recording was saved for this session — your broadcast still went out live."}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-border bg-surface-raised p-4">
            <Coins className="size-4 text-signal" />
            <p className="mt-1 font-display text-xl font-extrabold text-foreground">
              {balance != null ? formatCredits(balance) : "—"}
            </p>
            <p className="text-[0.6rem] font-bold uppercase tracking-[0.16em] text-muted-foreground">
              Wallet balance
            </p>
            {balance != null && (
              <p className="mt-1 text-[0.7rem] font-medium text-muted-foreground">
                {formatCreditCash(balance)}
              </p>
            )}
          </div>
          <div className="rounded-2xl border border-border bg-surface-raised p-4">
            <Radio className="size-4 text-signal" />
            <p className="mt-1 font-display text-xl font-extrabold text-foreground">0</p>
            <p className="text-[0.6rem] font-bold uppercase tracking-[0.16em] text-muted-foreground">
              Credits used
            </p>
            <p className="mt-1 text-[0.7rem] font-medium text-muted-foreground">
              Free social broadcast
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <Button
            type="button"
            onClick={onGoLiveAgain}
            className="h-12 w-full gap-2 bg-signal font-extrabold uppercase tracking-[0.12em] text-signal-foreground"
          >
            <Radio className="size-4" /> Go live again
          </Button>
          <Button type="button" variant="outline" onClick={onProfile} className="h-12 w-full gap-2">
            <User className="size-4 text-signal" /> View my broadcasts
          </Button>
          <Button type="button" variant="ghost" onClick={onHome} className="h-12 w-full gap-2">
            <Home className="size-4 text-signal" /> Back to home
          </Button>
        </div>
      </div>
    </div>
  );

  return typeof document === "undefined" ? panel : createPortal(panel, document.body);
}
