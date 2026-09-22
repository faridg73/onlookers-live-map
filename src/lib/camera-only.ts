// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import { toast } from "sonner";

/** Shown whenever someone tries to bring in a file instead of filming live. */
export const CAMERA_ONLY_MESSAGE =
  "For security and verification, Onlooker only accepts live captures from your physical camera.";

/** Shown on every capture screen — captures must be crowd/street/public views only. */
export const PUBLIC_SPACES_DISCLAIMER =
  "Must be public spaces only. Do not record copyrighted stage shows, performances, or game broadcasts.";

/** Shown on every request template — venue exteriors and logistics only. */
export const VENUE_EXTERIOR_DISCLAIMER =
  "Onlooker protects creator rights. Requests targeting live musical performances or internal ticketing platforms are automatically rejected. Keep your camera focused on public property, venue lines, and pre-show atmosphere.";

/**
 * Extra guardrail for the spontaneous-happening categories (street & park
 * performances, community rescues, local markets & pop-ups).
 */
export const PUBLIC_HAPPENINGS_DISCLAIMER =
  "Public spaces only: bounties and broadcasts in this category must be captured on open streets, parks and public squares where no one has an expectation of privacy. Never film on private property, inside homes, or confidential emergency-response activity, those requests are removed.";

/**
 * Privacy & access copy for a bounty that targets private property with the
 * poster's attested authorization. This replaces the blanket public-spaces
 * language, which would contradict the Commercial, Event Venue and
 * Owner-Authorized location types.
 */
const AUTHORIZED_PROPERTY_COPY: Record<string, string> = {
  commercial:
    "You've confirmed you have the business's authorization to film at this address. Capture where the business permits — skip staff-only areas, private records and other patrons where they reasonably expect privacy.",
  event_venue:
    "You've confirmed you have the venue's authorization to film at this event. Follow venue rules: what the venue permits you to film is allowed. Onlooker still rejects requests targeting copyrighted stage shows, live performances or internal ticketing platforms.",
  owner_authorized:
    "You've confirmed you have explicit permission from the owner or agent to film this private property. Your authorization covers interior and exterior capture for this request — respect any areas the owner excluded.",
};

/** Privacy & access copy matching the selected location type. */
export function privacyAccessCopy(locationTypeId?: string | null) {
  if (locationTypeId && locationTypeId !== "public") {
    return AUTHORIZED_PROPERTY_COPY[locationTypeId] ?? VENUE_EXTERIOR_DISCLAIMER;
  }
  return VENUE_EXTERIOR_DISCLAIMER;
}

/** True when the chosen location type allows private property with authorization. */
export function locationTypeAllowsPrivateProperty(locationTypeId?: string | null) {
  return !!locationTypeId && locationTypeId !== "public";
}

/** Blocks dragged-in files (gallery, desktop, other apps) with the standard notice. */
export function blockFileDrop(event: React.DragEvent) {
  if (event.dataTransfer?.types?.includes("Files")) {
    event.preventDefault();
    event.stopPropagation();
    toast.error(CAMERA_ONLY_MESSAGE);
  }
}

/** Blocks pasted images/videos from the clipboard with the standard notice. */
export function blockFilePaste(event: React.ClipboardEvent) {
  const items = Array.from(event.clipboardData?.items ?? []);
  if (items.some((item) => item.kind === "file")) {
    event.preventDefault();
    toast.error(CAMERA_ONLY_MESSAGE);
  }
}
