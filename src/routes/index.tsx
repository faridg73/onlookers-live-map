import { createFileRoute } from "@tanstack/react-router";
import { Camera, Search, Zap } from "lucide-react";
import { MapCanvas } from "@/components/MapCanvas";
import { RequestCard } from "@/components/RequestCard";
import { NewRequestDialog } from "@/components/NewRequestDialog";
import { useOnlooker } from "@/lib/onlooker-store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Onlooker — Live views from people already there" },
      {
        name: "description",
        content:
          "See any place in real time. Post a bounty, and someone standing there sends back a live photo within minutes.",
      },
      { property: "og:title", content: "Onlooker — Live views from people already there" },
      {
        property: "og:description",
        content: "Post a bounty and get a live photo of any place from someone nearby.",
      },
    ],
  }),
  component: MapScreen,
});

function MapScreen() {
  const { requests, selectedId, select, claim } = useOnlooker();
  const selected = requests.find((r) => r.id === selectedId) ?? null;
  const openCount = requests.filter((r) => r.status === "open").length;

  return (
    <div className="fixed inset-0">
      <MapCanvas requests={requests} selectedId={selectedId} onSelect={select} />

      <header className="pointer-events-none absolute inset-x-0 top-0 z-30 p-4">
        <div className="pointer-events-auto mx-auto flex max-w-lg items-center gap-3 rounded-2xl border border-border bg-surface/85 px-4 py-3 backdrop-blur-xl">
          <span className="flex size-8 items-center justify-center rounded-lg bg-signal text-signal-foreground">
            <Zap className="size-4" strokeWidth={2.4} />
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-base leading-none tracking-tight text-foreground">
              Onlooker
            </h1>
            <p className="mt-1 text-[0.68rem] uppercase tracking-[0.16em] text-live">
              {openCount} live requests nearby
            </p>
          </div>
          <button className="flex size-9 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:text-foreground">
            <Search className="size-4" />
          </button>
        </div>
      </header>

      {selected && (
        <div className="absolute inset-x-0 bottom-[5.75rem] z-30 px-4">
          <div className="mx-auto max-w-lg animate-rise">
            <RequestCard request={selected} onClaim={claim} active />
          </div>
        </div>
      )}

      <NewRequestDialog>
        <button
          className="absolute bottom-[6.25rem] right-4 z-30 flex size-14 items-center justify-center rounded-2xl bg-signal text-signal-foreground shadow-[0_14px_40px_-10px_oklch(0.78_0.17_82/0.7)] transition-transform active:scale-95"
          aria-label="Create a new live photo request"
        >
          <Camera className="size-6" strokeWidth={2} />
        </button>
      </NewRequestDialog>
    </div>
  );
}
