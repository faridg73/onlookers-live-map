// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import type { CommunityCategory } from "@/lib/community";
import type { BroadcastCategoryId } from "@/lib/broadcast-categories";

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

/**
 * Creator prompts written for each Explore by Vibe lane. These are ideas, not
 * sample user posts, and intentionally keep ticketed-event coverage outside.
 */
const BROADCAST_COPY: Record<BroadcastCategoryId, readonly ExampleSeed[]> = {
  "breaking-incidents": [
    { id: "breaking-scene", tag: "happening now", kicker: "Scene update", title: "Show what is happening from a safe public spot", body: "Capture street access, visible response activity and useful ways around the area." },
    { id: "breaking-weather", tag: "weather", kicker: "Weather", title: "Share street-level weather conditions", body: "Show rain, wind, visibility and how nearby public roads or sidewalks look right now." },
    { id: "breaking-closure", tag: "road closure", kicker: "Road closure", title: "Confirm a closure and the posted detour", body: "Film the barricade and public signs without entering a restricted response area." },
    { id: "breaking-safety", tag: "happening now", kicker: "Public safety", title: "Share an official public information point", body: "Show where residents can safely find updates, assistance and verified public guidance." },
  ],
  "traffic-updates": [
    { id: "traffic-flow", tag: "commute", kicker: "Traffic now", title: "Show how traffic is really moving", body: "Capture the backup, open lanes and the point where congestion begins to clear." },
    { id: "traffic-transit", tag: "transit", kicker: "Transit", title: "Check the platform or stop crowd", body: "Share wait times, posted notices and how busy the next public transit arrival looks." },
    { id: "traffic-parking", tag: "parking", kicker: "Parking", title: "Post current parking availability", body: "Show open public lots, posted prices and street parking around the destination." },
    { id: "traffic-detour", tag: "detour", kicker: "Detour", title: "Trace the working route around road work", body: "Show public detour signs, open turns and where regular traffic resumes." },
  ],
  "arts-performances": [
    { id: "arts-busker", tag: "street buskers", kicker: "Street art", title: "Spot a public street performance", body: "Share the artist and crowd atmosphere from a lawful public space." },
    { id: "arts-gallery", tag: "gallery walk", kicker: "Gallery walk", title: "Walk a public art district", body: "Show exterior installations, murals and the neighborhood atmosphere between stops." },
    { id: "arts-theater", tag: "theater", kicker: "Opening night", title: "Capture the buzz outside the theater", body: "Show the marquee, entry line and pre-show crowd—never the ticketed performance or stage." },
    { id: "arts-installation", tag: "gallery walk", kicker: "Public art", title: "Show a new outdoor art installation", body: "Capture the work and its public surroundings from a lawful viewing area." },
  ],
  "food-dining": [
    { id: "food-truck", tag: "food", kicker: "Food trucks", title: "Compare today's food-truck lines", body: "Show menus, wait times and what people are ordering from the public service area." },
    { id: "food-market", tag: "tonight", kicker: "Night market", title: "Walk the busiest night-market stalls", body: "Share today's vendors, crowd levels and the shortest lines." },
    { id: "food-cafe", tag: "new in town", kicker: "Cafe culture", title: "Show the feel of a neighborhood cafe", body: "Capture the public seating, line and street atmosphere for someone deciding where to meet." },
    { id: "food-kitchen", tag: "food", kicker: "Market kitchen", title: "Find what is cooking at the market", body: "Show prepared-food stalls, today's specialties and current public wait times." },
  ],
  "car-culture": [
    { id: "cars-exotic", tag: "commute", kicker: "Car spotting", title: "Share an unusual car spotted in public", body: "Capture exterior details from a respectful public vantage point without identifying private information." },
    { id: "cars-classic", tag: "parking", kicker: "Classic cars", title: "Walk a public classic-car gathering", body: "Show standout vehicles, arrival activity and the crowd around the public display." },
    { id: "cars-meet", tag: "detour", kicker: "Meetup", title: "Check how busy the car meetup is", body: "Share the public turnout, parking situation and overall atmosphere." },
    { id: "cars-detail", tag: "road work", kicker: "Details", title: "Highlight a standout build detail", body: "Share wheels, paint and exterior craftsmanship without exposing license plates or private information." },
  ],
  "street-fashion": [
    { id: "fashion-trends", tag: "street art", kicker: "Street style", title: "Spot today's neighborhood style", body: "Share opt-in street looks and the public places shaping local trends." },
    { id: "fashion-shops", tag: "hidden gem", kicker: "Shopping hubs", title: "Walk a local fashion district", body: "Show storefronts, window displays and public shopping activity." },
    { id: "fashion-pop", tag: "street festival", kicker: "Pop-up", title: "Find a public fashion pop-up", body: "Capture the line, exterior setup and opt-in creator moments." },
    { id: "fashion-details", tag: "street art", kicker: "Accessories", title: "Share the details shaping today's look", body: "Capture opt-in shoes, bags and accessories without identifying anyone who has not consented." },
  ],
  "events-sports": [
    { id: "sports-community", tag: "pickup game", kicker: "Community game", title: "Share a public pickup game", body: "Show open community play where recording is allowed and participants are comfortable being filmed." },
    { id: "sports-tailgate", tag: "match day", kicker: "Match day", title: "Show the crowd outside the venue", body: "Capture tailgates, entry lines and pre-game atmosphere—never the ticketed field, court or broadcast." },
    { id: "sports-parade", tag: "running", kicker: "Public event", title: "Check turnout along a public route", body: "Share crowd levels, street access and public gathering points." },
    { id: "sports-community-parade", tag: "match day", kicker: "Community parade", title: "Show a neighborhood parade from the public route", body: "Capture the crowd, route and gathering points without entering restricted areas." },
  ],
  "nature-wildlife": [
    { id: "nature-trail", tag: "just looking around", kicker: "Trails", title: "Show today's trail conditions", body: "Capture the public trailhead, surface conditions and how busy the route looks." },
    { id: "nature-wildlife", tag: "scenic views", kicker: "Wildlife", title: "Share a wildlife sighting from a distance", body: "Film without approaching, feeding or disturbing the animal." },
    { id: "nature-sunset", tag: "day in the life", kicker: "Sunset spot", title: "Check the view before sunset", body: "Show cloud cover, visibility and crowd levels at a public overlook." },
    { id: "nature-birds", tag: "scenic views", kicker: "Wetlands", title: "Spot birds from a public boardwalk", body: "Share the sighting from a respectful distance without disturbing wildlife or habitat." },
  ],
  "real-estate": [
    { id: "property-neighborhood", tag: "local history", kicker: "Neighborhood tour", title: "Walk the block around a property", body: "Show the public streetscape, nearby amenities and daytime activity." },
    { id: "property-build", tag: "street art", kicker: "Construction", title: "Check visible construction progress", body: "Capture only what is visible from public property without entering the site." },
    { id: "property-history", tag: "hidden gem", kicker: "Architecture", title: "Share a historic exterior detail", body: "Show the facade and public surroundings while respecting residents' privacy." },
    { id: "property-mixed-use", tag: "street festival", kicker: "Local amenities", title: "Show a mixed-use block in context", body: "Capture the public exterior, walkability and nearby everyday amenities." },
  ],
  nightlife: [
    { id: "nightlife-line", tag: "live music", kicker: "Tonight", title: "Check the line outside the venue", body: "Show entry wait, street atmosphere and the pre-party outside—never the ticketed show or stage." },
    { id: "nightlife-lounge", tag: "open mic", kicker: "Lounges", title: "Share the street vibe before doors", body: "Capture the exterior, public queue and nearby activity without recording inside entertainment." },
    { id: "nightlife-comedy", tag: "theater", kicker: "Comedy night", title: "See how busy it is outside the club", body: "Show the marquee and arriving crowd, not the ticketed performance." },
    { id: "nightlife-district", tag: "gallery walk", kicker: "Night district", title: "Walk the public entertainment district", body: "Show street activity, exterior lighting and public foot traffic without filming inside ticketed venues." },
  ],
  "tech-innovation": [
    { id: "tech-gadget", tag: "ask me anything", kicker: "Gadget spotting", title: "Show new public technology in use", body: "Capture a public demo, robot or installation and explain what it is doing." },
    { id: "tech-hub", tag: "day in the life", kicker: "Tech hubs", title: "Walk a local innovation district", body: "Show public spaces, offices and visible activity around the neighborhood." },
    { id: "tech-event", tag: "scenic views", kicker: "Public demo", title: "Share the line at a public tech showcase", body: "Capture exterior displays and public demonstrations where recording is permitted." },
    { id: "tech-delivery", tag: "just looking around", kicker: "Street tech", title: "Spot a delivery robot on a public route", body: "Show how it navigates the sidewalk while keeping pedestrians and private details out of focus." },
  ],
  "shopping-retail": [
    { id: "retail-sale", tag: "street vendors", kicker: "Sale", title: "Check today's sale and line", body: "Show public signage, crowd levels and whether the wait looks worthwhile." },
    { id: "retail-opening", tag: "flea markets", kicker: "Grand opening", title: "Share a storefront grand opening", body: "Capture the public entrance, queue and launch-day atmosphere." },
    { id: "retail-mall", tag: "farmers markets", kicker: "Shopping activity", title: "Show how busy the shopping area is", body: "Share parking, public walkways and the current crowd level." },
    { id: "retail-window", tag: "antique fairs", kicker: "Window display", title: "Share an eye-catching local storefront", body: "Capture the public window, street setting and visible seasonal display." },
  ],
  "fitness-outdoors": [
    { id: "fitness-run", tag: "running", kicker: "Run club", title: "Join a public run-club meetup", body: "Share the meeting point, group size and public route with participants' consent." },
    { id: "fitness-skate", tag: "skate", kicker: "Skate park", title: "Check the skate park crowd", body: "Show which public areas are open and how busy each section is." },
    { id: "fitness-workout", tag: "fitness", kicker: "Outdoor workout", title: "Share a public outdoor workout", body: "Capture an opt-in class, available space and what newcomers should bring." },
    { id: "fitness-cycling", tag: "running", kicker: "Cycling group", title: "Check a public cycling meetup", body: "Show the meeting point, group size and route briefing with participants' consent." },
  ],
  "pets-animals": [
    { id: "pets-park", tag: "just looking around", kicker: "Dog park", title: "Show how busy the dog park is", body: "Share open areas, crowd levels and conditions from outside the play zone." },
    { id: "pets-adoption", tag: "day in the life", kicker: "Adoption event", title: "Visit a public pet adoption event", body: "Show the public setup and available animals with organizer permission." },
    { id: "pets-wildlife", tag: "scenic views", kicker: "Local wildlife", title: "Report a safe wildlife sighting", body: "Keep your distance and share where the animal was seen without disturbing it." },
    { id: "pets-trail", tag: "just looking around", kicker: "Dog-friendly trail", title: "Show conditions on a dog-friendly path", body: "Share the public trail surface, crowd level and available space for leashed pets." },
  ],
  "community-culture": [
    { id: "community-market", tag: "street festival", kicker: "Farmers market", title: "Walk today's farmers market", body: "Show seasonal stands, public crowd levels and the shortest lines." },
    { id: "community-charity", tag: "parade", kicker: "Charity drive", title: "Share a public community drive", body: "Show where to donate, what is needed and current turnout with organizer permission." },
    { id: "community-tradition", tag: "local history", kicker: "Local tradition", title: "Document a neighborhood tradition", body: "Capture the public gathering and ask participants to share what it means to them." },
    { id: "community-cleanup", tag: "street art", kicker: "Volunteer day", title: "Show a public neighborhood cleanup", body: "Share the meeting point, supplies needed and visible progress with organizer permission." },
  ],
  "casual-irl": [
    { id: "casual-hangout", tag: "just looking around", kicker: "Just chatting", title: "Take a live walk around the neighborhood", body: "Share public sights, street activity and answer viewer questions along the way." },
    { id: "casual-interview", tag: "ask me anything", kicker: "Street interview", title: "Ask locals one timely question", body: "Get clear consent, keep it respectful and share a range of opt-in answers." },
    { id: "casual-daily", tag: "day in the life", kicker: "Daily life", title: "Share an everyday local moment", body: "Show a public routine, familiar corner or neighborhood ritual worth noticing." },
    { id: "casual-chat", tag: "scenic views", kicker: "Local chat", title: "Chat with friends at a public overlook", body: "Share the view and an easy opt-in conversation about what is happening nearby." },
  ],
};

export function broadcastExampleSeeds(categoryId: BroadcastCategoryId): ExampleSeed[] {
  return [...BROADCAST_COPY[categoryId]];
}
