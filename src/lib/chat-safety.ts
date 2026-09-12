/**
 * Every deal, clip and status update has to stay inside Onlooker, so chat
 * messages get contact details masked before they are stored or shown.
 */
const PATTERNS: { re: RegExp; replacement: string }[] = [
  // Emails
  { re: /[\w.+-]+@[\w-]+\.[\w.-]{2,}/gi, replacement: "[contact hidden]" },
  // Links / social handles pointing off-platform
  {
    re: /\b(?:https?:\/\/|www\.)\S+/gi,
    replacement: "[link hidden]",
  },
  {
    re: /\b(?:whats\s?app|telegram|signal|snap(?:chat)?|insta(?:gram)?|venmo|cash\s?app|paypal|zelle)\b[:\s]*[@\w.+-]*/gi,
    replacement: "[contact hidden]",
  },
  // Phone numbers, including spelled-out and spaced digits
  {
    re: /(?:\+?\d[\d\s().-]{7,}\d)/g,
    replacement: "[number hidden]",
  },
];

export function maskContactInfo(text: string) {
  let masked = text;
  for (const { re, replacement } of PATTERNS) masked = masked.replace(re, replacement);
  return masked;
}

export function hasMaskedContactInfo(text: string) {
  return maskContactInfo(text) !== text;
}

export const CHAT_SAFETY_NOTE =
  "Keep it in Onlooker: phone numbers, emails and outside links are hidden automatically. Payment is only protected while the clip and chat stay in the app.";
