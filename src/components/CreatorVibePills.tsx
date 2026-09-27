// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import { Button } from "@/components/ui/button";
import { CREATOR_VIBES, type CreatorVibe } from "@/lib/creator-vibes";
import { cn } from "@/lib/utils";

export function CreatorVibePills({
  activeId,
  onSelect,
  allLabel = "All vibes",
  className,
}: {
  activeId: string | null;
  onSelect: (vibe: CreatorVibe | null) => void;
  allLabel?: string;
  className?: string;
}) {
  return (
    <div className={cn("relative", className)}>
      <div
        className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        aria-label="Creator vibe filters"
      >
        <Button
          type="button"
          variant="outline"
          size="sm"
          aria-pressed={activeId === null}
          onClick={() => onSelect(null)}
          className={cn(
            "h-9 shrink-0 rounded-full px-3 text-[0.68rem] font-extrabold uppercase tracking-[0.1em]",
            "animate-all-vibes-flash motion-reduce:animate-none",
            activeId === null
              ? "border-signal bg-signal text-signal-foreground"
              : "border-border bg-surface text-muted-foreground",
          )}
        >
          {allLabel}
        </Button>
        {CREATOR_VIBES.map((vibe) => {
          const active = activeId === vibe.id;
          return (
            <Button
              key={vibe.id}
              type="button"
              variant="outline"
              size="sm"
              aria-pressed={active}
              title={vibe.hint}
              onClick={() => onSelect(vibe)}
              className={cn(
                "h-9 shrink-0 rounded-full px-3 text-[0.68rem] font-extrabold uppercase tracking-[0.1em]",
                active
                  ? "border-signal bg-signal text-signal-foreground"
                  : "border-border bg-surface text-muted-foreground hover:border-signal/60 hover:text-foreground",
              )}
            >
              <span aria-hidden>{vibe.icon}</span>
              {vibe.label}
            </Button>
          );
        })}
      </div>
      {/* Subtle moving lime glow on the right edge, hinting there is more to scroll */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 w-14"
        style={{
          maskImage: "linear-gradient(to left, black 0%, transparent 100%)",
          WebkitMaskImage: "linear-gradient(to left, black 0%, transparent 100%)",
        }}
      >
        <div
          className="animate-vibe-hint motion-reduce:animate-none absolute inset-y-0 right-0 w-10"
          style={{
            background:
              "linear-gradient(to left, rgba(204, 255, 0, 0.85) 0%, rgba(204, 255, 0, 0.35) 55%, transparent 100%)",
          }}
        />
      </div>
    </div>
  );
}
