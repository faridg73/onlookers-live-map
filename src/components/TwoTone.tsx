// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import { cn } from "@/lib/utils";

/** Renders a name two-tone: first word white, the rest neon lime. */
export function TwoToneName({ name, className }: { name: string; className?: string }) {
  const [first, ...rest] = name.split(" ");
  return (
    <span className={cn("text-foreground", className)}>
      {first}
      {rest.length > 0 ? <> <span className="text-signal">{rest.join(" ")}</span></> : null}
    </span>
  );
}
