import { useEffect, useRef } from "react";
import { readSessionState, writeSessionState } from "@/lib/session-state";

export function useSessionScroll(key: string, ready = true) {
  const restored = useRef(false);

  useEffect(() => {
    if (!ready || restored.current || typeof window === "undefined") return;
    restored.current = true;
    const top = readSessionState<number>(key, 0);
    const frame = window.requestAnimationFrame(() => window.scrollTo({ top, left: 0, behavior: "auto" }));
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
