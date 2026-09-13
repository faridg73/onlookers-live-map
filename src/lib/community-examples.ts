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
  friends: {
    "new in town": { kicker: "New connections", title: "Sunset coffee for Newport newcomers", body: "A relaxed table for anyone still learning the neighborhood — come for one drink or stay for the walk." },
    coffee: { kicker: "Coffee crew", title: "Laptop-free coffee at the corner café", body: "Meet a few nearby people over pour-overs, pastries and actual conversation." },
    walk: { kicker: "Walking club", title: "Back Bay loop before golden hour", body: "An easy waterfront loop with plenty of pauses. Comfortable shoes and friendly dogs welcome." },
    gym: { kicker: "Training partner", title: "Looking for a consistent morning gym buddy", body: "Three weekday sessions, beginner-friendly pace, and no pressure to match weights." },
    "20s": { kicker: "People in their 20s", title: "Low-key game night for twenty-somethings", body: "Bring one favorite card game. Snacks, small groups and no awkward networking pitch." },
    "30s": { kicker: "People in their 30s", title: "Sunday brunch table with two seats open", body: "A casual monthly brunch for locals who want to widen their circle." },
  },
  meetups: {
    tonight: { kicker: "Tonight", title: "Rooftop trivia team needs two more", body: "First round starts at 7:30. No trivia expertise required — just bring one oddly specific fact." },
    food: { kicker: "Food meetup", title: "Three-stop taco crawl on Bristol", body: "We are comparing the house specialty at each stop and finishing with churros." },
    music: { kicker: "Music meetup", title: "Vinyl listening hour at the record shop", body: "Each person picks one side of an album, then the group votes on the closing record." },
    sports: { kicker: "Pickup sports", title: "Two players needed for beach volleyball", body: "Friendly doubles rotation starting at 5:45. All skill levels can jump in." },
    outdoors: { kicker: "Outside now", title: "Easy bluff trail before sunset", body: "A gentle out-and-back with ocean views. Meet at the south trail marker." },
    free: { kicker: "Free meetup", title: "Free sketch-and-chat in the park", body: "Bring any notebook or borrow paper from us. We will draw the same view for twenty minutes." },
  },
  tutorials: {
    beginner: { kicker: "Beginner lesson", title: "Your first portrait in natural light", body: "A phone-camera walkthrough covering focus, framing and one simple edit." },
    cooking: { kicker: "Kitchen live", title: "Crispy dumplings without the stuck pan", body: "Follow the steam-fry method live and ask questions before each step." },
    music: { kicker: "Music lesson", title: "Play a full song with three guitar chords", body: "Tune up, learn the changes and play along at a comfortable beginner tempo." },
    repair: { kicker: "Quick repair", title: "Fix a flat bicycle tire in twelve minutes", body: "See every tool and hand position up close, including how to avoid pinching the new tube." },
    tech: { kicker: "Tech help", title: "Clean up your phone photos safely", body: "A practical live session for sorting duplicates and backing up favorites before deleting anything." },
    "10 min": { kicker: "Ten-minute skill", title: "Fold a fitted sheet without the struggle", body: "Four corners, one flat surface and a repeatable method you can use immediately." },
  },
  language: {
    english: { kicker: "English exchange", title: "Natural English for ordering lunch", body: "Practice the phrases locals actually use, from substitutions to splitting the check." },
    spanish: { kicker: "Spanish exchange", title: "Spanish conversation over café stories", body: "Half an hour in Spanish, with gentle corrections and useful phrases written in chat." },
    french: { kicker: "French exchange", title: "French for a weekend at the market", body: "Practice greetings, quantities and asking what a vendor recommends." },
    japanese: { kicker: "Japanese exchange", title: "Casual Japanese introductions and small talk", body: "A welcoming session for practicing names, interests and everyday follow-up questions." },
    beginner: { kicker: "Beginner friendly", title: "Slow conversation with captions on", body: "Short sentences, plenty of repetition and time to ask what each phrase means." },
    fluent: { kicker: "Fluent speakers", title: "Fast-paced culture swap for fluent speakers", body: "Compare local headlines, slang and the expressions textbooks tend to skip." },
  },
  culture: {
    market: { kicker: "Local market", title: "What locals buy at the Saturday market", body: "A live walk past seasonal produce, family-run stalls and the breakfast line worth joining." },
    festival: { kicker: "Festival guide", title: "The neighborhood festival from the inside", body: "See the procession route, best viewing corners and food stands before the crowds arrive." },
    history: { kicker: "Local history", title: "The hidden story behind the old harbor wall", body: "A short walk connecting three landmarks that explain how the waterfront changed." },
    "hidden gem": { kicker: "Hidden gem", title: "A pocket garden behind the busy avenue", body: "Step through an easy-to-miss passage into one of the neighborhood's quietest public spaces." },
    "street art": { kicker: "Street art", title: "New mural route with the artist stories", body: "A block-by-block look at fresh walls, signatures and details that are easy to miss." },
  },
  realestate: {
    "open houses": { kicker: "Open houses", title: "Room-by-room tour before the afternoon rush", body: "Check the natural light, storage, finishes and street noise while the home is still quiet." },
    "home renovations": { kicker: "Home renovations", title: "Kitchen renovation progress from cabinets to tile", body: "Walk through the current work, material choices and the details being finished this week." },
    "commercial sites": { kicker: "Commercial sites", title: "New mixed-use site from street level", body: "See the public-facing construction progress, surrounding access and what is planned for the block." },
    "neighborhood tours": { kicker: "Neighborhood tours", title: "What the neighborhood feels like at commute time", body: "Walk the nearest groceries, transit stop, parks and side streets while the area is active." },
  },
  markets: {
    "flea markets": { kicker: "Flea markets", title: "Vintage aisle treasure hunt under $40", body: "Scan the tables for records, clothing and odd finds worth inspecting more closely." },
    "garage sales": { kicker: "Garage sales", title: "Early garage-sale finds before the good stuff goes", body: "A quick look at furniture, kitchenware, books and prices from the driveway." },
    "street vendors": { kicker: "Street vendors", title: "Best plates and shortest lines on the block", body: "Compare today's menus, wait times and what regulars keep ordering." },
    "antique fairs": { kicker: "Antique fairs", title: "Furniture and collectibles with stories attached", body: "Browse period pieces, maker marks and unusual finds with a closer view on request." },
  },
  events: {
    "live music": { kicker: "Live music", title: "Sound check from the front of the room", body: "Hear the room before doors, see the sightlines and find the calmest entrance." },
    "street buskers": { kicker: "Street buskers", title: "A brilliant brass set on the plaza", body: "Catch the sound, crowd energy and the best place to stop without blocking foot traffic." },
    festivals: { kicker: "Festivals", title: "Opening hour before the festival fills up", body: "A quick orientation to stages, food, shade and the easiest route between them." },
    "spontaneous gatherings": { kicker: "Happening now", title: "A crowd is forming in the square", body: "See what brought everyone together, how busy it is and where there is room to join." },
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
