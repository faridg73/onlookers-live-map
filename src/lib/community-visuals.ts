// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import {
  CalendarDays,
  Globe2,
  Megaphone,
  Music,
  Sparkles,
  Store,
  TrafficCone,
  Trophy,
  type LucideIcon,
} from "lucide-react";
import breakingImage from "@/assets/cat-breaking.jpg";
import cultureImage from "@/assets/cat-community.jpg";
import trafficImage from "@/assets/cat-commute.jpg";
import marketsImage from "@/assets/cat-shopping.jpg";
import meetupsImage from "@/assets/cat-casual.jpg";
import artsImage from "@/assets/cat-arts.jpg";
import sportsImage from "@/assets/cat-sports.jpg";
import generalImage from "@/assets/cat-general.jpg";
import type { CommunityCategory } from "@/lib/community";

export type CommunityVisual = {
  image: string;
  icon: LucideIcon;
  coverClass: string;
};

export const COMMUNITY_VISUALS: Record<CommunityCategory, CommunityVisual> = {
  breaking: { image: breakingImage, icon: Megaphone, coverClass: "discover-cover-breaking" },
  culture: { image: cultureImage, icon: Globe2, coverClass: "discover-cover-culture" },
  traffic: { image: trafficImage, icon: TrafficCone, coverClass: "discover-cover-traffic" },
  markets: { image: marketsImage, icon: Store, coverClass: "discover-cover-markets" },
  meetups: { image: meetupsImage, icon: CalendarDays, coverClass: "discover-cover-meetups" },
  arts: { image: artsImage, icon: Music, coverClass: "discover-cover-arts" },
  sports: { image: sportsImage, icon: Trophy, coverClass: "discover-cover-sports" },
  general: { image: generalImage, icon: Sparkles, coverClass: "discover-cover-general" },
};
