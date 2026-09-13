import type { CommunityCategory } from "@/lib/community";

import cultureFestival from "@/assets/community/culture-festival.webp.asset.json";
import cultureHiddenGem from "@/assets/community/culture-hidden-gem.webp.asset.json";
import cultureHistory from "@/assets/community/culture-history.webp.asset.json";
import cultureMarket from "@/assets/community/culture-market.webp.asset.json";
import cultureStreetArt from "@/assets/community/culture-street-art.webp.asset.json";
import eventsFestivals from "@/assets/community/events-festivals.webp.asset.json";
import eventsLiveMusic from "@/assets/community/events-live-music.webp.asset.json";
import eventsSpontaneousGatherings from "@/assets/community/events-spontaneous-gatherings.webp.asset.json";
import eventsStreetBuskers from "@/assets/community/events-street-buskers.webp.asset.json";
import friends20s from "@/assets/community/friends-20s.webp.asset.json";
import friends30s from "@/assets/community/friends-30s.webp.asset.json";
import friendsCoffee from "@/assets/community/friends-coffee.webp.asset.json";
import friendsGym from "@/assets/community/friends-gym.webp.asset.json";
import friendsNewInTown from "@/assets/community/friends-new-in-town.webp.asset.json";
import friendsWalk from "@/assets/community/friends-walk.webp.asset.json";
import languageBeginner from "@/assets/community/language-beginner.webp.asset.json";
import languageEnglish from "@/assets/community/language-english.webp.asset.json";
import languageFluent from "@/assets/community/language-fluent.webp.asset.json";
import languageFrench from "@/assets/community/language-french.webp.asset.json";
import languageJapanese from "@/assets/community/language-japanese.webp.asset.json";
import languageSpanish from "@/assets/community/language-spanish.webp.asset.json";
import marketsAntiqueFairs from "@/assets/community/markets-antique-fairs.webp.asset.json";
import marketsFleaMarkets from "@/assets/community/markets-flea-markets.webp.asset.json";
import marketsGarageSales from "@/assets/community/markets-garage-sales.webp.asset.json";
import marketsStreetVendors from "@/assets/community/markets-street-vendors.webp.asset.json";
import meetupsFood from "@/assets/community/meetups-food.webp.asset.json";
import meetupsFree from "@/assets/community/meetups-free.webp.asset.json";
import meetupsMusic from "@/assets/community/meetups-music.webp.asset.json";
import meetupsOutdoors from "@/assets/community/meetups-outdoors.webp.asset.json";
import meetupsSports from "@/assets/community/meetups-sports.webp.asset.json";
import meetupsTonight from "@/assets/community/meetups-tonight.webp.asset.json";
import realestateCommercialSites from "@/assets/community/realestate-commercial-sites.webp.asset.json";
import realestateHomeRenovations from "@/assets/community/realestate-home-renovations.webp.asset.json";
import realestateNeighborhoodTours from "@/assets/community/realestate-neighborhood-tours.webp.asset.json";
import realestateOpenHouses from "@/assets/community/realestate-open-houses.webp.asset.json";
import tutorials10Min from "@/assets/community/tutorials-10-min.webp.asset.json";
import tutorialsBeginner from "@/assets/community/tutorials-beginner.webp.asset.json";
import tutorialsCooking from "@/assets/community/tutorials-cooking.webp.asset.json";
import tutorialsMusic from "@/assets/community/tutorials-music.webp.asset.json";
import tutorialsRepair from "@/assets/community/tutorials-repair.webp.asset.json";
import tutorialsTech from "@/assets/community/tutorials-tech.webp.asset.json";

type TopicVisual = { image: string; alt: string };

