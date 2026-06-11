import { motion } from "motion/react";
import { Sparkles, Target, Zap, Shield, Heart, TrendingUp, Eye, HandHeart } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  CONTENT_NARROW,
  CONTENT_WIDE,
  GRID_GAP,
  PAGE_HEADER,
  PAGE_SHELL,
} from "../layout/pageLayout";

/** Same palette as the former「用戶至上」card — darker surface for all principles. */
const PRINCIPLE_CARD =
  "border-zinc-800/70 bg-zinc-950/55 hover:border-zinc-600/55";
const PRINCIPLE_HOVER_SHEEN =
  "from-zinc-950/90 via-black/45 to-transparent";

export default function CZPrinciples() {
  const { t } = useTranslation();
  const principles = [
    {
      icon: Target,
      title: t("principles.principle1Title"),
      subtitle: t("principles.principle1Subtitle"),
      description: t("principles.principle1Desc"),
      quote: t("principles.principle1Quote"),
    },
    {
      icon: Zap,
      title: t("principles.principle2Title"),
      subtitle: t("principles.principle2Subtitle"),
      description: t("principles.principle2Desc"),
      quote: t("principles.principle2Quote"),
    },
    {
      icon: Shield,
      title: t("principles.principle3Title"),
      subtitle: t("principles.principle3Subtitle"),
      description: t("principles.principle3Desc"),
      quote: t("principles.principle3Quote"),
    },
    {
      icon: Heart,
      title: t("principles.principle4Title"),
      subtitle: t("principles.principle4Subtitle"),
      description: t("principles.principle4Desc"),
      quote: t("principles.principle4Quote"),
    },
    {
      icon: TrendingUp,
      title: t("principles.principle5Title"),
      subtitle: t("principles.principle5Subtitle"),
      description: t("principles.principle5Desc"),
      quote: t("principles.principle5Quote"),
    },
    {
      icon: Eye,
      title: t("principles.principle6Title"),
      subtitle: t("principles.principle6Subtitle"),
      description: t("principles.principle6Desc"),
      quote: t("principles.principle6Quote"),
    },
    {
      icon: HandHeart,
      title: t("principles.principle7Title"),
      subtitle: t("principles.principle7Subtitle"),
      description: t("principles.principle7Desc"),
      quote: t("principles.principle7Quote"),
    },
    {
      icon: Sparkles,
      title: t("principles.principle8Title"),
      subtitle: t("principles.principle8Subtitle"),
      description: t("principles.principle8Desc"),
      quote: t("principles.principle8Quote"),
    },
  ];

  return (
    <div className={PAGE_SHELL}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={PAGE_HEADER}
      >
        <div className="inline-block mb-6">
          <div className="relative">
            <div className="absolute inset-0 bg-gold blur-2xl opacity-30" />
            <h1 className="relative font-display text-5xl md:text-6xl">
              <span className="bg-gradient-to-r from-gold to-gold-light bg-clip-text text-transparent">
                {t("principles.title")}
              </span>
            </h1>
          </div>
        </div>
        <p className={`${CONTENT_NARROW} text-xl text-muted-foreground`}>
          {t("principles.subtitle")}
        </p>
      </motion.div>

      <div className={CONTENT_WIDE}>
        <div className={`grid grid-cols-1 md:grid-cols-2 ${GRID_GAP}`}>
          {principles.map((principle, index) => {
            const Icon = principle.icon;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * index, duration: 0.6 }}
                className="group relative"
              >
                <div
                  className={`pointer-events-none absolute inset-0 rounded-3xl bg-gradient-to-br ${PRINCIPLE_HOVER_SHEEN} opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-[0.14]`}
                />

                <div
                  className={`relative h-full rounded-2xl border p-8 backdrop-blur-sm transition-all duration-500 ${PRINCIPLE_CARD}`}
                >
                  <Icon className="mb-5 h-8 w-8 shrink-0 text-gold/70" aria-hidden />

                  <div className="mb-4">
                    <h3 className="font-display text-2xl mb-1">{principle.title}</h3>
                    <p className="text-sm text-muted-foreground font-tech">{principle.subtitle}</p>
                  </div>

                  <p className="text-muted-foreground leading-relaxed mb-6">
                    {principle.description}
                  </p>

                  <div className="relative pl-4 border-l-2 border-gold/30">
                    <p className="text-sm italic text-muted-foreground">
                      "{principle.quote}"
                    </p>
                  </div>
                </div>

                <div
                  className={`pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br ${PRINCIPLE_HOVER_SHEEN} opacity-0 transition-opacity duration-500 group-hover:opacity-[0.06]`}
                />
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
