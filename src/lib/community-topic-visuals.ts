// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
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
import friendsCoffee from "@/assets/community/friends-coffee.webp.asset.json";
import friendsGym from "@/assets/community/friends-gym.webp.asset.json";
import friendsNewInTown from "@/assets/community/friends-new-in-town.webp.asset.json";
import friendsWalk from "@/assets/community/friends-walk.webp.asset.json";
import languageFluent from "@/assets/community/language-fluent.webp.asset.json";
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
import realestateNeighborhoodTours from "@/assets/community/realestate-neighborhood-tours.webp.asset.json";
import realestateOpenHouses from "@/assets/community/realestate-open-houses.webp.asset.json";
import tutorialsCooking from "@/assets/community/tutorials-cooking.webp.asset.json";
import tutorialsTech from "@/assets/community/tutorials-tech.webp.asset.json";

type TopicVisual = { image: string; alt: string };

export const COMMUNITY_TOPIC_VISUALS: Record<CommunityCategory, Record<string, TopicVisual>> = {
  breaking: {
    "happening now": { image: eventsSpontaneousGatherings.url, alt: "A crowd gathering around breaking events in a city square" },
    accident: { image: realestateCommercialSites.url, alt: "Emergency crews working around a city street scene" },
    weather: { image: cultureFestival.url, alt: "People outdoors as weather moves over the neighborhood" },
    "road closure": { image: realestateCommercialSites.url, alt: "A closed city street with barriers and crews" },
    protest: { image: eventsSpontaneousGatherings.url, alt: "A large public gathering in a city square" },
    fire: { image: realestateCommercialSites.url, alt: "Emergency response visible above city rooftops" },
  },
  culture: {
    "street festival": { image: cultureFestival.url, alt: "A lively local cultural procession" },
    parade: { image: eventsFestivals.url, alt: "A colorful daytime community parade" },
    "local history": { image: cultureHistory.url, alt: "A guide sharing local harbor history" },
    "hidden gem": { image: cultureHiddenGem.url, alt: "A hidden garden tucked behind a city street" },
    "street art": { image: cultureStreetArt.url, alt: "Artists painting a vibrant neighborhood mural" },
    "food scene": { image: cultureMarket.url, alt: "A colorful neighborhood food market" },
  },
  traffic: {
    commute: { image: realestateNeighborhoodTours.url, alt: "A busy city street during commute time" },
    "road work": { image: realestateCommercialSites.url, alt: "Road work crews and equipment on a city street" },
    transit: { image: realestateNeighborhoodTours.url, alt: "People walking toward a transit stop in a busy neighborhood" },
    parking: { image: realestateOpenHouses.url, alt: "A city block with parked cars and open lots" },
    detour: { image: realestateCommercialSites.url, alt: "Traffic rerouted around a street closure" },
  },
  markets: {
    "flea markets": { image: marketsFleaMarkets.url, alt: "Shoppers browsing tables at a busy flea market" },
    "garage sales": { image: marketsGarageSales.url, alt: "An organized neighborhood garage sale" },
    "farmers markets": { image: cultureMarket.url, alt: "Fresh produce stalls at a farmers market" },
    "street vendors": { image: marketsStreetVendors.url, alt: "Customers browsing colorful street vendor stalls" },
    "antique fairs": { image: marketsAntiqueFairs.url, alt: "Vintage furniture and collectibles at an antique fair" },
  },
  meetups: {
    tonight: { image: meetupsTonight.url, alt: "Friends gathering for rooftop trivia tonight" },
    food: { image: meetupsFood.url, alt: "A lively local restaurant meetup" },
    "new in town": { image: friendsNewInTown.url, alt: "New neighbors meeting over coffee" },
    music: { image: meetupsMusic.url, alt: "Friends sharing a music listening session" },
    outdoors: { image: meetupsOutdoors.url, alt: "A local group hiking together outdoors" },
    free: { image: meetupsFree.url, alt: "People sketching together at a free park meetup" },
  },
  arts: {
    "live music": { image: eventsLiveMusic.url, alt: "A band performing live in an intimate venue" },
    "street buskers": { image: eventsStreetBuskers.url, alt: "A brass street performer playing on a public plaza" },
    theater: { image: eventsFestivals.url, alt: "An excited crowd outside a theater on opening night" },
    "gallery walk": { image: cultureStreetArt.url, alt: "Visitors viewing artwork during a gallery walk" },
    "open mic": { image: eventsLiveMusic.url, alt: "A performer on a small stage during an open mic night" },
  },
  sports: {
    "pickup game": { image: meetupsSports.url, alt: "A casual outdoor pickup sports game" },
    "match day": { image: eventsFestivals.url, alt: "Fans gathering outside a stadium on match day" },
    running: { image: friendsWalk.url, alt: "A running group on a waterfront path" },
    skate: { image: meetupsOutdoors.url, alt: "Skaters gathering at an outdoor park" },
    fitness: { image: friendsGym.url, alt: "People training together during an outdoor workout" },
  },
  general: {
    "just looking around": { image: friendsWalk.url, alt: "A relaxed live walk through a neighborhood" },
    "ask me anything": { image: languageFluent.url, alt: "A local answering questions in a lively conversation" },
    "day in the life": { image: tutorialsCooking.url, alt: "Behind the counter during a busy morning shift" },
    "scenic views": { image: cultureHiddenGem.url, alt: "A scenic overlook at golden hour" },
  },
};

export function communityTopicVisual(category: CommunityCategory, tag: string) {
  return COMMUNITY_TOPIC_VISUALS[category][tag];
}
