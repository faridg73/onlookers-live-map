import { z } from "zod";

/**
 * Every piece of text a person types — bounty titles, instructions, post
 * bodies, chat lines, comments, reports — passes through here before it is
 * stored or shown. Onlooker Live never renders user HTML, so the safest thing
 * is to keep plain text only: markup, scripts and control characters are
 * removed rather than escaped.
 *
 * Runs on the client (DOMPurify) and on the server (regex fallback, no DOM),
 * so the same rules apply on both sides of every submission.
 */

/** Strips markup with DOMPurify in the browser; falls back to a tag stripper. */
function stripMarkup(value: string): string {
  if (typeof window !== "undefined" && typeof window.document !== "undefined") {
    // Loaded lazily so the server bundle never touches the DOM build.
    const purify = getPurify();
    if (purify) {
      return purify.sanitize(value, { ALLOWED_TAGS: [], ALLOWED_ATTR: [], KEEP_CONTENT: true });
    }
  }
  return serverStrip(value);
}

let cachedPurify: { sanitize: (dirty: string, cfg: object) => string } | null | undefined;

function getPurify() {
  if (cachedPurify !== undefined) return cachedPurify;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = (globalThis as { __onlookerPurify?: unknown }).__onlookerPurify;
    cachedPurify = (mod as typeof cachedPurify) ?? null;
  } catch {
    cachedPurify = null;
  }
  return cachedPurify;
}

/** Registers the DOMPurify instance once the browser bundle has loaded it. */
export function registerPurify(instance: { sanitize: (dirty: string, cfg: object) => string }) {
  cachedPurify = instance;
  (globalThis as { __onlookerPurify?: unknown }).__onlookerPurify = instance;
}

/** No-DOM stripper: removes tags, entities that rebuild tags, and bad schemes. */
function serverStrip(value: string): string {
  return value
    .replace(/<\s*\/?\s*[a-z][^>]*>/gi, " ")
    .replace(/<[^>]*$/g, " ")
    .replace(/&lt;\s*\/?\s*[a-z][^&]*&gt;/gi, " ")
    .replace(/&#x?[0-9a-f]+;?/gi, " ");
}

/** Removes invisible control characters, zero-width joiners and BOM tricks. */
function stripInvisible(value: string): string {
  // eslint-disable-next-line no-control-regex
  return value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u200B-\u200F\u202A-\u202E\uFEFF]/g, "");
}

/** Neutralises javascript:, data: and vbscript: URLs pasted into text. */
function defuseSchemes(value: string): string {
  return value.replace(/\b(javascript|vbscript|data)\s*:/gi, "$1_");
}

export type SanitizeOptions = {
  /** Keeps line breaks (post bodies, instructions). Default collapses them. */
  multiline?: boolean;
  /** Hard cap applied after cleaning. */
  maxLength?: number;
};

/** Cleans a single-line or multi-line field down to safe plain text. */
export function sanitizeText(input: unknown, options: SanitizeOptions = {}): string {
  if (typeof input !== "string") return "";
  let value = stripInvisible(input);
  value = stripMarkup(value);
  value = defuseSchemes(value);
  value = value.replace(/\r\n?/g, "\n");
  value = options.multiline
    ? value
        .split("\n")
        .map((line) => line.replace(/[ \t]+/g, " ").trim())
        .join("\n")
        .replace(/\n{3,}/g, "\n\n")
    : value.replace(/\s+/g, " ");
  value = value.trim();
  if (options.maxLength && value.length > options.maxLength) {
    value = value.slice(0, options.maxLength).trim();
  }
  return value;
}

/** Cleans a whole form object's string fields in one call. */
export function sanitizeFields<T extends Record<string, unknown>>(
  values: T,
  multilineKeys: ReadonlyArray<keyof T> = [],
): T {
  const out: Record<string, unknown> = { ...values };
  for (const [key, value] of Object.entries(values)) {
    if (typeof value === "string") {
      out[key] = sanitizeText(value, { multiline: multilineKeys.includes(key as keyof T) });
    }
  }
  return out as T;
}

/** Zod field for a short, single-line piece of user text. */
export function safeText(max: number, min = 0) {
  return z
    .string()
    .max(max * 4, { message: "That text is too long." })
    .transform((value) => sanitizeText(value, { maxLength: max }))
    .refine((value) => value.length >= min, {
      message: min > 0 ? `Please enter at least ${min} characters.` : "This field is required.",
    });
}

/** Zod field for a longer, multi-line piece of user text. */
export function safeMultiline(max: number, min = 0) {
  return z
    .string()
    .max(max * 4, { message: "That text is too long." })
    .transform((value) => sanitizeText(value, { multiline: true, maxLength: max }))
    .refine((value) => value.length >= min, {
      message: min > 0 ? `Please enter at least ${min} characters.` : "This field is required.",
    });
}
