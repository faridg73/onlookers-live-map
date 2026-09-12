import { useEffect, useMemo, useState } from "react";

const COLORS = [
  "var(--color-signal)",
  "var(--color-live)",
  "var(--color-foreground)",
  "var(--color-signal)",
];

/**
 * Lightweight celebratory burst shown when a bounty is approved. It clears
 * itself after the animation so nothing lingers over the chat.
 */
export function Confetti({ onDone }: { onDone?: () => void }) {
  const [visible, setVisible] = useState(true);

  const pieces = useMemo(
    () =>
      Array.from({ length: 60 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 0.5,
        duration: 1.6 + Math.random() * 1.2,
        size: 6 + Math.random() * 8,
        rotate: Math.random() * 360,
        color: COLORS[i % COLORS.length] as string,
      })),
    [],
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      onDone?.();
    }, 3200);
    return () => clearTimeout(timer);
  }, [onDone]);

  if (!visible) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[60] overflow-hidden" aria-hidden>
      {pieces.map((piece) => (
        <span
          key={piece.id}
          className="absolute top-[-10%] block rounded-[2px] animate-confetti"
          style={{
            left: `${piece.left}%`,
            width: piece.size,
            height: piece.size * 0.5,
            backgroundColor: piece.color,
            animationDelay: `${piece.delay}s`,
            animationDuration: `${piece.duration}s`,
            transform: `rotate(${piece.rotate}deg)`,
          }}
        />
      ))}
    </div>
  );
}
