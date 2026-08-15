import { useEffect, useState } from "react";
import { Link } from "react-router";
import { motion } from "motion/react";
import { BookOpen, ChevronRight, Trophy } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  fetchRankConfig,
  isRankCampaignLive,
} from "../../lib/chronicle/rankClient";

type ChronicleCampaignBannerProps = {
  className?: string;
};

/** Shared “My Binance Life” campaign strip used on Home and Join. */
export default function ChronicleCampaignBanner({ className = "" }: ChronicleCampaignBannerProps) {
  const { t } = useTranslation();
  const [rankLive, setRankLive] = useState(false);

  useEffect(() => {
    void fetchRankConfig().then((cfg) => setRankLive(isRankCampaignLive(cfg)));
  }, []);

  return (
    <motion.section
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55 }}
      className={`relative overflow-hidden rounded-2xl border border-gold/40 bg-gradient-to-br from-gold/20 via-gold/10 to-transparent p-5 sm:p-7 ${className}`}
    >
      <div className="pointer-events-none absolute -right-8 -top-10 h-40 w-40 rounded-full bg-gold/25 blur-3xl" aria-hidden />
      <p className="mb-2 text-[11px] font-tech uppercase tracking-[0.2em] text-gold">
        {t("home.chronicleBannerKicker")}
      </p>
      <h2 className="mb-3 font-display text-2xl tracking-tight text-foreground sm:text-3xl md:text-4xl">
        {t("home.chronicleBannerTitle")}
      </h2>
      <p className="mb-5 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
        {t("home.chronicleBannerDesc")}
      </p>
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <Link
          to="/club/chronicle"
          className="inline-flex items-center justify-center gap-2 rounded-full bg-gold/95 px-6 py-3.5 text-sm font-body font-medium tracking-wide text-primary-foreground shadow-sm transition-colors hover:bg-gold no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <BookOpen className="h-4 w-4 shrink-0" aria-hidden />
          {t("home.chronicleBannerCta")}
          <ChevronRight className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
        </Link>
        {rankLive ? (
          <Link
            to="/club/chronicle/rank"
            className="inline-flex items-center justify-center gap-2 rounded-full border border-gold/50 bg-background/40 px-6 py-3.5 text-sm font-body font-medium tracking-wide text-gold transition-colors hover:bg-gold/10 no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <Trophy className="h-4 w-4 shrink-0" aria-hidden />
            {t("home.chronicleRankCta")}
          </Link>
        ) : null}
      </div>
    </motion.section>
  );
}
