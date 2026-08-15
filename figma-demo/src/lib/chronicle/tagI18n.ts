import type { TFunction } from "i18next";

/** Localized behavior-tag display name; falls back to catalog Chinese label. */
export function localizedBehaviorTagLabel(
  tagId: string,
  fallbackLabel: string,
  t: TFunction,
): string {
  const key = `chronicle.tagLabels.${tagId}`;
  const out = t(key, { defaultValue: "" });
  if (out && out !== key) return out;
  return fallbackLabel || tagId;
}
