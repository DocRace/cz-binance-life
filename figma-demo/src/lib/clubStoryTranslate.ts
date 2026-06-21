export type ClubStoryTranslateTarget = "en" | "ko" | "ja";

export type ClubStoryTranslateScope = "preview" | "full";

export type BookClubStoriesI18nDoc = {
  format_version?: number;
  generated_at?: string;
  targets?: ClubStoryTranslateTarget[];
  by_id?: ClubStoryTranslationsById;
};

export type ClubStoryTranslationsById = Record<
  string,
  Partial<Record<ClubStoryTranslateTarget, string>>
>;

export function isChineseUiLanguage(lng: string | undefined): boolean {
  const code = `${lng || ""}`.trim().toLowerCase();
  if (!code) return false;
  return code === "zh-tw" || code === "zh-hk" || code === "zh-mo" || code.startsWith("zh");
}

export function resolveClubStoryTranslateTarget(lng: string | undefined): ClubStoryTranslateTarget | null {
  const code = `${lng || ""}`.trim().toLowerCase();
  if (code.startsWith("en")) return "en";
  if (code.startsWith("ko")) return "ko";
  if (code.startsWith("ja")) return "ja";
  return null;
}

export function applyClubStoryTextScope(text: string, scope: ClubStoryTranslateScope): string {
  const sample = `${text || ""}`.trim();
  if (scope !== "preview" || sample.length <= 520) return sample;
  const slice = sample.slice(0, 520);
  const breakAt = Math.max(slice.lastIndexOf("\n"), slice.lastIndexOf("。"), slice.lastIndexOf("，"));
  if (breakAt > 280) return slice.slice(0, breakAt + 1).trim();
  return slice.trim();
}

export function lookupClubStoryTranslation(
  byId: ClubStoryTranslationsById,
  storyId: string,
  target: ClubStoryTranslateTarget,
  scope: ClubStoryTranslateScope = "full",
): string | null {
  const raw = byId[storyId]?.[target]?.trim();
  if (!raw) return null;
  return applyClubStoryTextScope(raw, scope);
}
