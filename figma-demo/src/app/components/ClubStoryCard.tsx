import { useEffect, useRef, useState, type KeyboardEvent, type MouseEvent, type RefObject } from "react";
import { motion } from "motion/react";
import { ExternalLink } from "lucide-react";
import { useTranslation } from "react-i18next";
import ClubStoryAvatar from "./ClubStoryAvatar";
import ClubStoryTranslationControls from "./ClubStoryTranslationControls";
import { useClubStoryLocalizedText } from "../hooks/useClubStoryLocalizedText";
import { storyCjkScriptFontClass, type BookClubStory } from "../../lib/bookClubStories";

/** Preview body max height — ~5 lines at base size. */
const STORY_PREVIEW_MAX_PX = 168;

interface ClubStoryCardProps {
  story: BookClubStory;
  originalText: string;
  externalUrl?: string;
  linkLabel: string;
  index: number;
  onExpand: () => void;
}

function usePreviewOverflow(text: string, previewRef: RefObject<HTMLParagraphElement | null>) {
  const [overflows, setOverflows] = useState(false);

  useEffect(() => {
    const el = previewRef.current;
    if (!el) return;

    const measure = () => {
      setOverflows(el.scrollHeight > STORY_PREVIEW_MAX_PX + 2);
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [text, previewRef]);

  return overflows;
}

export default function ClubStoryCard({
  story,
  originalText,
  externalUrl,
  linkLabel,
  index,
  onExpand,
}: ClubStoryCardProps) {
  const { t } = useTranslation();
  const localized = useClubStoryLocalizedText(story.id, originalText, "preview");
  const previewRef = useRef<HTMLParagraphElement>(null);
  const overflows = usePreviewOverflow(localized.visibleText, previewRef);
  const scriptFontClass = storyCjkScriptFontClass(story);
  const bodyFontClass = localized.showingTranslation ? "font-body" : scriptFontClass;
  const canOpenDetail = Boolean(originalText);

  const openDetail = () => {
    if (canOpenDetail) onExpand();
  };

  const handleCardClick = () => {
    openDetail();
  };

  const handleCardKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openDetail();
    }
  };

  const stopCardActivation = (e: MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <motion.article
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.08 + index * 0.05 }}
      role={canOpenDetail ? "button" : undefined}
      tabIndex={canOpenDetail ? 0 : undefined}
      aria-label={canOpenDetail ? t("club.storiesExpand") : undefined}
      onClick={canOpenDetail ? handleCardClick : undefined}
      onKeyDown={canOpenDetail ? handleCardKeyDown : undefined}
      className={`flex min-w-0 flex-col rounded-2xl border border-border/60 bg-card/35 p-5 backdrop-blur-sm transition-colors ${
        canOpenDetail
          ? "cursor-pointer hover:border-gold/35 hover:bg-card/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/40"
          : "hover:border-gold/25"
      }`}
    >
      <div className="mb-3 flex min-w-0 items-center gap-3 pointer-events-none">
        <ClubStoryAvatar story={story} />
        <p className={`min-w-0 flex-1 ${scriptFontClass} text-[11px] leading-snug text-gold/85 wrap-anywhere`}>
          {story.author_display}
        </p>
      </div>

      {localized.visibleText ? (
        <p
          ref={previewRef}
          style={{
            maxHeight: STORY_PREVIEW_MAX_PX,
            ...(overflows
              ? {
                  WebkitMaskImage:
                    "linear-gradient(to bottom, #000 0%, #000 58%, rgba(0,0,0,0.45) 78%, transparent 100%)",
                  maskImage:
                    "linear-gradient(to bottom, #000 0%, #000 58%, rgba(0,0,0,0.45) 78%, transparent 100%)",
                }
              : {}),
          }}
          className={`overflow-hidden pointer-events-none ${bodyFontClass} text-base font-normal leading-relaxed text-white/95 whitespace-pre-wrap wrap-anywhere`}
        >
          {localized.visibleText}
        </p>
      ) : null}

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
        <ClubStoryTranslationControls
          showingTranslation={localized.showingTranslation}
          showOriginal={localized.showOriginal}
          loading={localized.loading}
          failed={localized.failed}
          onToggle={localized.toggleOriginal}
          stopPropagation
        />
        {canOpenDetail ? (
          <span className="pointer-events-none text-xs font-medium text-gold/80">{t("club.storiesExpand")}</span>
        ) : null}
        {externalUrl ? (
          <a
            href={externalUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={stopCardActivation}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-sky-400 hover:text-sky-300"
          >
            {linkLabel}
            <ExternalLink className="size-3" aria-hidden />
          </a>
        ) : null}
      </div>
    </motion.article>
  );
}
