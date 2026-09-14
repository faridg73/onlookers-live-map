import eventsImage from "@/assets/place-category-events.jpg.asset.json";
import foodImage from "@/assets/place-category-food.jpg.asset.json";
import landmarksImage from "@/assets/place-category-landmarks.jpg.asset.json";
import mallsImage from "@/assets/place-category-malls.jpg.asset.json";
import marketsImage from "@/assets/place-category-markets.jpg.asset.json";
import nightlifeImage from "@/assets/place-category-nightlife.jpg.asset.json";
import performancesImage from "@/assets/place-category-performances.jpg.asset.json";
import scenicImage from "@/assets/place-category-scenic.jpg.asset.json";
import transitImage from "@/assets/place-category-transit.jpg.asset.json";

const GROUP_IMAGES: Record<string, string> = {
  events: eventsImage.url,
  entertainment: eventsImage.url,
  happening: eventsImage.url,
  malls: mallsImage.url,
  food: foodImage.url,
  nightlife: nightlifeImage.url,
  transit: transitImage.url,
  traffic: transitImage.url,
  landmarks: landmarksImage.url,
  neighborhoods: landmarksImage.url,
  scenic: scenicImage.url,
  performances: performancesImage.url,
  markets: marketsImage.url,
};

export function discoveryImage(groupSlug: string) {
  return GROUP_IMAGES[groupSlug] ?? landmarksImage.url;
}