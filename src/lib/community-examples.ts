// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import type { CommunityCategory } from "@/lib/community";

/**
 * Curated starter stories shown when a lane has no real posts yet. They are
 * editorial prompts rather than invented user posts or uploads.
 */
export type ExampleSeed = {
  id: string;
  tag: string;
  title: string;
  body: string;
  kicker: string;
};

type SeedCopy = Omit<ExampleSeed, "id" | "tag">;

const COPY: Record<CommunityCategory, Record<string, SeedCopy>> = {
  breaking: {
    "happening now": { kicker: "Happening now", title: "Crews responding at the harbor intersection", body: "Live view of the scene, which streets are closed and the safest way around it." },
    accident: { kicker: "Accident", title: "Multi-car scene on the northbound ramp", body: "See how many lanes are open, where tow trucks are staging and the delay heading downtown." },
    weather: { kicker: "Weather", title: "Storm front rolling over the bay", body: "Street-level look at rainfall, wind and how the waterfront paths are holding up." },
    "road closure": { kicker: "Road closure", title: "Main Street blocked between 3rd and 5th", body: "Live from the barricade, showing detour signs and how traffic is being routed." },
    protest: { kicker: "Public gathering", title: "March forming outside city hall", body: "Crowd size, street access and the atmosphere from a safe public vantage point." },
    fire: { kicker: "Emergency", title: "Smoke visible above the eastside rooftops", body: "What is visible from the public road, which blocks are taped off and where crews are working." },
  },
  culture: {
    "street festival": { kicker: "Street festival", title: "Block party on Cedar before the rush", body: "Walk the stalls, hear the first band and see where the shortest food lines are." },
    parade: { kicker: "Parade", title: "Parade route from the good corner", body: "Live from the curb with the best sightlines, showing floats, crowds and where to stand." },
    "local history": { kicker: "Local history", title: "The hidden story behind the old harbor wall", body: "A short walk connecting three landmarks that explain how the waterfront changed." },
    "hidden gem": { kicker: "Hidden gem", title: "A pocket garden behind the busy avenue", body: "Step through an easy-to-miss passage into one of the neighborhood's quietest public spaces." },
    "street art": { kicker: "Street art", title: "New mural route with the artist stories", body: "A block-by-block look at fresh walls, signatures and details that are easy to miss." },
    "food scene": { kicker: "Food scene", title: "Night market eats locals actually queue for", body: "A live walk past the busiest stalls with a closer look at anything on request." },
  },
  traffic: {
    commute: { kicker: "Commute", title: "Rush-hour crawl on the southbound corridor", body: "Live lane-by-lane look at the backup, ramp meters and where it finally opens up." },
    "road work": { kicker: "Road work", title: "Overnight repaving on the bridge approach", body: "Which lanes are coned off, the flagger rhythm and how long the cycle takes." },
    transit: { kicker: "Transit", title: "Platform crowd at Central Station", body: "See whether the delay notices are real, how packed the next train looks and the overflow buses." },
    parking: { kicker: "Parking", title: "Downtown lot status before the evening rush", body: "Which garages still have open floors and the street parking situation around the venue." },
    detour: { kicker: "Detour", title: "Utility closure rerouting traffic on 9th", body: "Live from the closure, showing the signed detour and how it's actually flowing." },
  },
  markets: {
    "flea markets": { kicker: "Flea markets", title: "Vintage aisle treasure hunt under $40", body: "Scan the tables for records, clothing and odd finds worth inspecting more closely." },
    "garage sales": { kicker: "Garage sales", title: "Early garage-sale finds before the good stuff goes", body: "A quick look at furniture, kitchenware, books and prices from the driveway." },
    "farmers markets": { kicker: "Farmers markets", title: "Saturday produce run at opening hour", body: "What's in season, which stalls have lines and the freshest-looking stands today." },
    "street vendors": { kicker: "Street vendors", title: "Best plates and shortest lines on the block", body: "Compare today's menus, wait times and what regulars keep ordering." },
    "antique fairs": { kicker: "Antique fairs", title: "Furniture and collectibles with stories attached", body: "Browse period pieces, maker marks and unusual finds with a closer view on request." },
  },
  meetups: {
    tonight: { kicker: "Tonight", title: "Rooftop trivia team needs two more", body: "First round starts at 7:30. No trivia expertise required, just bring one oddly specific fact." },
    food: { kicker: "Food meetup", title: "Three-stop taco crawl on Bristol", body: "We are comparing the house specialty at each stop and finishing with churros." },
    "new in town": { kicker: "New connections", title: "Sunset coffee for newcomers", body: "A relaxed table for anyone still learning the neighborhood, come for one drink or stay for the walk." },
    music: { kicker: "Music meetup", title: "Vinyl listening hour at the record shop", body: "Each person picks one side of an album, then the group votes on the closing record." },
    outdoors: { kicker: "Outside now", title: "Easy bluff trail before sunset", body: "A gentle out-and-back with ocean views. Meet at the south trail marker." },
    free: { kicker: "Free meetup", title: "Free sketch-and-chat in the park", body: "Bring any notebook or borrow paper from us. We will draw the same view for twenty minutes." },
  },
  arts: {
    "live music": { kicker: "Live music", title: "Sound check from the front of the room", body: "Hear the room before doors, see the sightlines and find the calmest entrance." },
    "street buskers": { kicker: "Street buskers", title: "A brilliant brass set on the plaza", body: "Catch the sound, crowd energy and the best place to stop without blocking foot traffic." },
    theater: { kicker: "Theater", title: "Opening night energy outside the playhouse", body: "The line, the lobby buzz and a word with early arrivals about the show." },
    "gallery walk": { kicker: "Gallery walk", title: "First Friday art walk before the crowds", body: "A quiet lap through the open galleries with the standout pieces up close." },
    "open mic": { kicker: "Open mic", title: "Comedy open mic warming up", body: "See the room, the lineup board and whether it's a supportive crowd tonight." },
  },
  sports: {
    "pickup game": { kicker: "Pickup game", title: "Two players needed for beach volleyball", body: "Friendly doubles rotation starting at 5:45. All skill levels can jump in." },
    "match day": { kicker: "Match day", title: "Tailgate scene outside the stadium", body: "Entry line length, lot fullness and the fan atmosphere ninety minutes before kickoff." },
    running: { kicker: "Running club", title: "Social 5k along the waterfront path", body: "Easy pace, regroup at every mile marker, coffee after. All speeds welcome." },
    skate: { kicker: "Skate session", title: "Evening session at the riverside skatepark", body: "How busy the bowls are, who's skating and the vibe from the edge of the park." },
    fitness: { kicker: "Outdoor fitness", title: "Free bootcamp on the lawn at sunrise", body: "Bodyweight circuit, all levels, just bring water and a towel." },
  },
  general: {
    "just looking around": { kicker: "Around town", title: "Golden-hour walk through the old quarter", body: "No agenda, just a live wander past the sights, shops and whatever catches the light." },
    "ask me anything": { kicker: "AMA", title: "Local for ten years, ask me anything", body: "Live from the main square, answering questions about the neighborhood in real time." },
    "day in the life": { kicker: "Day in the life", title: "Morning shift at the family bakery", body: "Live from the counter during the breakfast rush, showing what goes into a normal day." },
    "scenic views": { kicker: "Scenic views", title: "Sunset from the overlook before the fog", body: "A calm live view from the ridge with time-lapse-worthy light." },
  },
};

/** One example per tag in the category, or just the matching tag when filtered. */
export function exampleSeeds(category: CommunityCategory, tag?: string | null): ExampleSeed[] {
  const entries = Object.entries(COPY[category]);
  const selected = tag ? entries.filter(([key]) => key === tag) : entries;
  return selected.map(([seedTag, copy]) => ({
    id: `${category}-${seedTag}`,
    tag: seedTag,
    ...copy,
  }));
}
