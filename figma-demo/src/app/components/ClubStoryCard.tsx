import { useEffect, useRef, useState, type RefObject } from "react";
import { motion } from "motion/react";
import { ChevronDown, ExternalLink } from "lucide-react";
import { useTranslation } from "react-i18next";
import ClubStoryAvatar from "./ClubStoryAvatar";
import type { BookClubStory } from "../../lib/bookClubStories";

/** Preview body max height — ~5 lines at base size. */
const STORY_PREVIEW_MAX_PX = 168;

interface ClubStoryCardProps {
  story: BookClubStory;
  displayText: string;
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
  displayText,
  externalUrl,
  linkLabel,
  index,
  onExpand,
}: ClubStoryCardProps) {
  const { t } = useTranslation();
  const previewRef = useRef<HTMLParagraphElement>(null);
  const overflows = usePreviewOverflow(displayText, previewRef);
  const showExpand = Boolean(displayText) && overflows;

  return (
    <motion.article
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.08 + index * 0.05 }}
      className="flex min-w-0 flex-col rounded-2xl border border-border/60 bg-card/35 p-5 backdrop-blur-sm hover:border-gold/25 transition-colors"
    >
      <div className="mb-3 flex min-w-0 items-center gap-3">
        <ClubStoryAvatar story={story} />
        <p className="min-w-0 flex-1 font-mono text-[11px] leading-snug text-gold/85 wrap-anywhere">
          {story.author_display}
        </p>
      </div>

      {displayText ? (
        <div className="relative flex-1 min-h-0">
          <p
            ref={previewRef}
            style={{ maxHeight: STORY_PREVIEW_MAX_PX }}
            className="overflow-hidden font-display text-base font-medium leading-relaxed text-white/95 whitespace-pre-wrap wrap-anywhere"
          >
            {displayText}
          </p>
          {showExpand ? (
            <div
              className="pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-card via-card/75 to-transparent"
              aria-hidden
            />
          ) : null}
        </div>
      ) : null}

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
        {showExpand ? (
          <button
            type="button"
            onClick={onExpand}
            className="inline-flex items-center gap-1 text-xs font-medium text-gold hover:text-gold-light transition-colors"
          >
            {t("club.storiesExpand")}
            <ChevronDown className="size-3.5" aria-hidden />
          </button>
        ) : null}
        {externalUrl ? (
          <a
            href={externalUrl}
            target="_blank"
            rel="noopener noreferrer"
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
