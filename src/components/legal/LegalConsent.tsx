import { LegalDialog, useLegalDialog } from "./LegalDialog";

/**
 * The universal Terms/Privacy consent tick box with read-in-place popups, so
 * a half-filled form is never lost. Shared by the /auth screen and inline
 * sign-in cards.
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
  return (
    <>
      <div
        className={`${className} flex items-start gap-3 rounded-2xl border border-border bg-surface p-4 text-sm text-muted-foreground`}
      >
        <input
          id="accept-legal"
          type="checkbox"
          required
          checked={accepted}
          onChange={(e) => onChange(e.target.checked)}
          aria-describedby="accept-legal-text"
          className="mt-0.5 h-4 w-4 shrink-0 accent-signal"
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

      <LegalDialog doc={legal.doc} onClose={legal.close} />
    </>
  );
}
