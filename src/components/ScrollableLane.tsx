// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

type ScrollableLaneProps = {
  children: React.ReactNode;
  className?: string;
  innerClassName?: string;
  ariaLabel?: string;
  arrows?: boolean;
  fade?: boolean;
  fadeClassName?: string;
  arrowClassName?: string;
};

export function ScrollableLane({
  children,
  className,
  innerClassName,
  ariaLabel,
  arrows = true,
  fade = true,
  fadeClassName = "from-background via-background/80 to-transparent",
  arrowClassName = "border-border bg-background/90 text-foreground hover:border-signal hover:text-signal",
}: ScrollableLaneProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollState = () => {
    const el = scrollRef.current;
    if (!el) return;
    const left = el.scrollLeft;
    const max = el.scrollWidth - el.clientWidth;
    setCanScrollLeft(left > 1);
    setCanScrollRight(left < max - 1);
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    updateScrollState();
    el.addEventListener("scroll", updateScrollState, { passive: true });
    const ro = new ResizeObserver(updateScrollState);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", updateScrollState);
      ro.disconnect();
    };
  }, []);

  const scrollBy = (direction: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    const amount = el.clientWidth * 0.75;
    el.scrollBy({ left: direction === "left" ? -amount : amount, behavior: "smooth" });
  };

  return (
    <div className={cn("relative", className)}>
      <div
        ref={scrollRef}
        aria-label={ariaLabel}
        className={cn("flex overflow-x-auto scrollbar-thin", innerClassName)}
      >
        {children}
      </div>
      {fade && canScrollRight && (
        <div
          className={cn(
            "pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l sm:w-14",
            fadeClassName
          )}
        />
      )}
      {arrows && canScrollRight && (
        <button
          type="button"
          onClick={() => scrollBy("right")}
          aria-label="Scroll right"
          className={cn(
            "absolute right-2 top-1/2 hidden -translate-y-1/2 place-items-center rounded-full border p-1.5 shadow-lg backdrop-blur-sm transition sm:grid",
            arrowClassName
          )}
        >
          <ChevronRight className="size-4" />
        </button>
      )}
      {arrows && canScrollLeft && (
        <button
          type="button"
          onClick={() => scrollBy("left")}
          aria-label="Scroll left"
          className={cn(
            "absolute left-2 top-1/2 hidden -translate-y-1/2 place-items-center rounded-full border p-1.5 shadow-lg backdrop-blur-sm transition sm:grid",
            arrowClassName
          )}
        >
          <ChevronLeft className="size-4" />
        </button>
      )}
    </div>
  );
}
