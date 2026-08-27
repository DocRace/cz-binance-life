/** Visible author characters before a trailing ellipsis. */
export const AUTHOR_NAME_MAX_CHARS = 10;

function authorNameChars(value: string): string[] {
  const trimmed = `${value || ""}`.trim();
  if (!trimmed) return [];
  if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
    return [...new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(trimmed)].map(
      (part) => part.segment,
    );
  }
  return [...trimmed];
}

/** Frontend-pass form: `0xD3D7d1aa...` — not a CSS overflow ellipsis. */
export function truncateAuthorName(
  value: string,
  max = AUTHOR_NAME_MAX_CHARS,
): string {
  const chars = authorNameChars(value);
  if (chars.length <= max) return chars.join("");
  return `${chars.slice(0, max).join("")}...`;
}
