// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import { cn } from "@/lib/utils";

/**
 * Two-tone rule on Discover: the top sentence (venue/category name) is white,
 * the sentence underneath is neon lime (styled separately by the caller).
 */
export function TwoToneName({ name, className }: { name: string; className?: string }) {
  return <span className={cn("text-foreground", className)}>{name}</span>;
}
