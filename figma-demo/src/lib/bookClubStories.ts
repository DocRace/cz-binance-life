export type BookClubStory = {
  id: string;
  kind?: string;
  author_display: string;
  author_avatar_url?: string;
  headline: string;
  body: string;
  url?: string;
  created_at?: string;
  curator?: { tier: string; score: number; method: string };
};

export type BookClubStoriesDoc = {
  format_version?: number;
  stories?: BookClubStory[];
};

export function isTwitterStoryRow(story: BookClubStory): boolean {
  if (story.kind === "twitter") return true;
  if (story.kind === "community") return false;
  return /^tw-\d+$/.test(story.id);
}

export function storyDisplayText(story: BookClubStory): string {
  const body = `${story.body ?? ""}`.trim();
  const headline = `${story.headline ?? ""}`.trim();
  if (!body) return headline;
  if (!headline) return body;
  return body.length >= headline.length ? body : headline;
}

export function resolveStoryExternalUrl(story: BookClubStory): string | undefined {
  const raw = story.url?.trim();
  if (raw && /^https?:\/\//i.test(raw)) {
    if (/x\.com|twitter\.com/i.test(raw)) {
      return raw
        .replace(/twitter\.com/gi, "x.com")
        .replace(/mobile\.x\.com/gi, "x.com");
    }
    return raw;
  }
  if (isTwitterStoryRow(story) && /^tw-\d+$/.test(story.id)) {
    return `https://x.com/i/web/status/${story.id.slice(3)}`;
  }
  const handle = story.author_display.match(/@([A-Za-z0-9_]{1,30})/)?.[1];
  if (handle) return `https://x.com/${handle}`;
  return undefined;
}
