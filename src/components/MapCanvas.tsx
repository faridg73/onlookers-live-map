import { useCallback, useEffect, useRef, useState } from "react";
import { type LiveRequest } from "@/lib/onlooker";
import { cn } from "@/lib/utils";

const MIN_ZOOM = 0.6;
const MAX_ZOOM = 4;

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

/** A stylised night-city map surface with cursor-anchored wheel zoom and drag pan. */
export function MapCanvas({
  requests,
  selectedId,
  onSelect,
}: {
  requests: LiveRequest[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}) {
const containerRef = useRef<HTMLDivElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [fit, setFit] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const centeredRef = useRef(false);
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

  // Fit the 1000x1000 world to the viewport (cover) and center it once,
  // so the map fills any screen — phone, tablet, desktop, tall store shots.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      const f = Math.max(w / 1000, h / 1000);
      setFit(f);
      if (!centeredRef.current) {
        centeredRef.current = true;
        setOffset({ x: (w - 1000 * f) / 2, y: (h - 1000 * f) / 2 });
      }
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const wheelRef = useRef<(e: WheelEvent) => void>(() => {});
  wheelRef.current = (e: WheelEvent) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    const dy = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 100 : 1);
    const next = clamp(zoom * Math.exp(-dy * 0.0018), MIN_ZOOM, MAX_ZOOM);
    const k = next / zoom;
    setOffset({ x: px - (px - offset.x) * k, y: py - (py - offset.y) * k });
    setZoom(next);
  };

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      wheelRef.current(e);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  const zoomBy = useCallback(
    (factor: number) => {
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const px = rect.width / 2;
      const py = rect.height / 2;
      setZoom((z) => {
        const next = clamp(z * factor, MIN_ZOOM, MAX_ZOOM);
        const k = next / z;
        setOffset((o) => ({ x: px - (px - o.x) * k, y: py - (py - o.y) * k }));
        return next;
      });
    },
    [],
  );

  return (
    <div
      ref={containerRef}
      onPointerDown={(e) => {
        (e.target as Element).setPointerCapture?.(e.pointerId);
        drag.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
      }}
      onPointerMove={(e) => {
        if (!drag.current) return;
        setOffset({
          x: drag.current.ox + (e.clientX - drag.current.x),
          y: drag.current.oy + (e.clientY - drag.current.y),
        });
      }}
      onPointerUp={() => (drag.current = null)}
      onPointerLeave={() => (drag.current = null)}
      className="absolute inset-0 overflow-hidden bg-map touch-none select-none"
      style={{ cursor: drag.current ? "grabbing" : "grab" }}
    >
<div
        className="absolute left-0 top-0 origin-top-left"
        style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${fit * zoom})` }}
      >
        <svg width={1000} height={1000} viewBox="0 0 1000 1000" className="block">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M40 0H0V40" fill="none" stroke="oklch(0.30 0.03 250)" strokeWidth="0.6" />
            </pattern>
            <radialGradient id="glow" cx="50%" cy="40%" r="60%">
              <stop offset="0%" stopColor="oklch(0.42 0.08 240)" stopOpacity="0.55" />
              <stop offset="100%" stopColor="oklch(0.16 0.03 255)" stopOpacity="0" />
            </radialGradient>
          </defs>

          <rect width="1000" height="1000" fill="oklch(0.17 0.03 255)" />
          <rect width="1000" height="1000" fill="url(#grid)" />
          <rect width="1000" height="1000" fill="url(#glow)" />

          {/* water */}
          <path
            d="M0 120 C 160 190, 250 90, 360 160 L 300 0 L 0 0 Z"
            fill="oklch(0.24 0.06 240)"
          />
          <path d="M640 1000 C 720 900, 880 940, 1000 860 L 1000 1000 Z" fill="oklch(0.24 0.06 240)" />

          {/* park */}
          <rect x="220" y="450" width="180" height="150" rx="18" fill="oklch(0.28 0.05 155)" />

          {/* arterial roads */}
          {[
            "M0 300 H1000",
            "M0 640 H1000",
            "M180 0 V1000",
            "M540 0 V1000",
            "M840 0 V1000",
            "M0 880 H1000",
          ].map((d) => (
            <path key={d} d={d} stroke="oklch(0.34 0.02 250)" strokeWidth="7" fill="none" />
          ))}
          {["M0 300 H1000", "M540 0 V1000"].map((d) => (
            <path
              key={`hl-${d}`}
              d={d}
              stroke="oklch(0.55 0.06 245)"
              strokeWidth="1.4"
              strokeDasharray="14 12"
              fill="none"
            />
          ))}

          {/* blocks */}
          {Array.from({ length: 44 }).map((_, i) => {
            const col = i % 8;
            const row = Math.floor(i / 8);
            const x = 40 + col * 118 + ((row % 2) * 14);
            const y = 60 + row * 165;
            const w = 74 + ((i * 13) % 30);
            const h = 52 + ((i * 29) % 46);
            return (
              <rect
                key={i}
                x={x}
                y={y}
                width={w}
                height={h}
                rx={6}
                fill="oklch(0.22 0.025 255)"
                stroke="oklch(0.3 0.03 250)"
                strokeWidth="0.8"
              />
            );
          })}
        </svg>

        {/* pins */}
        {requests.map((r) => {
          const isSel = r.id === selectedId;
          return (
            <button
              key={r.id}
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => onSelect(isSel ? null : r.id)}
              className="absolute -translate-x-1/2 -translate-y-full"
              style={{ left: r.x, top: r.y, transform: `translate(-50%,-100%) scale(${1 / (fit * zoom)})`, transformOrigin: "bottom center" }}
            >
              <span className="relative flex flex-col items-center">
                {r.status === "open" && (
                  <span className="absolute bottom-0 size-8 animate-ping-slow rounded-full bg-live/25" />
                )}
                <span
                  className={cn(
                    "relative rounded-full border px-2.5 py-1 font-display text-sm shadow-lg",
                    r.status === "fulfilled"
                      ? "border-border bg-surface text-muted-foreground"
                      : isSel
                        ? "border-signal bg-signal text-signal-foreground"
                        : "border-signal/50 bg-surface text-signal",
                  )}
                >
                  ${r.bounty}
                </span>
                <span
                  className={cn(
                    "size-1.5 rotate-45 -translate-y-[3px]",
                    r.status === "fulfilled" ? "bg-border" : "bg-signal",
                  )}
                />
              </span>
            </button>
          );
        })}
      </div>

      <div className="absolute right-4 top-24 flex flex-col overflow-hidden rounded-xl border border-border bg-surface/90 backdrop-blur">
        {[
          { label: "+", fn: () => zoomBy(1.35) },
          { label: "−", fn: () => zoomBy(1 / 1.35) },
        ].map((b) => (
          <button
            key={b.label}
            type="button"
            onClick={b.fn}
            className="size-10 text-lg text-foreground transition-colors hover:bg-surface-raised"
          >
            {b.label}
          </button>
        ))}
      </div>
    </div>
  );
}
