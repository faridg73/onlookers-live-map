// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import { useCallback, useEffect, useRef, useState } from "react";
import { transcribeSpeech } from "@/lib/transcribe.functions";

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
};

type RecognitionCtor = new () => SpeechRecognitionLike;

/** Longest clip we record before transcribing, so nothing runs away in the background. */
const MAX_CLIP_MS = 45_000;

function recognitionCtor(): RecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const scope = window as unknown as {
    SpeechRecognition?: RecognitionCtor;
    webkitSpeechRecognition?: RecognitionCtor;
  };
  return scope.SpeechRecognition ?? scope.webkitSpeechRecognition ?? null;
}

function canRecord() {
  return (
    typeof window !== "undefined" &&
    typeof MediaRecorder !== "undefined" &&
    Boolean(navigator.mediaDevices?.getUserMedia)
  );
}

/** First container this device can actually record, preferring formats the transcriber accepts. */
function pickMimeType(): string | undefined {
  const candidates = ["audio/webm", "audio/mp4", "audio/ogg", "audio/mpeg"];
  for (const candidate of candidates) {
    if (MediaRecorder.isTypeSupported?.(candidate)) return candidate;
  }
  return undefined;
}

function toBase64(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let index = 0; index < bytes.length; index += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
  }
  return btoa(binary);
}

/**
 * Tap-to-speak dictation for text inputs.
 *
 * Uses the browser's live dictation engine when it works, and otherwise records
 * a short clip and has it transcribed, so in-app WebViews and iOS still capture
 * speech instead of only asking for the microphone.
 */
export function useVoiceInput(onTranscript: (text: string) => void) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const engine = useRef<SpeechRecognitionLike | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const gotResult = useRef(false);
  const alive = useRef(true);
  const handler = useRef(onTranscript);
  handler.current = onTranscript;

  useEffect(() => {
    alive.current = true;
    setSupported(recognitionCtor() !== null || canRecord());
    return () => {
      alive.current = false;
      if (timer.current) clearTimeout(timer.current);
      engine.current?.abort();
      recorder.current?.stream.getTracks().forEach((track) => track.stop());
    };
  }, []);

  const stopRecorder = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    const active = recorder.current;
    if (active && active.state !== "inactive") active.stop();
  }, []);

  const stop = useCallback(() => {
    engine.current?.stop();
    stopRecorder();
    setListening(false);
  }, [stopRecorder]);

  /** Records a clip and sends it for transcription — the path that works everywhere. */
  const recordAndTranscribe = useCallback(async () => {
    if (!canRecord()) {
      setError("Voice input is not available on this device. Type your request instead.");
      return;
    }
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setError("Allow microphone access to speak your request.");
      return;
    }

    const mimeType = pickMimeType();
    let instance: MediaRecorder;
    try {
      instance = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
    } catch {
      stream.getTracks().forEach((track) => track.stop());
      setError("This device cannot record audio. Type your request instead.");
      return;
    }

    chunks.current = [];
    recorder.current = instance;
    instance.ondataavailable = (event) => {
      if (event.data.size > 0) chunks.current.push(event.data);
    };
    instance.onstop = async () => {
      stream.getTracks().forEach((track) => track.stop());
      recorder.current = null;
      if (alive.current) setListening(false);
      const type = instance.mimeType || mimeType || "audio/webm";
      const blob = new Blob(chunks.current, { type });
      chunks.current = [];
      if (blob.size < 1200) {
        if (alive.current) setError("That was too short to hear. Hold the mic a little longer.");
        return;
      }
      if (alive.current) setTranscribing(true);
      try {
        const buffer = await blob.arrayBuffer();
        const result = await transcribeSpeech({
          data: { audioBase64: toBase64(buffer), mimeType: type },
        });
        if (result.text) handler.current(result.text);
      } catch (cause) {
        if (alive.current) {
          const message = cause instanceof Error ? cause.message : "";
          setError(
            /unauthorized/i.test(message)
              ? "Sign in again to use voice input."
              : message || "Could not turn that recording into text.",
          );
        }
      } finally {
        if (alive.current) setTranscribing(false);
      }
    };

    setError(null);
    setListening(true);
    instance.start();
    timer.current = setTimeout(() => stopRecorder(), MAX_CLIP_MS);
  }, [stopRecorder]);

  const start = useCallback(() => {
    const Ctor = recognitionCtor();
    if (!Ctor) {
      void recordAndTranscribe();
      return;
    }

    setError(null);
    gotResult.current = false;
    const instance = new Ctor();
    instance.lang = navigator.language || "en-US";
    instance.continuous = false;
    instance.interimResults = true;
    instance.onresult = (event) => {
      let text = "";
      for (let index = 0; index < event.results.length; index += 1) {
        text += event.results[index]?.[0]?.transcript ?? "";
      }
      if (text.trim()) {
        gotResult.current = true;
        handler.current(text.trim());
      }
    };
    instance.onerror = (event) => {
      engine.current = null;
      setListening(false);
      // The live engine is missing or blocked in this WebView — record instead
      // of leaving the poster with a permission prompt and no text.
      if (!gotResult.current) {
        void recordAndTranscribe();
        return;
      }
      setError("Voice input stopped. Try again or type instead.");
      if (event.error) console.warn("[voice] recognition error", event.error);
    };
    instance.onend = () => {
      engine.current = null;
      setListening(false);
    };
    engine.current = instance;
    try {
      instance.start();
      setListening(true);
    } catch {
      engine.current = null;
      void recordAndTranscribe();
    }
  }, [recordAndTranscribe]);

  const toggle = useCallback(() => {
    if (transcribing) return;
    if (listening) stop();
    else start();
  }, [listening, start, stop, transcribing]);

  return { supported, listening, transcribing, error, start, stop, toggle };
}
