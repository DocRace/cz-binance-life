import type { BookClubStory } from "./bookClubStories";

/** Extract @handle from display strings like `Name · @handle`. */
export function extractTwitterHandle(authorDisplay: string): string | undefined {
  return authorDisplay.match(/@([A-Za-z0-9_]{1,30})/)?.[1];
}

/** Twitter profile CDN URLs are stable and work reliably in Chrome (unavatar often 429s). */
export function isDirectTwitterAvatarUrl(url: string): boolean {
  return /pbs\.twimg\.com\/profile_images/i.test(url);
}

/** Prefer larger profile art in the 44px UI. */
export function upgradeTwitterAvatarUrl(url: string): string {
  return url.replace(/_normal\.(jpe?g|png|webp)$/i, "_400x400.$1");
}

/**
 * Avatar load order: baked CDN URL → same-origin BFF redirect → legacy unavatar → icon fallback.
 */
export function buildClubStoryAvatarCandidates(story: BookClubStory): string[] {
  const handle = extractTwitterHandle(story.author_display);
  const raw = story.author_avatar_url?.trim();
  const out: string[] = [];

  if (raw && isDirectTwitterAvatarUrl(raw)) {
    out.push(upgradeTwitterAvatarUrl(raw));
  }
  if (handle) {
    out.push(`/api/bff/club/avatar/${encodeURIComponent(handle)}`);
  }
  if (raw && !out.includes(raw)) {
    out.push(raw);
  }
  if (handle) {
    const unavatar = `https://unavatar.io/x/${encodeURIComponent(handle)}`;
    if (!out.includes(unavatar)) out.push(unavatar);
  }

  return out;
}
