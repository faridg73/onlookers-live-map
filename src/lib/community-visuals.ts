import {
  BookOpen,
  CalendarDays,
  Globe2,
  Home,
  Languages,
  Music,
  Store,
  Users,
  type LucideIcon,
} from "lucide-react";
import friendsImage from "@/assets/discover-friends.jpg";
import meetupsImage from "@/assets/discover-meetups.jpg";
import tutorialsImage from "@/assets/discover-tutorials.jpg";
import languageImage from "@/assets/discover-language.jpg";
import cultureImage from "@/assets/discover-culture.jpg";
import realestateImage from "@/assets/discover-realestate.jpg";
import marketsImage from "@/assets/discover-markets.jpg";
import eventsImage from "@/assets/discover-events.jpg";
import type { CommunityCategory } from "@/lib/community";

export type CommunityVisual = {
  image: string;
  icon: LucideIcon;
  coverClass: string;
};

export const COMMUNITY_VISUALS: Record<CommunityCategory, CommunityVisual> = {
  friends: { image: friendsImage, icon: Users, coverClass: "discover-cover-friends" },
  meetups: { image: meetupsImage, icon: CalendarDays, coverClass: "discover-cover-meetups" },
  tutorials: { image: tutorialsImage, icon: BookOpen, coverClass: "discover-cover-tutorials" },
  language: { image: languageImage, icon: Languages, coverClass: "discover-cover-language" },
  culture: { image: cultureImage, icon: Globe2, coverClass: "discover-cover-culture" },
  realestate: { image: realestateImage, icon: Home, coverClass: "discover-cover-realestate" },
  markets: { image: marketsImage, icon: Store, coverClass: "discover-cover-markets" },
  events: { image: eventsImage, icon: Music, coverClass: "discover-cover-events" },
};
