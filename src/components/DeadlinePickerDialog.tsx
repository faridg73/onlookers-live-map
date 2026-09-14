import { useMemo, useState } from "react";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";

/** Exact calendar date + hour/minute picker used for deadlines and start windows. */
export function DeadlinePickerDialog({
  open,
  value,
  title,
  description,
  confirmLabel = "Set time",
  onOpenChange,
  onPick,
}: {
  open: boolean;
  value: Date | null;
  title: string;
  description: string;
  confirmLabel?: string;
  onOpenChange: (open: boolean) => void;
  onPick: (date: Date) => void;
}) {
  const now = new Date();
  const [day, setDay] = useState<Date | undefined>(value ?? undefined);
  const [hour, setHour] = useState(value?.getHours() ?? 18);
  const [minute, setMinute] = useState(value ? value.getMinutes() : 0);

  const picked = useMemo(() => {
    if (!day) return null;
    const next = new Date(day);
    next.setHours(hour, minute, 0, 0);
    return next;
  }, [day, hour, minute]);
  const valid = Boolean(picked && picked.getTime() > Date.now());

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm rounded-3xl border-border bg-card p-5">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="flex justify-center">
          <Calendar
            mode="single"
            selected={day}
            onSelect={setDay}
            disabled={(date) => date < new Date(now.getFullYear(), now.getMonth(), now.getDate())}
            initialFocus
            className="pointer-events-auto p-3"
          />
        </div>
        <div className="flex items-center justify-center gap-2">
          <CalendarIcon className="size-4 text-signal" />
          <select
            value={hour}
            onChange={(event) => setHour(Number(event.target.value))}
            aria-label="Hour"
            className="field w-auto"
          >
            {Array.from({ length: 24 }, (_, h) => (
              <option key={h} value={h}>
                {h === 0 ? "12 AM" : h < 12 ? `${h} AM` : h === 12 ? "12 PM" : `${h - 12} PM`}
              </option>
            ))}
          </select>
          <select
            value={minute}
            onChange={(event) => setMinute(Number(event.target.value))}
            aria-label="Minute"
            className="field w-auto"
          >
            {[0, 15, 30, 45].map((m) => (
              <option key={m} value={m}>
                {String(m).padStart(2, "0")}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          disabled={!valid}
          onClick={() => picked && onPick(picked)}
          className="w-full rounded-2xl bg-signal py-3 text-sm font-extrabold uppercase tracking-[0.16em] text-signal-foreground disabled:opacity-40"
        >
          {valid && picked ? `${confirmLabel} — ${format(picked, "MMM d, h:mm a")}` : "Pick a future time"}
        </button>
      </DialogContent>
    </Dialog>
  );
}
