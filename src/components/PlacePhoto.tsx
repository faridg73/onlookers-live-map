// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import { useState } from "react";
import { cn } from "@/lib/utils";

type Props = {
  src: string | null | undefined;
  alt: string;
  /** Name of the real venue/event, used for the identity tile when no verified photo exists. */
  identity?: string;
  /** Small line under the identity initials, e.g. the venue type or city. */
  identityNote?: string | null;
  className?: string;
  eager?: boolean;
};

function initialsOf(label: string) {
  const words = label
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0]!.slice(0, 2).toUpperCase();
  return `${words[0]![0]!}${words[1]![0]!}`.toUpperCase();
}

function hueOf(label: string) {
  let hash = 0;
  for (let i = 0; i < label.length; i += 1) hash = (hash * 31 + label.charCodeAt(i)) % 360;
  return hash;
}

/**
 * Real venue/event photography only. When a place has no verified photo we show a
 * deterministic identity tile built from its own name instead of stock artwork, so
 * no two unrelated cards ever share the same picture.
 */
export function PlacePhoto({ src, alt, identity, identityNote, className, eager = false }: Props) {
  const [failed, setFailed] = useState(false);
  const usable = src && !failed ? src : null;

  if (!usable) {
    const label = identity ?? alt;
    const hue = hueOf(label);
    return (
      <div
        role="img"
        aria-label={`${label} (no verified photo yet)`}
        className={cn(
          "flex size-full flex-col items-center justify-center gap-1 overflow-hidden bg-surface-raised px-2 text-center",
          className,
        )}
        style={{
          backgroundImage: `linear-gradient(135deg, hsl(${hue} 70% 12%), hsl(${(hue + 40) % 360} 70% 6%))`,
        }}
      >
        <span className="font-display text-xl leading-none text-signal">{initialsOf(label)}</span>
        <span className="line-clamp-2 text-[0.58rem] font-semibold uppercase tracking-[0.1em] text-foreground/70">
          {identityNote ?? label}
        </span>
      </div>
    );
  }

  return (
    <img
      src={usable}
      alt={alt}
      loading={eager ? "eager" : "lazy"}
      width={1200}
      height={675}
      onError={() => setFailed(true)}
      className={cn("size-full object-cover", className)}
    />
  );
}
