// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import type { RequestStatus } from "./onlooker";

/** Every state a bounty can be in, including cancelled rows from the database. */
export type BountyState = RequestStatus | "cancelled";

export type BountyViewState = {
  closed: boolean;
  /** Headline shown in place of the capture form once closed. */
  closedNotice: string | null;
  showAccessPasscode: boolean;
  /** Passcode digits are revealed (not "hidden until claimed"). */
  passcodeUnlocked: boolean;
  /** Chat box hides entirely instead of showing "opens once claimed". */
  hideLockedChat: boolean;
  showCaptureForm: boolean;
  showSupportLink: boolean;
  showSafetyNotice: boolean;
  captureLabel: string;
  canCapture: boolean;
};

export function isClosedState(status: BountyState) {
  return status === "fulfilled" || status === "expired" || status === "cancelled";
}

/** Single source of truth for which messages and controls a bounty shows. */
export function bountyViewState(
  status: BountyState,
  opts: { pinLocked?: boolean; uploading?: boolean } = {},
): BountyViewState {
  const closed = isClosedState(status);
  const pinLocked = Boolean(opts.pinLocked);
  const captureLabel = closed
    ? "Submissions closed"
    : pinLocked
      ? "Enter the on-site PIN first"
      : "Film live video";
  return {
    closed,
    closedNotice: closed ? "This bounty is closed" : null,
    showAccessPasscode: !closed,
    passcodeUnlocked: status !== "open",
    hideLockedChat: closed,
    showCaptureForm: !closed,
    showSupportLink: !closed,
    showSafetyNotice: !closed,
    captureLabel,
    canCapture: !closed && !pinLocked && !opts.uploading,
  };
}
