// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import artsImage from "@/assets/cat-arts.jpg";
import breakingImage from "@/assets/cat-breaking.jpg";
import casualImage from "@/assets/cat-casual.jpg";
import communityImage from "@/assets/cat-community.jpg";
import commuteImage from "@/assets/cat-commute.jpg";
import foodImage from "@/assets/cat-food.jpg";
import natureImage from "@/assets/cat-nature.jpg";
import nightlifeImage from "@/assets/cat-nightlife.jpg";
import realestateImage from "@/assets/cat-realestate.jpg";
import shoppingImage from "@/assets/cat-shopping.jpg";
import sportsImage from "@/assets/cat-sports.jpg";
import trafficImage from "@/assets/cat-traffic.jpg";

const GROUP_IMAGES: Record<string, string> = {
  events: sportsImage,
  entertainment: nightlifeImage,
  happening: communityImage,
  malls: shoppingImage,
  food: foodImage,
  nightlife: nightlifeImage,
  transit: trafficImage,
  traffic: commuteImage,
  landmarks: realestateImage,
  neighborhoods: casualImage,
  scenic: natureImage,
  performances: artsImage,
  markets: communityImage,
};

export function discoveryImage(groupSlug: string) {
  return GROUP_IMAGES[groupSlug] ?? breakingImage;
}
