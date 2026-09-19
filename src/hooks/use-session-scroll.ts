// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import { useEffect, useRef } from "react";
import { readSessionState, writeSessionState } from "@/lib/session-state";

export function useSessionScroll(key: string, ready = true) {
  const restored = useRef(false);

  useEffect(() => {
    if (!ready || restored.current || typeof window === "undefined") return;
    restored.current = true;
    const top = readSessionState<number>(key, 0);
    if (top <= 0) return;

    // Async feeds can be shorter than the saved offset on their first paint.
    // Retry briefly while cards/media settle so Back returns to the exact item.
    let frame = 0;
    let attempts = 0;
    const restore = () => {
      window.scrollTo({ top, left: 0, behavior: "auto" });
      attempts += 1;
      if (Math.abs(window.scrollY - top) > 2 && attempts < 20) {
        frame = window.requestAnimationFrame(restore);
      }
    };
    frame = window.requestAnimationFrame(restore);
    return () => window.cancelAnimationFrame(frame);
  }, [key, ready]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    let frame = 0;
    const save = () => writeSessionState(key, window.scrollY);
    const onScroll = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(save);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("pagehide", save);
    return () => {
      window.cancelAnimationFrame(frame);
      save();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("pagehide", save);
    };
  }, [key]);
}

export function useSessionElementScroll<T extends HTMLElement>(key: string, ready = true) {
  const elementRef = useRef<T | null>(null);
  const restored = useRef(false);

  useEffect(() => {
    const element = elementRef.current;
    if (!ready || restored.current || !element) return;
    restored.current = true;
    const top = readSessionState<number>(key, 0);
    const frame = window.requestAnimationFrame(() => element.scrollTo({ top, left: 0, behavior: "auto" }));
    return () => window.cancelAnimationFrame(frame);
  }, [key, ready]);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;
    let frame = 0;
    const save = () => writeSessionState(key, element.scrollTop);
    const onScroll = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(save);
    };
    element.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("pagehide", save);
    return () => {
      window.cancelAnimationFrame(frame);
      save();
      element.removeEventListener("scroll", onScroll);
      window.removeEventListener("pagehide", save);
    };
  }, [key]);

  return elementRef;
}
