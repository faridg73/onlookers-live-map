# Unified inline signup verification

## Build
- Replace the separate post-form phone screen with reusable inline verification controls beside the phone and email fields.
- Require an explicit **Send code**, a 6-digit entry, and **Verify** for each field; keep wrong codes visible and show inline errors.
- Lock each field with a green confirmation state after verification, and allow resending only after 60 seconds.
- Keep **Sign Up** disabled until names, username, password, legal consent, human check, phone verification, and email verification are complete.

## Secure account completion
- Add server-validated, expiring email verification codes delivered through Onlooker's existing transactional email service.
- Keep verification codes hashed, limit attempts and sends, and invalidate verification whenever the email or phone value changes.
- Create and email-confirm the account only after the server independently confirms both verified contact methods; then sign the member in and attach the verified phone.
- Remove signup's email-link confirmation state while preserving the existing email reset and sign-in handling for older unconfirmed accounts.

## Verification
- Check neutral/error/success states, resend countdowns, locked fields, and disabled signup behavior in the browser.
- Confirm the app builds cleanly and the new database protections are active.
