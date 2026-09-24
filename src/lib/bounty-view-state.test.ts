import { describe, expect, it } from "vitest";
import { bountyViewState, isClosedState } from "./bounty-view-state";
import { isClosed } from "./onlooker-store";
import type { LiveRequest } from "./onlooker";

describe("open bounty", () => {
  const v = bountyViewState("open");
  it("accepts clips with the capture form and safety notes", () => {
    expect(v.closed).toBe(false);
    expect(v.closedNotice).toBeNull();
    expect(v.showCaptureForm).toBe(true);
    expect(v.showSupportLink).toBe(true);
    expect(v.showSafetyNotice).toBe(true);
    expect(v.captureLabel).toBe("Film live video");
    expect(v.canCapture).toBe(true);
  });
  it("keeps the passcode hidden until claimed", () => {
    expect(v.showAccessPasscode).toBe(true);
    expect(v.passcodeUnlocked).toBe(false);
    expect(v.hideLockedChat).toBe(false);
  });
  it("blocks filming until the on-site PIN is entered", () => {
    const locked = bountyViewState("open", { pinLocked: true });
    expect(locked.captureLabel).toBe("Enter the on-site PIN first");
    expect(locked.canCapture).toBe(false);
  });
  it("blocks a second capture while uploading", () => {
    expect(bountyViewState("open", { uploading: true }).canCapture).toBe(false);
  });
});

describe("claimed bounty", () => {
  const v = bountyViewState("claimed");
  it("reveals the passcode and still accepts clips", () => {
    expect(v.closed).toBe(false);
    expect(v.showAccessPasscode).toBe(true);
    expect(v.passcodeUnlocked).toBe(true);
    expect(v.showCaptureForm).toBe(true);
    expect(v.captureLabel).toBe("Film live video");
    expect(v.canCapture).toBe(true);
  });
});

describe.each(["cancelled", "fulfilled", "expired"] as const)("%s bounty", (status) => {
  const v = bountyViewState(status);
  it("shows one clear closed message", () => {
    expect(v.closed).toBe(true);
    expect(v.closedNotice).toBe("This bounty is closed");
  });
  it("hides passcode, locked chat, capture form, support link and safety note", () => {
    expect(v.showAccessPasscode).toBe(false);
    expect(v.hideLockedChat).toBe(true);
    expect(v.showCaptureForm).toBe(false);
    expect(v.showSupportLink).toBe(false);
    expect(v.showSafetyNotice).toBe(false);
  });
  it("never allows filming, even with a PIN", () => {
    expect(v.canCapture).toBe(false);
    expect(bountyViewState(status, { pinLocked: true }).captureLabel).toBe("Submissions closed");
  });
});

describe("store agrees with the view rules", () => {
  it.each(["open", "claimed", "fulfilled", "expired"] as const)("%s", (status) => {
    expect(isClosed({ status } as LiveRequest)).toBe(isClosedState(status));
  });
});
