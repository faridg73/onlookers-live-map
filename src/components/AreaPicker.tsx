import { useState } from "react";
import { Crosshair, MapPin, Search } from "lucide-react";
import { useDiscoveryArea } from "@/hooks/use-discovery-area";

/**
 * Shows which city the browse screens are pulling places from, and lets the
 * person switch to their own GPS position or any other city.
 */
export function AreaPicker() {
  const { area, busy, error, useMyLocation, setCity } = useDiscoveryArea();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  return (
    <div className="rounded-2xl border border-border bg-surface p-3">
      <div className="flex items-center gap-2">
        <MapPin className="size-4 shrink-0 text-signal" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-[0.62rem] font-extrabold uppercase tracking-[0.14em] text-muted-foreground">
            Showing spots near
          </p>
          <p className="truncate text-sm font-bold text-foreground">{area.label}</p>
        </div>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="rounded-full border border-border px-3 py-1.5 text-[0.62rem] font-extrabold uppercase tracking-[0.12em] text-foreground"
        >
          Change
        </button>
      </div>

      {open && (
        <div className="mt-3 space-y-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => void useMyLocation().then((ok) => ok && setOpen(false))}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-signal py-2.5 text-[0.68rem] font-extrabold uppercase tracking-[0.14em] text-signal-foreground disabled:opacity-60"
          >
            <Crosshair className="size-4" aria-hidden /> Use my location
          </button>
          <form
            className="flex gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              void setCity(query).then((ok) => {
                if (ok) {
                  setQuery("");
                  setOpen(false);
                }
              });
            }}
          >
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="City, e.g. Chicago, IL"
              className="min-w-0 flex-1 rounded-xl border border-border bg-surface-raised px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground"
            />
            <button
              type="submit"
              disabled={busy || query.trim().length < 3}
              aria-label="Search city"
              className="rounded-xl border border-border px-3 text-foreground disabled:opacity-50"
            >
              <Search className="size-4" aria-hidden />
            </button>
          </form>
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
      )}
    </div>
  );
}
