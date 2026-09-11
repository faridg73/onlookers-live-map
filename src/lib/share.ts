import { toast } from "sonner";
import { playbackUrl, type BountyVideo } from "@/lib/bounty-videos";

/**
 * One-tap share of a finished bounty clip. Uses the native share sheet where the
 * device offers one, and falls back to copying the link to the clipboard.
 */
export async function shareBountyVideo(video: BountyVideo) {
  let url: string;
  try {
    // Links stay valid for 7 days so the person you send it to can still watch.
    url = await playbackUrl(video.storage_path, 60 * 60 * 24 * 7);
  } catch {
    toast.error("Couldn't create a share link for that video.");
    return;
  }

  const title = video.request_title || "Onlooker live view";
  const text = `${title}${video.request_place ? ` — ${video.request_place}` : ""} · captured on Onlooker`;

  const nav = typeof navigator === "undefined" ? null : navigator;
  if (nav?.share) {
    try {
      await nav.share({ title, text, url });
      return;
    } catch (err) {
      // The person closed the share sheet — nothing to report.
      if (err instanceof DOMException && err.name === "AbortError") return;
    }
  }

  try {
    await nav?.clipboard?.writeText(`${text}\n${url}`);
    toast.success("Share link copied — paste it anywhere.");
  } catch {
    toast.error("Couldn't copy the share link.");
  }
}
