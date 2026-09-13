import { useEffect, useRef, useState } from "react";
import { HandCoins } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { MICRO_TIP, tipHunter } from "@/lib/tips";
import { formatCoinCash } from "@/lib/coins";

const REACTIONS = ["\u{1F525}", "\u{2764}\u{FE0F}", "\u{1F440}", "\u{1F62E}"] as const;

type Floater = { id: number; emoji: string; left: number };

/**
 * Tap-to-react bar that floats animated emoji over a clip, shares them live
 * with everyone else watching, and lets viewers send the hunter a small tip.
 */
export function LiveReactions({ videoId }: { videoId: string }) {
  const [floaters, setFloaters] = useState<Floater[]>([]);
  const [tipping, setTipping] = useState(false);
  const channel = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const nextId = useRef(0);

  const float = (emoji: string) => {
    const id = nextId.current++;
    setFloaters((prev) => [...prev, { id, emoji, left: 10 + Math.random() * 70 }]);
    setTimeout(() => setFloaters((prev) => prev.filter((f) => f.id !== id)), 1800);
  };

  useEffect(() => {
    const room = supabase
      .channel(`clip-reactions:${videoId}`)
      .on("broadcast", { event: "reaction" }, ({ payload }) => {
        const emoji = (payload as { emoji?: string })?.emoji;
        if (emoji) float(emoji);
      })
      .subscribe();
    channel.current = room;
    return () => {
      void supabase.removeChannel(room);
      channel.current = null;
    };
  }, [videoId]);

  const react = (emoji: string) => {
    float(emoji);
    void channel.current?.send({ type: "broadcast", event: "reaction", payload: { emoji } });
  };

  async function tip() {
    setTipping(true);
    try {
      await tipHunter(videoId);
      react("\u{1F4B0}");
      toast.success(`Sent ${MICRO_TIP} LC (${formatCoinCash(MICRO_TIP)}) to the reporter.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "That tip could not be sent.");
    } finally {
      setTipping(false);
    }
  }

  return (
    <>
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {floaters.map((f) => (
          <span
            key={f.id}
            className="absolute bottom-12 animate-float-up text-2xl"
            style={{ left: `${f.left}%` }}
            aria-hidden
          >
            {f.emoji}
          </span>
        ))}
      </div>

      <div className="absolute bottom-2 left-2 right-2 flex items-center gap-1.5">
        {REACTIONS.map((emoji) => (
          <button
            key={emoji}
            type="button"
            onClick={() => react(emoji)}
            aria-label={`React ${emoji}`}
            className="flex size-9 items-center justify-center rounded-full bg-background/70 text-base backdrop-blur transition-transform active:scale-90"
          >
            {emoji}
          </button>
        ))}
        <button
          type="button"
          onClick={() => void tip()}
          disabled={tipping}
          className="ml-auto inline-flex items-center gap-1 rounded-full bg-signal px-3 py-2 text-[0.66rem] font-extrabold uppercase tracking-[0.1em] text-signal-foreground disabled:opacity-60"
        >
          <HandCoins className="size-3.5" aria-hidden /> Tip {MICRO_TIP} LC
        </button>
      </div>
    </>
  );
}
