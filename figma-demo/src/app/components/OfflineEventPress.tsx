import { useEffect } from "react";
import { useLocation } from "react-router";
import { motion } from "motion/react";
import { ExternalLink, Newspaper, Play, Youtube } from "lucide-react";
import { useTranslation } from "react-i18next";
import { OFFLINE_EVENT_PRESS, youtubeThumb } from "../../lib/offlineEventPress";
import { CARD_HOVER, CARD_SURFACE, CONTENT_DEFAULT, GRID_GAP, SECTION_SPACING } from "../layout/pageLayout";

export default function OfflineEventPress() {
  const { t } = useTranslation();
  const location = useLocation();

  useEffect(() => {
    if (location.hash !== "#press") return;
    const el = document.getElementById("press");
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [location.hash]);

  const featured = OFFLINE_EVENT_PRESS.find((item) => item.featured);
  const articles = OFFLINE_EVENT_PRESS.filter((item) => !item.featured);

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      className={`${CONTENT_DEFAULT} ${SECTION_SPACING} mt-12 md:mt-16 scroll-mt-28`}
      aria-labelledby="offline-event-press"
      id="press"
    >
      <h2 id="offline-event-press" className="mb-3 font-display text-2xl md:text-3xl text-foreground">
        {t("offlineEvent.pressTitle")}
      </h2>
      <p className="mb-8 max-w-3xl text-sm leading-relaxed text-muted-foreground">
        {t("offlineEvent.pressLead")}
      </p>

      {featured?.youtubeId ? (
        <a
          href={featured.url}
          target="_blank"
          rel="noopener noreferrer"
          className={`mb-8 flex flex-col overflow-hidden no-underline sm:flex-row ${CARD_SURFACE} ${CARD_HOVER}`}
        >
          <div className="relative aspect-video w-full shrink-0 overflow-hidden bg-black/40 sm:aspect-auto sm:w-[22rem] sm:min-h-[12.5rem]">
            <img
              src={youtubeThumb(featured.youtubeId)}
              alt=""
              className="h-full w-full object-cover"
              loading="lazy"
              decoding="async"
            />
            <span className="absolute inset-0 flex items-center justify-center bg-black/25">
              <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-gold text-primary-foreground shadow-lg">
                <Play className="h-6 w-6 translate-x-0.5" aria-hidden />
              </span>
            </span>
          </div>
          <div className="flex min-w-0 flex-1 flex-col justify-center p-6 md:p-7">
            <p className="mb-2 inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.14em] text-gold/85">
              <Youtube className="h-3.5 w-3.5" aria-hidden />
              {t(`offlineEvent.pressItems.${featured.id}.outlet`)}
            </p>
            <h3 className="font-display text-xl text-foreground md:text-2xl">
              {t(`offlineEvent.pressItems.${featured.id}.title`)}
            </h3>
            <p className="mt-3 inline-flex items-center gap-1.5 text-sm text-gold">
              {t("offlineEvent.pressWatch")}
              <ExternalLink className="h-3.5 w-3.5" aria-hidden />
            </p>
          </div>
        </a>
      ) : null}

      <ul className={`grid list-none grid-cols-1 p-0 ${GRID_GAP} md:grid-cols-2`}>
        {articles.map((item) => (
          <li key={item.id} className="min-w-0">
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex h-full min-h-[8.5rem] flex-col p-6 no-underline md:p-7 ${CARD_SURFACE} ${CARD_HOVER}`}
            >
              <p className="mb-2 inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.14em] text-gold/85">
                <Newspaper className="h-3.5 w-3.5 shrink-0" aria-hidden />
                {t(`offlineEvent.pressItems.${item.id}.outlet`)}
              </p>
              <h3 className="font-display text-lg leading-snug text-foreground">
                {t(`offlineEvent.pressItems.${item.id}.title`)}
              </h3>
              <p className="mt-auto pt-4 inline-flex items-center gap-1.5 text-sm text-gold">
                {t("offlineEvent.pressRead")}
                <ExternalLink className="h-3.5 w-3.5" aria-hidden />
              </p>
            </a>
          </li>
        ))}
      </ul>
    </motion.section>
  );
}
