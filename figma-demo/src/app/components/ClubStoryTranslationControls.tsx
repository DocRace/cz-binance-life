import type { MouseEvent } from "react";
import { Languages } from "lucide-react";
import { useTranslation } from "react-i18next";

type ClubStoryTranslationControlsProps = {
  showingTranslation: boolean;
  showOriginal: boolean;
  loading?: boolean;
  failed?: boolean;
  onToggle: () => void;
  /** When true, clicks do not bubble (e.g. on story cards). */
  stopPropagation?: boolean;
  className?: string;
};

export default function ClubStoryTranslationControls({
  showingTranslation,
  showOriginal,
  loading = false,
  failed = false,
  onToggle,
  stopPropagation = false,
  className = "",
}: ClubStoryTranslationControlsProps) {
  const { t } = useTranslation();

  if (loading) {
    return (
      <span className={`text-[10px] text-muted-foreground/80 ${className}`.trim()}>
        {t("club.storiesTranslating")}
      </span>
    );
  }

  if (failed) {
    return (
      <span className={`text-[10px] text-amber-500/90 ${className}`.trim()}>
        {t("club.storiesTranslationFailed")}
      </span>
    );
  }

  if (!showingTranslation && !showOriginal) return null;

  const label = showOriginal ? t("club.storiesShowTranslation") : t("club.storiesShowOriginal");

  const handleClick = (e: MouseEvent<HTMLButtonElement>) => {
    if (stopPropagation) e.stopPropagation();
    onToggle();
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`inline-flex items-center gap-1 rounded-full border border-sky-400/35 bg-sky-500/10 px-2 py-0.5 text-[10px] font-medium text-sky-300/95 hover:bg-sky-500/20 transition-colors ${className}`.trim()}
      aria-pressed={showOriginal}
    >
      <Languages className="size-3 shrink-0" aria-hidden />
      <span>{showingTranslation ? t("club.storiesTranslatedLabel") : null}</span>
      <span className="text-sky-200/80">·</span>
      <span>{label}</span>
    </button>
  );
}
