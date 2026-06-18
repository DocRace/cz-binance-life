import { useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ExternalLink, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import OverlayPortal from "./OverlayPortal";
import { overlayBackdropClass } from "../lib/overlayLayers";
import ClubStoryAvatar from "./ClubStoryAvatar";
import type { BookClubStory } from "../../lib/bookClubStories";

interface ClubStoryDetailModalProps {
  story: BookClubStory;
  displayText: string;
  externalUrl?: string;
  linkLabel: string;
  onClose: () => void;
}

export default function ClubStoryDetailModal({
  story,
  displayText,
  externalUrl,
  linkLabel,
  onClose,
}: ClubStoryDetailModalProps) {
  const { t } = useTranslation();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <OverlayPortal>
      <AnimatePresence>
        <motion.div
          className={`${overlayBackdropClass} items-end sm:items-center`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="club-story-detail-title"
            className="relative w-full max-w-2xl max-h-[min(88vh,720px)] overflow-hidden rounded-t-2xl sm:rounded-2xl border border-border bg-card shadow-2xl flex flex-col"
            initial={{ y: 24, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 16, opacity: 0, scale: 0.98 }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={onClose}
              className="absolute top-4 right-4 z-10 rounded-full p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
              aria-label={t("common.close")}
            >
              <X className="size-5" />
            </button>

            <div className="shrink-0 border-b border-border/60 px-5 pt-5 pb-4 pr-14">
              <div className="flex items-center gap-3">
                <ClubStoryAvatar story={story} />
                <div className="min-w-0">
                  <p
                    id="club-story-detail-title"
                    className="font-cjk text-xs leading-snug text-gold/90 wrap-anywhere"
                  >
                    {story.author_display}
                  </p>
                  {story.created_at ? (
                    <p className="mt-1 text-[11px] text-muted-foreground">{story.created_at}</p>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4">
              {displayText ? (
                <p className="font-cjk text-base md:text-lg font-normal leading-relaxed text-white/95 whitespace-pre-wrap wrap-anywhere">
                  {displayText}
                </p>
              ) : null}
            </div>

            {externalUrl ? (
              <div className="shrink-0 border-t border-border/60 px-5 py-4">
                <a
                  href={externalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-sky-400 hover:text-sky-300"
                >
                  {linkLabel}
                  <ExternalLink className="size-3.5" aria-hidden />
                </a>
              </div>
            ) : null}
          </motion.div>
        </motion.div>
      </AnimatePresence>
    </OverlayPortal>
  );
}
