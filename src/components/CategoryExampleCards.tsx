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
  onStart,
}: {
  category: CommunityCategory;
  tag?: string | null;
  onStart: (category: CommunityCategory) => void;
}) {
  const def = categoryDef(category);
  const visual = COMMUNITY_VISUALS[category];
  const Icon = visual.icon;
  const seeds = exampleSeeds(category, tag).slice(0, 6);

  return (
    <section aria-labelledby="lane-examples" className="mb-6 space-y-3">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-signal">
            <Sparkles className="size-4" /> {tag ? `Explore #${tag}` : `Explore ${def.label}`}
          </p>
          <h2 id="lane-examples" className="mt-1 text-lg font-extrabold text-foreground">
            Stories waiting to happen
          </h2>
        </div>
        <span className="shrink-0 text-[0.65rem] font-bold uppercase tracking-[0.12em] text-muted-foreground">Starter feed</span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {seeds.map((seed) => {
          const topicVisual = communityTopicVisual(category, seed.tag);
          return (
          <article
            key={seed.id}
            className="overflow-hidden rounded-xl border border-border bg-surface"
          >
            <div className={`relative aspect-[16/9] overflow-hidden ${visual.coverClass}`}>
              <LoopingPreview
                imageUrl={topicVisual?.image ?? visual.image}
                alt={topicVisual?.alt ?? `${def.label} starter idea`}
                icon={Icon}
                coverClass={visual.coverClass}
              />
              <span className="absolute inset-0 bg-gradient-to-t from-background via-background/15 to-transparent" />
              <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-md bg-signal px-2 py-1 text-[0.6rem] font-extrabold uppercase tracking-[0.12em] text-signal-foreground">
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
                className="mt-3 h-auto p-0 text-xs font-bold text-signal hover:bg-transparent hover:text-signal"
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
