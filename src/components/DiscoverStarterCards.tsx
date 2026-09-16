import { ArrowRight, BookOpen, CalendarDays, Sparkles } from "lucide-react";
import meetupImage from "@/assets/discover-starter-meetup.jpg";
import tutorialImage from "@/assets/discover-starter-tutorial.jpg";
import { Button } from "@/components/ui/button";
import type { CommunityCategory } from "@/lib/community";

const STARTERS: Array<{
  category: CommunityCategory;
  title: string;
  note: string;
  image: string;
  Icon: typeof CalendarDays;
}> = [
  {
    category: "meetups",
    title: "Sunset picnic in the park",
    note: "Invite neighbors, set a meeting point and make it a Flash Meetup.",
    image: meetupImage,
    Icon: CalendarDays,
  },
  {
    category: "general",
    title: "Share a skill or a local view live",
    note: "Go live with something worth showing and let nearby people watch or join in.",
    image: tutorialImage,
    Icon: BookOpen,
  },
];

export function DiscoverStarterCards({
  onStart,
}: {
  onStart: (category: CommunityCategory) => void;
}) {
  return (
    <section aria-labelledby="starter-title" className="space-y-4">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-signal">
            <Sparkles className="size-4" /> Starter ideas
          </p>
          <h2 id="starter-title" className="mt-1 text-xl font-extrabold text-foreground">
            Start something nearby
          </h2>
        </div>
        <span className="shrink-0 text-[0.65rem] font-bold uppercase tracking-[0.12em] text-muted-foreground">
          Examples
        </span>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {STARTERS.map(({ category, title, note, image, Icon }) => (
          <article key={category} className="group overflow-hidden rounded-2xl border border-border bg-surface">
            <div className="relative aspect-video overflow-hidden">
              <img
                src={image}
                alt=""
                width={1280}
                height={720}
                loading="lazy"
                className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.03] motion-reduce:transition-none"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background via-background/15 to-transparent" />
              <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-md border border-foreground/15 bg-background/80 px-2.5 py-1 text-[0.65rem] font-extrabold uppercase tracking-[0.12em] text-foreground backdrop-blur-md">
                <Icon className="size-3.5 text-signal" /> Starter preview
              </span>
            </div>
            <div className="p-4">
              <h3 className="text-base font-extrabold text-foreground">{title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{note}</p>
              <Button
                type="button"
                variant="ghost"
                onClick={() => onStart(category)}
                className="mt-3 h-auto p-0 font-bold text-signal hover:bg-transparent hover:text-signal"
              >
                Use this idea <ArrowRight className="size-4" />
              </Button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}