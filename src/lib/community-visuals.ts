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
import cultureImage from "@/assets/discover-culture.jpg";
import marketsImage from "@/assets/discover-markets.jpg";
import meetupsImage from "@/assets/discover-meetups.jpg";
import eventsImage from "@/assets/discover-events.jpg";
import realestateImage from "@/assets/discover-realestate.jpg";
import friendsImage from "@/assets/discover-friends.jpg";
import tutorialsImage from "@/assets/discover-tutorials.jpg";
import languageImage from "@/assets/discover-language.jpg";
import type { CommunityCategory } from "@/lib/community";

export type CommunityVisual = {
  image: string;
  icon: LucideIcon;
  coverClass: string;
};

export const COMMUNITY_VISUALS: Record<CommunityCategory, CommunityVisual> = {
  breaking: { image: realestateImage, icon: Megaphone, coverClass: "discover-cover-breaking" },
  culture: { image: cultureImage, icon: Globe2, coverClass: "discover-cover-culture" },
  traffic: { image: languageImage, icon: TrafficCone, coverClass: "discover-cover-traffic" },
  markets: { image: marketsImage, icon: Store, coverClass: "discover-cover-markets" },
  meetups: { image: meetupsImage, icon: CalendarDays, coverClass: "discover-cover-meetups" },
  arts: { image: eventsImage, icon: Music, coverClass: "discover-cover-arts" },
  sports: { image: friendsImage, icon: Trophy, coverClass: "discover-cover-sports" },
  general: { image: tutorialsImage, icon: Sparkles, coverClass: "discover-cover-general" },
};
