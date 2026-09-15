import { useCallback, useRef, useState, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ShieldCheck, X } from "lucide-react";
import { toast } from "sonner";

import { PhoneVerification } from "@/components/PhoneVerification";
import { claimVerifiedPhone, fetchPhoneGateStatus } from "@/lib/phone-gate";

/**
 * Trust gate for money and live actions.
 *
 * Anyone can browse and sign up (including with Google or Apple), but posting a
 * bounty, locking credits or going live all require a mobile number confirmed
 * by text. Call `ensureVerified()` first: it returns true when the member is
 * already confirmed, otherwise it opens the text-message step and replays the
 * action once the code checks out.
 */
export function usePhoneGate(reason = "before you continue") {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [checking, setChecking] = useState(false);
  const retry = useRef<(() => void) | null>(null);

  const ensureVerified = useCallback(
    async (onVerifiedRetry?: () => void): Promise<boolean> => {
      setChecking(true);
      try {
        const status = await fetchPhoneGateStatus();
        if (!status.signedIn) {
          toast.error("Sign in first to continue.");
          return false;
        }
        if (status.verified) return true;
        if (!status.email) {
          toast.error("We need an email on your account before we can text you a code.");
          return false;
        }
        retry.current = onVerifiedRetry ?? null;
        setEmail(status.email);
        setOpen(true);
        return false;
      } catch {
        toast.error("We couldn't check your account just now. Please try again.");
        return false;
      } finally {
        setChecking(false);
      }
    },
    [],
  );

  const close = useCallback(() => {
    retry.current = null;
    setOpen(false);
  }, []);

  const gate: ReactNode = open ? (
    <PhoneGateDialog
      email={email}
      reason={reason}
      onCancel={close}
      onVerified={async () => {
        try {
          await claimVerifiedPhone();
        } catch {
          toast.error("Your number was confirmed but we couldn't save it. Please try again.");
          return;
        }
        const again = retry.current;
        retry.current = null;
        setOpen(false);
        toast.success("Number confirmed, you're all set.");
        again?.();
      }}
    />
  ) : null;

  return { ensureVerified, gate, checking };
}

function PhoneGateDialog({
  email,
  reason,
  onVerified,
  onCancel,
}: {
  email: string;
  reason: string;
  onVerified: () => void;
  onCancel: () => void;
}) {
  const navigate = useNavigate();
  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center">
      <button
        type="button"
        aria-label="Close"
        onClick={onCancel}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
      />
      <div className="relative z-10 max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-3xl border border-border bg-background p-5 pb-8 sm:rounded-3xl">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="grid size-9 place-items-center rounded-full bg-signal text-signal-foreground">
              <ShieldCheck className="size-4" />
            </span>
            <div>
              <h2 className="font-display text-lg tracking-tight text-foreground">
                Confirm your number
              </h2>
              <p className="text-xs text-muted-foreground">
                One quick text {reason}. Real people only, it keeps bounties, payouts and live
                meet-ups safe.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Close"
            className="grid size-8 shrink-0 place-items-center rounded-full border border-border text-muted-foreground"
          >
            <X className="size-4" />
          </button>
        </div>

        <PhoneVerification email={email} onVerified={() => onVerified()} onCancel={onCancel} />

        <button
          type="button"
          onClick={() => {
            onCancel();
            void navigate({ to: "/profile" });
          }}
          className="mt-4 w-full text-center text-xs text-muted-foreground underline"
        >
          Do this later from my profile
        </button>
      </div>
    </div>
  );
}
