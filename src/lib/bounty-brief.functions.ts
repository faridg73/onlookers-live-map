import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * Bounty brief assistant.
 *
 * Takes the poster's rough photo/video request and asks a model for a clearer
 * title, sharper camera instructions and a short list of safety considerations.
 * Suggestions are advisory only — the poster applies them by hand.
 */

const inputSchema = z.object({
  request: z.string().trim().min(8).max(1200),
  category: z.string().trim().max(120).optional(),
  locationType: z.string().trim().max(60).optional(),
  place: z.string().trim().max(200).optional(),
});

export type BountyBriefSuggestion = {
  title: string;
  instructions: string;
  safety: string[];
};

const RESPONSE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    title: {
      type: "string",
      description: "A short, specific request title, max 90 characters.",
    },
    instructions: {
      type: "string",
      description:
        "2-4 sentences of concrete camera instructions: what to capture, from where, how long, what proves it.",
    },
    safety: {
      type: "array",
      description: "2-4 short safety or consent considerations, one sentence each.",
      items: { type: "string" },
    },
  },
  required: ["title", "instructions", "safety"],
} as const;

const SYSTEM_PROMPT = [
  "You help people write clear photo and video capture requests on Onlooker, a marketplace where nearby verified creators film real-world moments for a reward.",
  "Rewrite the request so a stranger arriving on location knows exactly what to capture, from where, and what counts as proof.",
  "Never suggest filming inside private residences without authorization, trespassing, confronting people, following individuals, filming minors, or approaching emergencies, crime scenes or hazards.",
  "Never suggest filming a ticketed event, concert, performance, stage, field of play, court, screen or any broadcast. For venues and events, only suggest exterior public vantage points: the crowd out front, entry and box-office lines, merch or food lines, parking and tailgates, the marquee, and the street atmosphere before or after the event.",
  "Safety notes must be practical and specific to this request: consent, public-space limits, distance from hazards, traffic, private property, and local recording rules.",
  "Keep everything plain and short. No markdown, no emojis, no preamble.",
].join(" ");

export const suggestBountyBrief = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ data }): Promise<BountyBriefSuggestion> => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) {
      throw new Error("The suggestion helper is not configured yet.");
    }

    const context = [
      data.category ? `Category: ${data.category}` : null,
      data.locationType ? `Location type: ${data.locationType}` : null,
      data.place ? `Place: ${data.place}` : null,
      `Request from the poster: ${data.request}`,
    ]
      .filter(Boolean)
      .join("\n");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": apiKey,
        "X-Lovable-AIG-SDK": "fetch",
      },
      body: JSON.stringify({
        model: "openai/gpt-6-astra",
        instructions: SYSTEM_PROMPT,
        input: context,
        stream: true,
        reasoning: { effort: "low", summary: "auto" },
        text: {
          format: {
            type: "json_schema",
            name: "bounty_brief",
            strict: true,
            schema: RESPONSE_SCHEMA,
          },
        },
      }),
    });

    if (!response.ok || !response.body) {
      const detail = await response.text().catch(() => "");
      if (response.status === 429) {
        throw new Error("The suggestion helper is busy right now. Try again in a moment.");
      }
      if (response.status === 402 || response.status === 403) {
        throw new Error("AI suggestions are unavailable on this workspace right now.");
      }
      console.error("bounty brief gateway error", response.status, detail.slice(0, 500));
      throw new Error("Could not generate suggestions right now.");
    }

    // Reasoning models run long, so the call must stream; we accumulate the
    // text server-side and return the finished suggestion in one response.
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let text = "";

    const consume = (payload: string) => {
      if (payload === "[DONE]") return;
      let event: any;
      try {
        event = JSON.parse(payload);
      } catch {
        return;
      }
      if (event?.type === "response.output_text.delta" && typeof event.delta === "string") {
        text += event.delta;
      } else if (event?.type === "response.completed" && typeof event.response?.output_text === "string" && !text) {
        text = event.response.output_text;
      }
    };

    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      buffer += decoder.decode(chunk.value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        if (line.startsWith("data:")) consume(line.slice(5).trim());
      }
    }
    if (buffer.startsWith("data:")) consume(buffer.slice(5).trim());

    let parsed: unknown;
    try {
      parsed = JSON.parse(text.trim());
    } catch {
      throw new Error("The suggestion came back unreadable. Try again.");
    }

    const shape = z
      .object({
        title: z.string().trim().min(1).max(160),
        instructions: z.string().trim().min(1).max(1200),
        safety: z.array(z.string().trim().min(1).max(320)).max(6),
      })
      .safeParse(parsed);

    if (!shape.success) {
      throw new Error("The suggestion came back unreadable. Try again.");
    }

    return {
      title: shape.data.title.slice(0, 120),
      instructions: shape.data.instructions,
      safety: shape.data.safety.slice(0, 4),
    };
  });
