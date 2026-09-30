// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import HandshakeExplainer from "@/components/HandshakeExplainer";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

export const HANDSHAKE_EXPLAINER_HIDDEN_KEY = "onlooker:handshake-explainer-hidden";

/** True when the person ticked "Don't show this again", so it never auto-opens for them. */
export function isHandshakeExplainerHidden() {
  try {
    return window.localStorage.getItem(HANDSHAKE_EXPLAINER_HIDDEN_KEY) === "1";
  } catch {
    return false;
  }
}

export function setHandshakeExplainerHidden(hidden: boolean) {
  try {
    if (hidden) window.localStorage.setItem(HANDSHAKE_EXPLAINER_HIDDEN_KEY, "1");
    else window.localStorage.removeItem(HANDSHAKE_EXPLAINER_HIDDEN_KEY);
  } catch {
    // The explainer still works when browser storage is unavailable.
  }
}

type HandshakeExplainerDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hideNextTime: boolean;
  onHideNextTimeChange: (hidden: boolean) => void;
};

/**
 * The animated handshake walkthrough as an overlay. Closing it (X or backdrop tap)
 * leaves the person exactly where they were in the post flow — no navigation.
 */
export function HandshakeExplainerDialog({
  open,
  onOpenChange,
  hideNextTime,
  onHideNextTimeChange,
}: HandshakeExplainerDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto border-signal/30 bg-surface p-0 sm:max-w-xl">
        <DialogTitle className="sr-only">How the Onlooker Handshake works</DialogTitle>
        <DialogDescription className="sr-only">
          A six-step walkthrough of the escrow, one-time PIN, on-site approval and payout.
        </DialogDescription>
        <div className="px-3 pb-3 pt-10 sm:px-5 sm:pb-5">
          <HandshakeExplainer />
          <label className="mt-4 flex cursor-pointer items-center justify-center gap-2.5 rounded-xl border border-border bg-background px-4 py-3 text-sm font-bold text-muted-foreground">
            <Checkbox
              checked={hideNextTime}
              onCheckedChange={(checked) => onHideNextTimeChange(checked === true)}
            />
            Don&apos;t show this again
          </label>
          <p className="mt-3 text-center text-[11px] text-muted-foreground/70">
            © 2026 Onlooker. All rights reserved.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
