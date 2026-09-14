import DOMPurify from "dompurify";
import { z } from "zod";

/**
 * Every piece of text a person types — bounty titles, instructions, post
 * bodies, chat lines, comments, reports — passes through here before it is
 * stored or shown. Onlooker Live never renders user HTML, so the safest thing
 * is to keep plain text only: markup, scripts and control characters are
 * removed rather than escaped.
 *
 * In the browser DOMPurify does the stripping; on the server (no DOM) an
 * equivalent tag stripper runs, so both sides of a submission apply the rules.
 */

const purifier =
  typeof window !== "undefined" && typeof window.document !== "undefined"
    ? DOMPurify(window)
    : null;

/** No-DOM stripper: removes tags, entities that rebuild tags, and bad schemes. */
function serverStrip(value: string): string {
  return value
    .replace(/<\s*\/?\s*[a-z][^>]*>/gi, " ")
    .replace(/<[^>]*$/g, " ")
    .replace(/&lt;\s*\/?\s*[a-z][^&]*&gt;/gi, " ")
    .replace(/&#x?[0-9a-f]+;?/gi, " ");
}

function stripMarkup(value: string): string {
  if (purifier?.sanitize) {
    return purifier.sanitize(value, { ALLOWED_TAGS: [], ALLOWED_ATTR: [], KEEP_CONTENT: true });
  }
  return serverStrip(value);
}

/** Removes invisible control characters, zero-width joiners and BOM tricks. */
function stripInvisible(value: string): string {
  // eslint-disable-next-line no-control-regex
  return value.replace(
    /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u200B-\u200F\u202A-\u202E\uFEFF]/g,
    "",
  );
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
  let value = defuseSchemes(stripMarkup(stripInvisible(input)));
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

/**
 * Cleans a search / place lookup phrase. On top of the normal cleaning this
 * keeps only characters real place names use, so quotes, braces, backslashes
 * and query operators can never reach a database filter or an outside API.
 */
export function sanitizeQuery(input: unknown, maxLength = 120): string {
  const cleaned = sanitizeText(input, { maxLength: maxLength * 2 });
  return cleaned
    .replace(/[^\p{L}\p{N}\s,.'&/()#+-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

/** Zod field for a search box or location lookup. */
export function safeQuery(max = 120, min = 2) {
  return z
    .string()
    .max(max * 4, { message: "That search is too long." })
    .transform((value) => sanitizeQuery(value, max))
    .refine((value) => value.length >= min, {
      message: `Please type at least ${min} characters.`,
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
