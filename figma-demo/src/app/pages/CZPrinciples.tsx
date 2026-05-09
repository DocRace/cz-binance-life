import { motion } from "motion/react";
import { Sparkles, Target, Zap, Shield, Heart, TrendingUp, Eye, HandHeart } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function CZPrinciples() {
  const { t } = useTranslation();
  const principles = [
    {
      icon: Target,
      title: t("principles.principle1Title"),
      subtitle: t("principles.principle1Subtitle"),
      description: t("principles.principle1Desc"),
      quote: t("principles.principle1Quote"),
      color: "from-gold to-gold-dark"
    },
    {
      icon: Zap,
      title: t("principles.principle2Title"),
      subtitle: t("principles.principle2Subtitle"),
      description: t("principles.principle2Desc"),
      quote: t("principles.principle2Quote"),
      color: "from-stone-400 to-stone-600"
    },
    {
      icon: Shield,
      title: t("principles.principle3Title"),
      subtitle: t("principles.principle3Subtitle"),
      description: t("principles.principle3Desc"),
      quote: t("principles.principle3Quote"),
      color: "from-stone-500 to-[#e5528d]"
    },
    {
      icon: Heart,
      title: t("principles.principle4Title"),
      subtitle: t("principles.principle4Subtitle"),
      description: t("principles.principle4Desc"),
      quote: t("principles.principle4Quote"),
      color: "from-stone-600 to-[#a855f7]"
    },
    {
      icon: TrendingUp,
      title: t("principles.principle5Title"),
      subtitle: t("principles.principle5Subtitle"),
      description: t("principles.principle5Desc"),
      quote: t("principles.principle5Quote"),
      color: "from-[#4ade80] to-[#22c55e]"
    },
    {
      icon: Eye,
      title: t("principles.principle6Title"),
      subtitle: t("principles.principle6Subtitle"),
      description: t("principles.principle6Desc"),
      quote: t("principles.principle6Quote"),
      color: "from-[#fbbf24] to-[#f59e0b]"
    },
    {
      icon: HandHeart,
      title: t("principles.principle7Title"),
      subtitle: t("principles.principle7Subtitle"),
      description: t("principles.principle7Desc"),
      quote: t("principles.principle7Quote"),
      color: "from-[#fb923c] to-[#f97316]"
    },
    {
      icon: Sparkles,
      title: t("principles.principle8Title"),
      subtitle: t("principles.principle8Subtitle"),
      description: t("principles.principle8Desc"),
      quote: t("principles.principle8Quote"),
      color: "from-[#ec4899] to-[#db2777]"
    }
  ];

  return (
    <div className="container mx-auto px-6 py-20">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-20"
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
        <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
          {t("principles.subtitle")}
        </p>
        <div className="inline-block px-6 py-3 rounded-full border border-gold/30 bg-gold/10">
          <p className="text-sm text-gold">
            ✨ {t("principles.badgeNote")}
          </p>
        </div>
      </motion.div>

      {/* Principles Grid */}
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
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
                {/* Background glow */}
                <div className={`absolute inset-0 bg-gradient-to-br ${principle.color} opacity-0 group-hover:opacity-10 blur-xl transition-opacity duration-500 rounded-3xl`} />

                {/* Card */}
                <div className="relative h-full p-8 rounded-2xl border border-border/50 bg-card/30 backdrop-blur-sm hover:border-gold/30 transition-all duration-500">
                  {/* Icon */}
                  <div className="mb-6">
                    <div className={`inline-flex w-16 h-16 rounded-2xl bg-gradient-to-br ${principle.color} items-center justify-center`}>
                      <Icon className="w-8 h-8 text-white" />
                    </div>
                  </div>

                  {/* Title */}
                  <div className="mb-4">
                    <h3 className="font-display text-2xl mb-1">{principle.title}</h3>
                    <p className="text-sm text-muted-foreground font-tech">{principle.subtitle}</p>
                  </div>

                  {/* Description */}
                  <p className="text-muted-foreground leading-relaxed mb-6">
                    {principle.description}
                  </p>

                  {/* Quote */}
                  <div className="relative pl-4 border-l-2 border-gold/30">
                    <p className="text-sm italic text-muted-foreground">
                      "{principle.quote}"
                    </p>
                  </div>

                  {/* Coming soon badge */}
                  <div className="mt-6 pt-6 border-t border-border/50">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">{t("principles.badgeLabel")}</span>
                      <span className="px-3 py-1 rounded-full bg-accent/50 text-xs text-muted-foreground">
                        {t("principles.comingSoon")}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Hover effect border */}
                <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${principle.color} opacity-0 group-hover:opacity-20 transition-opacity duration-500 pointer-events-none`} />
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Submit Form Section */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
        className="max-w-4xl mx-auto mt-20"
      >
        <div className="relative p-8 rounded-2xl overflow-hidden border border-gold/30">
          <div className="absolute inset-0 bg-gradient-to-r from-gold/5 via-stone-500/5 to-stone-400/5" />
          <div className="relative">
            <div className="text-center mb-6">
              <Sparkles className="w-12 h-12 mx-auto mb-4 text-gold" />
              <h2 className="font-display text-2xl mb-3">{t("principles.shareTitle")}</h2>
              <p className="text-muted-foreground">
                {t("principles.shareDesc")}
                <br />
                {t("principles.shareDesc2")}
              </p>
            </div>

            <form className="space-y-4 max-w-2xl mx-auto">
              <div>
                <label className="block text-sm mb-2">{t("principles.formTitleLabel")}</label>
                <input
                  type="text"
                  placeholder={t("principles.formTitlePlaceholder")}
                  className="w-full px-4 py-3 rounded-xl bg-input-background border border-border focus:border-gold/50 focus:outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm mb-2">{t("principles.formDescLabel")}</label>
                <textarea
                  rows={4}
                  placeholder={t("principles.formDescPlaceholder")}
                  className="w-full px-4 py-3 rounded-xl bg-input-background border border-border focus:border-gold/50 focus:outline-none transition-colors resize-none"
                />
              </div>

              <div>
                <label className="block text-sm mb-2">{t("principles.formEmailLabel")}</label>
                <input
                  type="email"
                  placeholder={t("principles.formEmailPlaceholder")}
                  className="w-full px-4 py-3 rounded-xl bg-input-background border border-border focus:border-gold/50 focus:outline-none transition-colors"
                />
              </div>

              <button
                type="submit"
                className="w-full py-4 rounded-xl bg-gradient-to-r from-gold to-gold-dark hover:from-gold-light hover:to-gold transition-all duration-300"
              >
                <span className="text-primary-foreground font-medium">{t("principles.submitButton")}</span>
              </button>
            </form>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
