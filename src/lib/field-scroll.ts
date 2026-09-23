/**
 * After a field is pre-filled programmatically, scroll it back to the start so
 * the person sees the beginning of the text instead of landing mid-sentence.
 */
export function scrollFieldToStart(field: HTMLInputElement | HTMLTextAreaElement | null) {
  if (!field) return;
  requestAnimationFrame(() => {
    field.scrollTop = 0;
    field.scrollLeft = 0;
    try {
      field.setSelectionRange(0, 0);
    } catch {
      // Some input types (e.g. number) don't support selection ranges.
    }
  });
}
