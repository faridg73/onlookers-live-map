import eventsImage from "@/assets/place-category-events.jpg";
import foodImage from "@/assets/place-category-food.jpg";
import landmarksImage from "@/assets/place-category-landmarks.jpg";
import mallsImage from "@/assets/place-category-malls.jpg";
import marketsImage from "@/assets/place-category-markets.jpg";
import nightlifeImage from "@/assets/place-category-nightlife.jpg";
import performancesImage from "@/assets/place-category-performances.jpg";
import scenicImage from "@/assets/place-category-scenic.jpg";
import transitImage from "@/assets/place-category-transit.jpg";

const GROUP_IMAGES: Record<string, string> = {
  events: eventsImage,
  entertainment: eventsImage,
  happening: eventsImage,
  malls: mallsImage,
  food: foodImage,
  nightlife: nightlifeImage,
  transit: transitImage,
  traffic: transitImage,
  landmarks: landmarksImage,
  neighborhoods: landmarksImage,
  scenic: scenicImage,
  performances: performancesImage,
  markets: marketsImage,
};

export function discoveryImage(groupSlug: string) {
  return GROUP_IMAGES[groupSlug] ?? landmarksImage;
}