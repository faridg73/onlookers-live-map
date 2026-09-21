// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import { cn } from "@/lib/utils";

/** Renders a name two-tone: first word neon lime, the rest white. */
export function TwoToneName({ name, className }: { name: string; className?: string }) {
  const [first, ...rest] = name.split(" ");
  return (
    <span className={cn("text-foreground", className)}>
      <span className="text-signal">{first}</span>
      {rest.length > 0 ? ` ${rest.join(" ")}` : ""}
    </span>
  );
}
