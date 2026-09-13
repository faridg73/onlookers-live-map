import { useMemo } from "react";
import { Banknote, Clock, MapPin, Video } from "lucide-react";

export interface CaptureActivity {
  id: string;
  hunter: string;
  location: string;
  request: string;
  earnedUsd: number;
  minutesAgo: number;
}

const MOCK_ACTIVITY: CaptureActivity[] = [
  {
    id: "act-1",
    hunter: "Maya S.",
    location: "Newport Beach, CA",
    request: "Live fashion walk at Fashion Island",
    earnedUsd: 23,
    minutesAgo: 4,
  },
  {
    id: "act-2",
    hunter: "Jake R.",
    location: "Costa Mesa, CA",
    request: "Parking lot line check at South Coast Plaza",
    earnedUsd: 18,
    minutesAgo: 11,
  },
  {
    id: "act-3",
    hunter: "Lena K.",
    location: "Irvine, CA",
    request: "Sunset timelapse at Newport Beach pier",
    earnedUsd: 31,
    minutesAgo: 19,
  },
  {
    id: "act-4",
    hunter: "Diego M.",
    location: "Huntington Beach, CA",
    request: "Beach volleyball match highlights",
    earnedUsd: 42,
    minutesAgo: 26,
  },
  {
    id: "act-5",
    hunter: "Priya T.",
    location: "Santa Ana, CA",
    request: "Food truck crowd shot at 4th Street Market",
    earnedUsd: 15,
    minutesAgo: 38,
  },
];

function formatAgo(minutes: number) {
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}

interface RecentActivityFeedProps {
  activity?: CaptureActivity[];
}

export function RecentActivityFeed({ activity }: RecentActivityFeedProps) {
  const rows = useMemo(() => activity ?? MOCK_ACTIVITY, [activity]);

  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <div className="flex items-center justify-between">
        <p className="inline-flex items-center gap-2 font-display text-base font-bold text-foreground">
          <Video className="size-4 text-signal" aria-hidden /> Recent captures
        </p>
        <span className="text-[0.62rem] font-extrabold uppercase tracking-[0.08em] text-muted-foreground">
          Live payout feed
        </span>
      </div>

      <p className="mt-1 text-xs text-muted-foreground">
        Hunters are getting paid right now. Here are the latest successful captures.
      </p>

      <ul className="mt-4 space-y-3">
        {rows.map((row) => (
          <li
            key={row.id}
            className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background/50 p-3"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-foreground">
                {row.hunter} captured <span className="text-signal">{row.request}</span>
              </p>
              <p className="mt-1 flex items-center gap-2 text-[0.62rem] text-muted-foreground">
                <MapPin className="size-3" aria-hidden /> {row.location}
                <span className="inline-block size-0.5 rounded-full bg-muted-foreground" />
                <Clock className="size-3" aria-hidden /> {formatAgo(row.minutesAgo)}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className="inline-flex items-center gap-1 font-display text-base font-bold text-signal">
                <Banknote className="size-4" aria-hidden /> ${row.earnedUsd}
              </p>
              <p className="text-[0.6rem] font-extrabold uppercase tracking-[0.08em] text-muted-foreground">
                Earned
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
