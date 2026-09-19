// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PrivacyBody, TermsBody } from "@/components/legal/legal-content";

type LegalDoc = "terms" | "privacy";

const TITLES: Record<LegalDoc, string> = {
  terms: "Terms of Service",
  privacy: "Privacy Policy",
};

const BLURBS: Record<LegalDoc, string> = {
  terms: "The rules for posting and filming live requests on Onlooker LLC.",
  privacy: "What we collect, why, and the control you keep over it.",
};

/**
 * Read-in-place popup for the Terms of Service and Privacy Policy, so nobody
 * loses a half-filled sign-up form to read them.
 */
export function LegalDialog({
  doc,
  onClose,
}: {
  doc: LegalDoc | null;
  onClose: () => void;
}) {
  return (
    <Dialog open={doc !== null} onOpenChange={(next) => (next ? undefined : onClose())}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto border-border bg-surface">
        {doc ? (
          <>
            <DialogHeader>
              <DialogTitle className="font-display text-2xl tracking-tight text-foreground">
                {TITLES[doc]}
              </DialogTitle>
              <DialogDescription>{BLURBS[doc]}</DialogDescription>
            </DialogHeader>
            <div className="pb-2">
              {doc === "terms" ? <TermsBody /> : <PrivacyBody linkToTerms={false} />}
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

/** Small helper so a form can open either document with one piece of state. */
export function useLegalDialog() {
  const [doc, setDoc] = useState<LegalDoc | null>(null);
  return {
    doc,
    open: (next: LegalDoc) => setDoc(next),
    close: () => setDoc(null),
  };
}
