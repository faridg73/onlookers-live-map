// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import { CheckCircle2, Coins, Eye, Gavel, TimerReset } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatCreditCash, formatCredits } from "@/lib/credits";

interface BountyLiveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  credits: number;
  deadlineLabel: string;
}

export function BountyLiveDialog({ open, onOpenChange, title, credits, deadlineLabel }: BountyLiveDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Close button pinned to the very top corner so it never sits on the title. */}
      <DialogContent className="max-h-[88dvh] overflow-y-auto border-signal/40 bg-surface p-0 sm:max-w-md [&>button]:right-2 [&>button]:top-2">
        <DialogHeader className="items-start gap-1 border-b border-border px-5 pb-4 pt-6 text-left">
          <DialogTitle className="flex items-center gap-2 pr-10 text-lg font-display font-extrabold leading-tight text-white">
            <CheckCircle2 className="size-6 shrink-0 text-signal" aria-hidden />
            Your bounty is live
          </DialogTitle>
          <DialogDescription className="text-sm font-medium leading-relaxed text-white/90">
            {title ? `\u201C${title}\u201D is now visible to onlookers nearby.` : "Your bounty is now visible to onlookers nearby."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 px-5 py-4">
          <div className="flex items-center justify-between gap-3 rounded-lg border border-signal/30 bg-signal/10 px-3 py-2.5">
            <span className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wide text-white">
              <Coins className="size-4 text-signal" aria-hidden />
              Credits held in escrow
            </span>
            <span className="font-display text-base font-extrabold tabular-nums text-signal">
              {formatCredits(credits)} · {formatCreditCash(credits)}
            </span>
          </div>

          <p className="text-xs font-medium leading-relaxed text-white/90">
            Your {formatCredits(credits)} are locked and safe — no one can spend them while onlookers work on your bounty.
          </p>

          <div>
            <p className="mb-1.5 text-xs font-extrabold uppercase tracking-wide text-white">What happens next</p>
            <ul className="space-y-2">
              <li className="flex items-start gap-2 text-xs font-medium leading-relaxed text-white/90">
                <Eye className="mt-0.5 size-4 shrink-0 text-signal" aria-hidden />
                Nearby onlookers are notified and can claim the bounty right away.
              </li>
              <li className="flex items-start gap-2 text-xs font-medium leading-relaxed text-white/90">
                <Gavel className="mt-0.5 size-4 shrink-0 text-signal" aria-hidden />
                You review the capture when it arrives, then approve to release the Credits.
              </li>
              <li className="flex items-start gap-2 text-xs font-medium leading-relaxed text-white/90">
                <TimerReset className="mt-0.5 size-4 shrink-0 text-signal" aria-hidden />
                If nobody completes it, the bounty expires in {deadlineLabel} and your Credits return to your wallet automatically.
              </li>
            </ul>
          </div>
        </div>

        <div className="flex gap-2 border-t border-border px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
          <Button
            type="button"
            onClick={() => onOpenChange(false)}
            className="h-11 flex-1 bg-signal font-extrabold text-signal-foreground hover:bg-signal hover:text-signal-foreground"
          >
            View my bounty
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
