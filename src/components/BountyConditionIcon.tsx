// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import { Cloud, CloudLightning, CloudRain, MoonStar, Sun } from "lucide-react";

const CONDITION_ICONS = {
  clear: Sun,
  night: MoonStar,
  rain: CloudRain,
  severe: CloudLightning,
} as const;

/** Weather/lighting icon for a filming condition id from WEATHER_CONDITIONS. */
export function BountyConditionIcon({ id, className }: { id: string; className?: string }) {
  const Icon = CONDITION_ICONS[id as keyof typeof CONDITION_ICONS] ?? Cloud;
  return <Icon className={className} strokeWidth={2.5} aria-hidden="true" />;
}
