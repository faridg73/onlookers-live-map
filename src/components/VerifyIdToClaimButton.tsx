// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { startIdentityCheck } from "@/lib/identity.functions";

/** Shown instead of Claim on a Verified Visit until the onlooker passes the ID check. */
export function VerifyIdToClaimButton({ country }: { country: string | null }) {
  const begin = useServerFn(startIdentityCheck);
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  async function start() {
    // Country decides which ID check runs; without it, the Balance page asks first.
    if (!country) {
      void navigate({ to: "/balance" });
      toast.info("Pick your country, then start the ID check.");
      return;
    }
    setBusy(true);
    try {
      const result = await begin({ data: { country, returnOrigin: window.location.origin } });
      if (result.error || !result.url) throw new Error(result.error ?? "Could not open the ID check");
      const opened = window.open(result.url, "_blank", "noopener,noreferrer");
      if (!opened) window.location.href = result.url;
      toast.info("ID check opened. Come back here when you're done.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not open the ID check");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button type="button" className="mt-2 h-12 w-full rounded-xl font-bold" disabled={busy} onClick={() => void start()}>
      {busy ? <Loader2 className="mr-2 size-4 animate-spin" /> : <ShieldCheck className="mr-2 size-4" />}
      Verify your ID to claim
    </Button>
  );
}
