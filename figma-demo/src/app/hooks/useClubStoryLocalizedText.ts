import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useClubStoryTranslations } from "../context/ClubStoryTranslationsContext";
import {
  isChineseUiLanguage,
  lookupClubStoryTranslation,
  resolveClubStoryTranslateTarget,
  type ClubStoryTranslateScope,
} from "../../lib/clubStoryTranslate";

export function useClubStoryLocalizedText(
  storyId: string,
  originalText: string,
  scope: ClubStoryTranslateScope = "full",
) {
  const { i18n } = useTranslation();
  const { byId, ready } = useClubStoryTranslations();
  const uiLng = i18n.resolvedLanguage || i18n.language;
  const target = useMemo(() => resolveClubStoryTranslateTarget(uiLng), [uiLng]);
  const needsTranslation = Boolean(target) && !isChineseUiLanguage(uiLng) && Boolean(originalText.trim());

  const [showOriginal, setShowOriginal] = useState(false);

  const translatedText = useMemo(() => {
    if (!needsTranslation || !target) return null;
    return lookupClubStoryTranslation(byId, storyId, target, scope);
  }, [byId, storyId, target, scope, needsTranslation]);

  const toggleOriginal = useCallback(() => {
    setShowOriginal((v) => !v);
  }, []);

  const showingTranslation = needsTranslation && !showOriginal && Boolean(translatedText);
  const visibleText =
    !needsTranslation || showOriginal || !translatedText ? originalText : translatedText;

  return {
    needsTranslation,
    showingTranslation,
    showOriginal,
    toggleOriginal,
    visibleText,
    loading: needsTranslation && !ready,
    failed: needsTranslation && ready && !translatedText,
  };
}
