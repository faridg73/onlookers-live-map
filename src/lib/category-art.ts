// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import artsImage from "@/assets/cat-arts.jpg";
import breakingImage from "@/assets/cat-breaking.jpg";
import carsImage from "@/assets/cat-cars.jpg";
import casualImage from "@/assets/cat-casual.jpg";
import communityImage from "@/assets/cat-community.jpg";
import fashionImage from "@/assets/cat-fashion.jpg";
import fitnessImage from "@/assets/cat-fitness.jpg";
import foodImage from "@/assets/cat-food.jpg";
import natureImage from "@/assets/cat-nature.jpg";
import nightlifeImage from "@/assets/cat-nightlife.jpg";
import petsImage from "@/assets/cat-pets.jpg";
import realestateImage from "@/assets/cat-realestate.jpg";
import shoppingImage from "@/assets/cat-shopping.jpg";
import sportsImage from "@/assets/cat-sports.jpg";
import techImage from "@/assets/cat-tech.jpg";
import trafficImage from "@/assets/cat-traffic.jpg";
import type { BroadcastCategoryId } from "@/lib/broadcast-categories";

/** Custom neon cover art for each broadcast/vibe category. */
export const BROADCAST_CATEGORY_ART: Record<BroadcastCategoryId, string> = {
  "breaking-incidents": breakingImage,
  "traffic-updates": trafficImage,
  "arts-performances": artsImage,
  "food-dining": foodImage,
  "car-culture": carsImage,
  "street-fashion": fashionImage,
  "events-sports": sportsImage,
  "nature-wildlife": natureImage,
  "real-estate": realestateImage,
  nightlife: nightlifeImage,
  "tech-innovation": techImage,
  "shopping-retail": shoppingImage,
  "fitness-outdoors": fitnessImage,
  "pets-animals": petsImage,
  "community-culture": communityImage,
  "casual-irl": casualImage,
};
