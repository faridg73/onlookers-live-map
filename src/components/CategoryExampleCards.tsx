// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LoopingPreview } from "@/components/LoopingPreview";
import { COMMUNITY_VISUALS } from "@/lib/community-visuals";
import { categoryDef, type CommunityCategory } from "@/lib/community";
import { exampleSeeds } from "@/lib/community-examples";
import { communityTopicVisual } from "@/lib/community-topic-visuals";

/**
 * Editorial starter stories for a lane that has no real posts nearby yet.
 */
export function CategoryExampleCards({
  category,
  tag,
  labelOverride,
  onStart,
}: {
  category: CommunityCategory;
  tag?: string | null;
  /** Display name of the selected vibe lane, shown instead of the broader category label. */
  labelOverride?: string | null;
  onStart: (category: CommunityCategory) => void;
}) {
  const def = categoryDef(category);
  const laneLabel = labelOverride ?? def.label;
  const visual = COMMUNITY_VISUALS[category];
  const Icon = visual.icon;
  const seeds = exampleSeeds(category, tag).slice(0, 6);

  return (
    <section aria-labelledby="lane-examples" className="mb-6 space-y-3">
      <div className="flex flex-col items-center text-center">
        <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">
          <Sparkles className="size-4" /> {tag ? `Explore #${tag}` : `Explore ${laneLabel}`}
        </p>
        <h2 id="lane-examples" className="mt-1 text-lg font-extrabold text-foreground">
          Stories waiting to happen
        </h2>
        <span className="mt-1 text-[0.65rem] font-bold uppercase tracking-[0.12em] text-muted-foreground">Starter feed</span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {seeds.map((seed) => {
          const topicVisual = communityTopicVisual(category, seed.tag);
          return (
          <article
            key={seed.id}
            className="overflow-hidden rounded-xl border border-border bg-surface animate-red-flash motion-reduce:animate-none"
          >
            <div className={`relative aspect-[16/9] overflow-hidden ${visual.coverClass}`}>
              <LoopingPreview
                imageUrl={topicVisual?.image ?? visual.image}
                alt={topicVisual?.alt ?? `${def.label} starter idea`}
                icon={Icon}
                coverClass={visual.coverClass}
              />
              <span className="absolute inset-0 bg-gradient-to-t from-background via-background/15 to-transparent" />
              <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-md bg-background/70 px-2 py-1 text-[0.6rem] font-extrabold uppercase tracking-[0.12em] text-foreground">
                <Icon className="size-3.5" /> {seed.kicker}
              </span>
              <span className="absolute bottom-3 left-3 rounded-full bg-background/70 px-2 py-0.5 text-[0.62rem] font-bold text-foreground backdrop-blur-md">
                #{seed.tag}
              </span>
            </div>
            <div className="p-4">
              <h3 className="text-sm font-extrabold text-foreground">{seed.title}</h3>
              <p className="mt-1 text-xs text-muted-foreground">{seed.body}</p>
              <Button
                type="button"
                variant="ghost"
                onClick={() => onStart(category)}
                className="mt-3 h-auto p-0 text-xs font-bold text-muted-foreground hover:bg-transparent hover:text-foreground"
              >
                 Start a post <ArrowRight className="size-3.5" />
              </Button>
            </div>
          </article>
          );
        })}
      </div>
    </section>
  );
}
