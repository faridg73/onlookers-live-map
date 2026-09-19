// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import { Camera, Film, MessageSquare, Radio, Timer } from "lucide-react";

/** Friendly names for the labels used in bounty briefs. */
const LABELS: Array<{ match: RegExp; label: string; icon: typeof Camera }> = [
  { match: /^format$/i, label: "Format", icon: Film },
  { match: /^(requested capture|capture type|capture)$/i, label: "Capture Type", icon: Timer },
  { match: /^(camera|camera guidance)$/i, label: "Camera Guidance", icon: Camera },
  { match: /^(live|stream)$/i, label: "Live", icon: Radio },
];

type Row = { label: string; value: string; icon: typeof Camera };

function parse(note: string): Row[] {
  const rows: Row[] = [];
  for (const raw of note.split(/\r?\n+/)) {
    const line = raw.trim();
    if (!line) continue;
    const split = line.indexOf(":");
    const key = split > 0 ? line.slice(0, split).trim() : "";
    const known = key ? LABELS.find((l) => l.match.test(key)) : undefined;
    if (known) {
      rows.push({ label: known.label, value: line.slice(split + 1).trim(), icon: known.icon });
    } else {
      rows.push({ label: "Instruction", value: line, icon: MessageSquare });
    }
  }
  return rows;
}

/**
 * Shows a bounty brief as clean labelled rows instead of one run-together
 * block of text.
 */
export function BountyNoteDetails({ note, className = "" }: { note: string; className?: string }) {
  const rows = parse(note);
  if (rows.length === 0) return null;

  return (
    <ul className={`space-y-2 rounded-2xl border border-border bg-surface-raised p-3 ${className}`}>
      {rows.map((row, index) => {
        const Icon = row.icon;
        return (
          <li key={`${row.label}-${index}`} className="flex items-start gap-2.5">
            <Icon className="mt-0.5 size-4 shrink-0 text-signal" aria-hidden />
            <div className="min-w-0">
              <p className="text-[0.6rem] font-extrabold uppercase tracking-[0.14em] text-muted-foreground">
                {row.label}
              </p>
              <p className="text-sm leading-relaxed text-foreground/90">{row.value}</p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
