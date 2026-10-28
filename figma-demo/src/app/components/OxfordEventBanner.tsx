import { Link } from "react-router";
import { motion } from "motion/react";
import { ChevronRight, MapPin } from "lucide-react";
import { useTranslation } from "react-i18next";
import { OXFORD_EVENT_MARK_SRC } from "../../config/platform";

type OxfordEventBannerProps = {
  className?: string;
};

/** Homepage lead banner for the Oxford debate. Links to the current event page. */
export default function OxfordEventBanner({ className = "" }: OxfordEventBannerProps) {
  const { t } = useTranslation();

  return (
    <motion.section
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55 }}
      className={`relative overflow-hidden rounded-2xl border border-[#c9a76a]/40 md:min-h-[22rem] ${className}`}
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 120% 90% at 92% 50%, rgba(92,84,76,0.28), transparent 68%), linear-gradient(155deg, #141210 0%, #1b1815 58%, #221e1b 100%)",
        }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.018) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.018) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          maskImage: "linear-gradient(to bottom, rgba(0,0,0,0.45), transparent 80%)",
        }}
        aria-hidden
      />

      <div className="relative z-[1] grid items-center gap-8 p-5 sm:p-7 md:grid-cols-[1.2fr_0.8fr] md:gap-10 md:p-8 lg:p-10">
        <div className="min-w-0">
          <p className="mb-3 inline-flex rounded-full border border-[#c9a76a]/40 bg-[#1a1714]/45 px-3 py-1 text-[10px] font-tech uppercase tracking-[0.2em] text-gold">
            {t("offlineEvent.brand")}
          </p>
          <h2 className="mb-3 max-w-xl font-display text-[1.75rem] font-medium leading-[1.15] tracking-tight text-[#f5f1e8] sm:text-4xl lg:text-[2.65rem]">
            {t("offlineEvent.launchHeadline")}
          </h2>
          <p className="mb-2 text-base text-gold/90 sm:text-lg">{t("offlineEvent.launchTagline")}</p>
          <p className="mb-6 text-sm leading-relaxed text-[#f5f1e8]/70">
            {t("offlineEvent.date")}
            <span className="mx-2 text-gold/50" aria-hidden>
              ·
            </span>
            {t("offlineEvent.venue")}
          </p>
          <Link
            to="/event"
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-gold/95 px-6 py-3.5 text-sm font-body font-medium tracking-wide text-primary-foreground shadow-sm transition-colors hover:bg-gold no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1a1714] sm:w-auto"
          >
            <MapPin className="h-4 w-4 shrink-0" aria-hidden />
            {t("home.offlineEventCta")}
            <ChevronRight className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
          </Link>
        </div>

        <div className="flex justify-center md:justify-end">
          <img
            src={OXFORD_EVENT_MARK_SRC}
            alt="Oxford Union"
            className="h-40 w-auto object-contain mix-blend-screen sm:h-48 md:h-56"
            loading="eager"
            decoding="async"
          />
        </div>
      </div>
    </motion.section>
  );
}
