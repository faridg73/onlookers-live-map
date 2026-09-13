import { toast } from "sonner";

/** Shown whenever someone tries to bring in a file instead of filming live. */
export const CAMERA_ONLY_MESSAGE =
  "For security and verification, Onlooker Live only accepts live captures from your physical camera.";

/** Shown on every capture screen — captures must be crowd/street/public views only. */
export const PUBLIC_SPACES_DISCLAIMER =
  "Must be public spaces only. Do not record copyrighted stage shows, performances, or game broadcasts.";

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
