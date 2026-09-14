import { useEffect, useState } from "react";
import { BadgeCheck, Clock, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import {
  fetchMyVerification,
  requestCreatorVerification,
  type VerificationStatus,
} from "@/lib/verification";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** Apply to become a verified creator, and see where that application stands. */
export function CreatorVerificationCard() {
  const [status, setStatus] = useState<VerificationStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    let active = true;
    fetchMyVerification()
      .then((next) => {
        if (active) setStatus(next);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  async function apply() {
    setSending(true);
    try {
      const stamp = await requestCreatorVerification();
      setStatus((prev) => ({ isVerified: prev?.isVerified ?? false, requestedAt: stamp }));
      toast.success("Application sent — our team will review your account.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "That could not be sent.");
    } finally {
      setSending(false);
    }
  }

  if (loading || !status) return null;

  return (
    <section className="mt-6 rounded-2xl border border-border bg-surface p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="inline-flex items-center gap-2 text-sm font-bold text-foreground">
          <ShieldCheck className="size-4 text-signal" /> Creator verification
        </p>
        {status.isVerified && <VerifiedBadge variant="pill" />}
      </div>

      {status.isVerified ? (
        <p className="mt-2 text-xs text-muted-foreground">
          Your account is verified. The check mark shows next to your name on your profile, in
          feeds, chats and live streams.
        </p>
      ) : status.requestedAt ? (
        <>
          <p className="mt-2 text-xs text-muted-foreground">
            Your application is in review. We look at your finished captures and account history,
            and you keep posting as normal in the meantime.
          </p>
          <p className="mt-3 inline-flex items-center gap-2 rounded-xl bg-surface-raised px-3 py-2 text-xs font-bold text-foreground">
            <Clock className="size-3.5 text-signal" /> Applied {formatDate(status.requestedAt)}
          </p>
          <Button
            variant="outline"
            size="sm"
            disabled={sending}
            onClick={() => void apply()}
            className="mt-3 w-full"
          >
            {sending ? "Sending…" : "Resend application"}
          </Button>
        </>
      ) : (
        <>
          <p className="mt-2 text-xs text-muted-foreground">
            Verified creators get a check mark next to their name and can broadcast live for free,
            with no credits held. Apply once and our team reviews your account.
          </p>
          <Button
            size="sm"
            disabled={sending}
            onClick={() => void apply()}
            className="mt-3 w-full gap-2"
          >
            <BadgeCheck className="size-4" />
            {sending ? "Sending…" : "Apply to be verified"}
          </Button>
        </>
      )}
    </section>
  );
}
