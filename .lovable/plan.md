# Dispute Center Filing Flow

## What will change
- Keep the Dispute Center title and controls below the iPhone safe area.
- Replace the signed-in empty state with a filing form that loads only bounties the current user is authorized to dispute.
- Add bounty selection, three clear reason choices, a validated incident description, and an optional photo/video/document evidence picker.
- Submit through database-enforced rules that verify ownership, review-window eligibility, and escrow state before marking the escrow disputed and stopping automatic release.
- Store uploaded evidence privately and expose it only to dispute participants and review staff.
- Refresh the page immediately after filing so the new case appears with its evidence and held amount.

## Security and validation
- Enforce UUID, reason, description length, file type, and file size in both the interface and trusted server/database paths.
- Keep direct escrow mutation blocked; the transaction-safe dispute function remains the only filing path.
- Rate-limit repeated dispute attempts and prevent duplicate open disputes.

## Verification
- Verify safe-area spacing and form controls on an iPhone-sized viewport.
- Confirm empty/disabled/error states, eligible bounty loading, and successful case refresh.
- Confirm unauthorized bounty IDs and invalid payloads are rejected by the database.
