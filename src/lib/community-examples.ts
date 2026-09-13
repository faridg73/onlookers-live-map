import { categoryDef, type CommunityCategory } from "@/lib/community";

/**
 * Example ideas shown when a lane (or one of its tags) has no real posts yet, so
 * no tab ever looks blank. These are clearly labelled prompts — never fake
 * photos, videos or authors — and tapping one opens the composer.
 */
export type ExampleSeed = {
  id: string;
  tag: string;
  title: string;
  body: string;
};

type Writer = (tag: string) => { title: string; body: string };

const titleCase = (tag: string) => tag.charAt(0).toUpperCase() + tag.slice(1);

const WRITERS: Record<CommunityCategory, Writer> = {
  friends: (tag) => ({
    title: `Anyone up for ${tag} this week?`,
    body: `Keeping it easy — ${tag} with a couple of nearby people, no plans beyond that.`,
  }),
  meetups: (tag) => ({
    title: `${titleCase(tag)} meetup, starting soon`,
    body: `Drop a spot and a time for ${tag} — nearby people get pinged and can walk over.`,
  }),
  tutorials: (tag) => ({
    title: `${titleCase(tag)} in ten minutes, live`,
    body: `Show one ${tag} skill start to finish on camera and take questions as you go.`,
  }),
  language: (tag) => ({
    title: `${titleCase(tag)} practice, half and half`,
    body: `Thirty minutes of ${tag}, thirty of mine — real conversation, no textbooks.`,
  }),
  culture: (tag) => ({
    title: `The local side of ${tag}`,
    body: `Walk a ${tag} spot on camera and show the version visitors usually miss.`,
  }),
  realestate: (tag) => ({
    title: `${titleCase(tag)} walkthrough, live`,
    body: `Room by room on the ${tag}, plus the street, parking and anything you ask to see.`,
  }),
  markets: (tag) => ({
    title: `${titleCase(tag)} happening now`,
    body: `Walking the ${tag} live — say the word and I'll check a price or a queue for you.`,
  }),
  events: (tag) => ({
    title: `${titleCase(tag)} from the crowd`,
    body: `A few minutes of ${tag} on camera: the sound, the crowd size and how to get in.`,
  }),
};

/** One example per tag in the category, or just the matching tag when filtered. */
export function exampleSeeds(category: CommunityCategory, tag?: string | null): ExampleSeed[] {
  const def = categoryDef(category);
  const write = WRITERS[category] ?? WRITERS.friends;
  const tags = tag ? [tag] : def.tags;
  return tags.map((t) => ({ id: `${category}-${t}`, tag: t, ...write(t) }));
}