export const COMMUNITY_TOPIC_VISUALS: Record<CommunityCategory, Record<string, TopicVisual>> = {
  friends: {
    "new in town": { image: friendsNewInTown.url, alt: "New neighbors meeting over coffee" },
    coffee: { image: friendsCoffee.url, alt: "Friends talking together in a neighborhood cafe" },
    walk: { image: friendsWalk.url, alt: "Local walking group beside the waterfront" },
    gym: { image: friendsGym.url, alt: "Two friends training together at a gym" },
    "20s": { image: friends20s.url, alt: "Friends in their twenties enjoying a game night" },
    "30s": { image: friends30s.url, alt: "Friends in their thirties meeting for brunch" },
  },
  meetups: {
    tonight: { image: meetupsTonight.url, alt: "Friends gathering for rooftop trivia tonight" },
    food: { image: meetupsFood.url, alt: "A lively local restaurant meetup" },
    music: { image: meetupsMusic.url, alt: "Friends sharing a music listening session" },
    sports: { image: meetupsSports.url, alt: "A casual outdoor pickup sports meetup" },
    outdoors: { image: meetupsOutdoors.url, alt: "A local group hiking together outdoors" },
    free: { image: meetupsFree.url, alt: "People sketching together at a free park meetup" },
  },
  tutorials: {
    beginner: { image: tutorialsBeginner.url, alt: "A beginner learning practical photography" },
    cooking: { image: tutorialsCooking.url, alt: "Hands demonstrating how to prepare dumplings" },
    music: { image: tutorialsMusic.url, alt: "A close guitar lesson in progress" },
    repair: { image: tutorialsRepair.url, alt: "A bicycle tire repair demonstration" },
    tech: { image: tutorialsTech.url, alt: "A phone photo organization tutorial" },
    "10 min": { image: tutorials10Min.url, alt: "Hands demonstrating how to fold a fitted sheet" },
  },
  language: {
    english: { image: languageEnglish.url, alt: "English conversation practice over lunch" },
    spanish: { image: languageSpanish.url, alt: "Spanish language partners practicing at a cafe" },
    french: { image: languageFrench.url, alt: "French vocabulary practice at a produce market" },
    japanese: { image: languageJapanese.url, alt: "Japanese conversation tutoring with a tablet" },
    beginner: { image: languageBeginner.url, alt: "A beginner language learner following a guided lesson" },
    fluent: { image: languageFluent.url, alt: "Fluent speakers sharing an animated conversation" },
  },
  culture: {
    market: { image: cultureMarket.url, alt: "A colorful neighborhood produce market" },
    festival: { image: cultureFestival.url, alt: "A lively local cultural procession" },
    history: { image: cultureHistory.url, alt: "A guide sharing local harbor history" },
    "hidden gem": { image: cultureHiddenGem.url, alt: "A hidden garden tucked behind a city street" },
    "street art": { image: cultureStreetArt.url, alt: "Artists painting a vibrant neighborhood mural" },
  },
  realestate: {
    "open houses": { image: realestateOpenHouses.url, alt: "Visitors touring a bright modern open house" },
    "home renovations": { image: realestateHomeRenovations.url, alt: "Craftspeople completing a kitchen renovation" },
    "commercial sites": { image: realestateCommercialSites.url, alt: "A commercial building under construction" },
    "neighborhood tours": { image: realestateNeighborhoodTours.url, alt: "A guided walking tour through a residential neighborhood" },
  },
  markets: {
    "flea markets": { image: marketsFleaMarkets.url, alt: "Shoppers browsing tables at a busy flea market" },
    "garage sales": { image: marketsGarageSales.url, alt: "An organized neighborhood garage sale" },
    "street vendors": { image: marketsStreetVendors.url, alt: "Customers browsing colorful street vendor stalls" },
    "antique fairs": { image: marketsAntiqueFairs.url, alt: "Vintage furniture and collectibles at an antique fair" },
  },
  events: {
    "live music": { image: eventsLiveMusic.url, alt: "A band performing live in an intimate venue" },
    "street buskers": { image: eventsStreetBuskers.url, alt: "A brass street performer playing on a public plaza" },
    festivals: { image: eventsFestivals.url, alt: "A colorful daytime community festival" },
    "spontaneous gatherings": { image: eventsSpontaneousGatherings.url, alt: "A joyful spontaneous gathering in a city square" },
  },
};

export function communityTopicVisual(category: CommunityCategory, tag: string) {
  return COMMUNITY_TOPIC_VISUALS[category][tag];
}