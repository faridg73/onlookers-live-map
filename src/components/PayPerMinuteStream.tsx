// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import { useEffect, useRef, useState } from "react";
import { Radio, Square } from "lucide-react";
import { toast } from "sonner";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { formatCredits, formatCreditCash } from "@/lib/credits";
import {
  DEFAULT_STREAM_RATE,
  STREAM_RATES,
  billStreamMinute,
  endStreamSession,
  hostShare,
  startStreamSession,
  type StreamMeter,
} from "@/lib/streaming";

/**
 * Pay-per-minute viewing. The first minute is charged when the session opens
 * and every following minute is charged while the viewer stays. The host keeps
 * the majority of every minute.
 */
export function PayPerMinuteStream({
  hostId,
  hostName,
  hostVerified = false,
  postId,
  onClose,
}: {
  hostId: string;
  hostName: string;
  hostVerified?: boolean;
  postId?: string | null;
  onClose: () => void;
}) {
  const [rate, setRate] = useState<number>(DEFAULT_STREAM_RATE);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [meter, setMeter] = useState<StreamMeter>({
    minutesBilled: 0,
    creditsSpent: 0,
    hostEarned: 0,
  });
  const [busy, setBusy] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const stop = async () => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
    if (sessionId) {
      try {
        await endStreamSession(sessionId);
      } catch {
        /* the session closes on its own */
      }
    }
    setSessionId(null);
    onClose();
  };

  useEffect(() => {
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, []);

  const join = async () => {
    setBusy(true);
    try {
      const id = await startStreamSession({
        hostId,
        creditsPerMinute: rate,
        postId: postId ?? null,
      });
      setSessionId(id);
      setMeter(await billStreamMinute(id));
      timer.current = setInterval(() => {
        void billStreamMinute(id)
          .then(setMeter)
          .catch(async (err: unknown) => {
            toast.error(
              err instanceof Error && /insufficient/i.test(err.message)
                ? "You're out of Credits, the live session ended."
                : "The live session ended.",
            );
            if (timer.current) clearInterval(timer.current);
            timer.current = null;
            await endStreamSession(id).catch(() => undefined);
            setSessionId(null);
          });
      }, 60_000);
    } catch (err) {
      toast.error(
        err instanceof Error && /insufficient/i.test(err.message)
          ? "You need more Credits to start watching."
          : err instanceof Error
            ? err.message
            : "Couldn't start the live session.",
      );
    } finally {
      setBusy(false);
    }
  };

  if (!sessionId) {
    return (
      <div className="rounded-2xl border border-signal/40 bg-surface-raised p-4">
        <p className="flex items-center gap-1.5 text-sm font-bold text-foreground">
          Watch {hostName} live {hostVerified && <VerifiedBadge className="size-3.5" />}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          You pay by the minute and can stop any time. {hostShare(rate)} of every{" "}
          {formatCredits(rate)} goes straight to the host.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {STREAM_RATES.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRate(r)}
              className={`rounded-full border px-3 py-1.5 text-xs font-bold ${
                rate === r
                  ? "border-signal bg-signal text-signal-foreground"
                  : "border-border text-muted-foreground"
              }`}
            >
              {formatCredits(r)}/min · {formatCreditCash(r)}
            </button>
          ))}
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={() => void join()}
          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-signal px-4 py-3 text-sm font-extrabold uppercase tracking-[0.12em] text-signal-foreground disabled:opacity-60"
        >
          <Radio className="size-4" /> {busy ? "Connecting…" : "Start live stream"}
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-signal bg-black p-4">
      <p className="flex items-center gap-2 text-sm font-extrabold text-signal">
        <span className="size-2 animate-pulse rounded-full bg-signal" /> LIVE with {hostName} {hostVerified && <VerifiedBadge className="size-3.5" />}
      </p>
      <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl bg-surface-raised py-2">
          <dt className="text-[0.6rem] uppercase tracking-[0.14em] text-muted-foreground">
            Minutes
          </dt>
          <dd className="text-base font-extrabold text-foreground">{meter.minutesBilled}</dd>
        </div>
        <div className="rounded-xl bg-surface-raised py-2">
          <dt className="text-[0.6rem] uppercase tracking-[0.14em] text-muted-foreground">Spent</dt>
          <dd className="text-base font-extrabold text-foreground">
            {formatCredits(meter.creditsSpent)}
          </dd>
        </div>
        <div className="rounded-xl bg-surface-raised py-2">
          <dt className="text-[0.6rem] uppercase tracking-[0.14em] text-muted-foreground">
            To host
          </dt>
          <dd className="text-base font-extrabold text-signal">
            {formatCredits(meter.hostEarned)}
          </dd>
        </div>
      </dl>
      <button
        type="button"
        onClick={() => void stop()}
        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border px-4 py-3 text-sm font-bold uppercase tracking-[0.12em] text-foreground"
      >
        <Square className="size-4" /> End session
      </button>
    </div>
  );
}
