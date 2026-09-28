// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import { useState } from "react";
import { LegalDialog, useLegalDialog } from "./LegalDialog";

/**
 * The universal Terms/Privacy consent tick box with read-in-place popups, so
 * a half-filled form is never lost. Shared by the /auth screen and inline
 * sign-in cards. A second, separately required tick box covers the Community
 * Guidelines; `onChange` only reports true when BOTH boxes are ticked.
 */
export function LegalConsent({
  accepted,
  onChange,
  className = "mt-6",
}: {
  accepted: boolean;
  onChange: (next: boolean) => void;
  className?: string;
}) {
  const legal = useLegalDialog();
  const [legalTicked, setLegalTicked] = useState(accepted);
  const [guidelinesTicked, setGuidelinesTicked] = useState(accepted);

  const update = (nextLegal: boolean, nextGuidelines: boolean) => {
    setLegalTicked(nextLegal);
    setGuidelinesTicked(nextGuidelines);
    onChange(nextLegal && nextGuidelines);
  };

  return (
    <>
      <div
        className={`${className} flex items-start gap-3 rounded-2xl border border-border bg-surface p-4 text-sm text-muted-foreground`}
      >
        <input
          id="accept-legal"
          type="checkbox"
          required
          checked={legalTicked}
          onChange={(e) => update(e.target.checked, guidelinesTicked)}
          aria-describedby="accept-legal-text"
          className="mt-0.5 size-5 shrink-0 accent-signal"
        />
        <span id="accept-legal-text">
          <label htmlFor="accept-legal" className="cursor-pointer">
            I agree to Onlooker LLC&rsquo;s{" "}
          </label>
          <button
            type="button"
            onClick={() => legal.open("terms")}
            className="font-semibold text-foreground underline underline-offset-4"
          >
            Terms of Service
          </button>{" "}
          and{" "}
          <button
            type="button"
            onClick={() => legal.open("privacy")}
            className="font-semibold text-foreground underline underline-offset-4"
          >
            Privacy Policy
          </button>
          <label htmlFor="accept-legal" className="cursor-pointer">
            , acknowledging that I operate independently, assume all legal and physical liability,
            will only record in lawful public spaces without trespassing, and hold Onlooker LLC harmless
            from any legal actions.
          </label>
        </span>
      </div>

      <div className="mt-3 flex items-start gap-3 rounded-2xl border border-border bg-surface p-4 text-sm text-muted-foreground">
        <input
          id="accept-guidelines"
          type="checkbox"
          required
          checked={guidelinesTicked}
          onChange={(e) => update(legalTicked, e.target.checked)}
          aria-describedby="accept-guidelines-text"
          className="mt-0.5 size-5 shrink-0 accent-signal"
        />
        <span id="accept-guidelines-text">
          <label htmlFor="accept-guidelines" className="cursor-pointer">
            I agree to the{" "}
          </label>
          <button
            type="button"
            onClick={() => legal.open("guidelines")}
            className="font-semibold text-foreground underline underline-offset-4"
          >
            Community Guidelines
          </button>
          <label htmlFor="accept-guidelines" className="cursor-pointer">
            {" "}
            &mdash; no sexual content, violence, harassment, illegal activity, or footage I
            don&rsquo;t have the rights to, and no filming people where they expect privacy.
          </label>
        </span>
      </div>

      <LegalDialog doc={legal.doc} onClose={legal.close} />
    </>
  );
}
