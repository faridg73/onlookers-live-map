import { toast } from "sonner";
import type { LiveRequest } from "@/lib/onlooker";

/** Public link that opens a preview card and deep-links onto the map. */
export function bountyLink(request: LiveRequest, boosted = 0) {
  const origin =
    typeof window === "undefined" ? "https://onlookers-live-map.lovable.app" : window.location.origin;
  const params = new URLSearchParams({
    amt: String(request.bounty + boosted),
    place: request.place,
    title: request.title,
  });
  return `${origin}/b/${request.id}?${params.toString()}`;
}

/** One-tap share of a bounty: native share sheet, clipboard fallback. */
export async function shareBounty(request: LiveRequest, boosted = 0) {
  const url = bountyLink(request, boosted);
  const amount = request.bounty + boosted;
  const title = `${amount} LC bounty — ${request.place}`;
  const text = `${request.title} · ${amount} Looker Coins for a live view at ${request.place}. Anyone nearby?`;

  const nav = typeof navigator === "undefined" ? null : navigator;
  if (nav?.share) {
    try {
      await nav.share({ title, text, url });
      return;
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
    }
  }
  try {
    await nav?.clipboard?.writeText(`${text}\n${url}`);
    toast.success("Bounty link copied — paste it anywhere.");
  } catch {
    toast.error("Couldn't copy the bounty link.");
  }
}
