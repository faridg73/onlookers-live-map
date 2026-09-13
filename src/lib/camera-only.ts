import { toast } from "sonner";

/** Shown whenever someone tries to bring in a file instead of filming live. */
export const CAMERA_ONLY_MESSAGE =
  "For security and verification, Onlooker Live only accepts live captures from your physical camera.";

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
