# Refine the Create Community Report Experience

Update the report form to closely match the supplied concept while preserving the existing posting, trust, and emergency protections.

## What will change

- Rebalance the form into a compact two-column layout: incident selection and media on the left; trust status, location radius, and details on the right. It will stack cleanly on narrow phones.
- Remove the incident dropdown entirely. Keep only five visual choices: Fire, Police, Medical, Traffic, and Hazard, with clear red neon selected states and lock indicators for restricted choices.
- Replace the manual creator-authentication switch with a read-only trust-level status. Level 3 members will show verified access; lower levels will see which emergency choices remain locked.
- Display the radius in miles for US locales and metric units elsewhere while retaining meters internally for report tags and storage.
- Generate an immediate local thumbnail for selected photos and videos, keep it visible during upload, and clean up temporary preview URLs safely.
- Keep the legal pledge and safety warning prominent. The submit control remains visible at the bottom, appears dim until every requirement is met, and gains the red glow after the pledge and required fields are complete.

## Validation

- Check the modal from both Home and Community on phone and desktop sizes.
- Confirm no dropdown or manual trust switch remains.
- Confirm emergency choices stay unavailable below Level 3.
- Confirm photo/video previews appear immediately and locale-aware radius text renders correctly.
- Confirm the submit control stays visible and cannot submit until the complete form, including the pledge, is valid.
- Recheck the database protection preventing members from changing sensitive profile fields.
