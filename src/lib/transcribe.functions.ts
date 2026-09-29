// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Speech-to-text for the request composer.
 *
 * Browsers without a working live dictation engine (most in-app WebViews and
 * iOS) record a short clip instead; this turns that clip into text so the mic
 * button always produces something the poster can edit.
 */

const MIME_EXTENSIONS: Record<string, string> = {
  "audio/webm": "webm",
  "audio/ogg": "ogg",
  "audio/mp4": "mp4",
  "audio/m4a": "m4a",
  "audio/x-m4a": "m4a",
  "audio/mpeg": "mp3",
  "audio/wav": "wav",
  "audio/x-wav": "wav",
};

const inputSchema = z.object({
  /** Base64 clip body without the data: prefix. */
  audioBase64: z.string().min(32).max(8_000_000),
  mimeType: z.string().trim().min(4).max(80),
});

export const transcribeSpeech = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ data }): Promise<{ text: string }> => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("Voice input is not configured yet.");

    const baseMime = data.mimeType.split(";")[0]!.trim().toLowerCase();
    const extension = MIME_EXTENSIONS[baseMime];
    if (!extension) throw new Error("That recording format is not supported.");

    const binary = Uint8Array.from(atob(data.audioBase64), (char) => char.charCodeAt(0));
    const form = new FormData();
    form.append("file", new Blob([binary], { type: baseMime }), `speech.${extension}`);
    form.append("model", "openai/gpt-4o-mini-transcribe");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/audio/transcriptions", {
      method: "POST",
      headers: { "Lovable-API-Key": apiKey },
      body: form,
    });

    if (!response.ok) {
      if (response.status === 429) throw new Error("Voice input is busy right now. Try again in a moment.");
      const detail = await response.text().catch(() => "");
      console.error("transcribe gateway error", response.status, detail.slice(0, 300));
      throw new Error("Could not turn that recording into text.");
    }

    const payload = (await response.json()) as { text?: unknown };
    const text = typeof payload.text === "string" ? payload.text.trim() : "";
    if (!text) throw new Error("Nothing was picked up — try speaking a little closer to the mic.");
    return { text: text.slice(0, 1200) };
  });
