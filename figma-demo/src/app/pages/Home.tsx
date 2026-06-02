import { useState } from "react";
import { Link } from "react-router";
import { motion } from "motion/react";
import { Users, ShoppingBag } from "lucide-react";
import { useTranslation } from "react-i18next";
import PurchaseModal from "../components/PurchaseModal";
import Book3DCover from "../components/Book3DCover";
import bookCover from "../../assets/book-cover-hero.png";

export default function Home() {
  const { t } = useTranslation();
  const [purchaseOpen, setPurchaseOpen] = useState(false);

  return (
    <>
      <div className="container mx-auto max-w-[1200px] px-6 sm:px-10 py-24 md:py-32">
        {/* Hero */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-14 lg:gap-20 xl:gap-28 items-center mb-28 md:mb-36">
          {/* Book */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            className="flex justify-center lg:justify-end order-2 lg:order-1 lg:pr-6"
          >
            <Link
              to="/book"
              className="inline-flex max-w-full rounded-lg text-inherit no-underline outline-none transition-opacity hover:opacity-[0.97] focus-visible:ring-2 focus-visible:ring-gold/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              aria-label={`${t("nav.book")} — ${t("home.title")}`}
            >
              <Book3DCover
                src={bookCover}
                alt="《幣安人生》書籍封面 - Freedom of Money"
                showSyntheticDepth={false}
                navigable
              />
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 32 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.9, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="text-center lg:text-left order-1 lg:order-2 min-w-0 max-w-xl mx-auto lg:mx-0"
          >
            <motion.span
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              className="inline-flex items-center rounded-full border border-gold/80 px-4 py-1.5 text-[11px] font-body font-medium uppercase tracking-[0.2em] text-gold-light/95 mb-8"
            >
              {t("home.coverBadge")}
            </motion.span>

            <motion.h1
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45, duration: 0.8 }}
              className="font-display font-medium text-5xl md:text-6xl lg:text-7xl xl:text-[4.25rem] text-foreground leading-[1.05] tracking-tight mb-6"
            >
              {t("home.title")}
            </motion.h1>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.55 }}
              className="text-lg md:text-xl text-muted-foreground font-body font-normal leading-relaxed mb-5"
            >
              {t("home.subtitle")}
            </motion.p>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.65 }}
              className="h-px w-16 bg-gold/50 mx-auto lg:mx-0 mb-7"
              aria-hidden
            />

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
              className="text-[15px] md:text-base text-muted-foreground/95 font-body leading-[1.75] mb-12"
            >
              {t("home.description")}
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.85 }}
              className="flex flex-col sm:flex-row flex-nowrap items-stretch sm:items-center justify-center lg:justify-start gap-3 sm:gap-4"
            >
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="button"
                onClick={() => setPurchaseOpen(true)}
                className="shrink-0 rounded-full border border-gold px-5 py-3.5 text-sm font-body font-medium tabular-nums tracking-wide text-foreground transition-colors duration-300 hover:bg-gold/10 flex items-center justify-center gap-2 whitespace-nowrap sm:px-7"
              >
                <ShoppingBag className="h-4 w-4 shrink-0 opacity-90" />
                {t("home.reserveButton")}
              </motion.button>

              <Link
                to="/club"
                className="inline-flex shrink-0 rounded-full bg-gold/90 px-5 py-3.5 text-sm font-body font-medium tabular-nums tracking-wide text-primary-foreground transition-colors duration-300 hover:bg-gold items-center justify-center gap-2 whitespace-nowrap shadow-sm no-underline sm:px-7 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                <Users className="h-4 w-4 shrink-0" />
                {t("home.joinClubButton")}
              </Link>
            </motion.div>
          </motion.div>
        </div>

        {/* Features Grid */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="mx-auto grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 md:items-stretch md:gap-8"
        >
          {[
            {
              title: t("home.feature1Title"),
              description: t("home.feature1Desc"),
              icon: "🎫",
              delay: 0,
            },
            {
              title: t("home.feature2Title"),
              description: t("home.feature2Desc"),
              icon: "🎟️",
              delay: 0.08,
            },
            {
              title: t("home.feature3Title"),
              description: t("home.feature3Desc"),
              icon: "🏅",
              delay: 0.16,
            },
          ].map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.4 + feature.delay }}
              className="group relative flex h-full min-h-0 flex-col"
            >
              <div className="absolute inset-0 rounded-sm bg-gradient-to-br from-gold/[0.04] to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
              <div className="relative flex h-full min-h-0 flex-col rounded-sm border border-border/50 bg-card/20 px-8 py-9 transition-colors duration-500 hover:border-gold/25">
                <div className="mb-5 shrink-0 text-4xl opacity-90">{feature.icon}</div>
                <h3 className="mb-2 font-display text-xl">{feature.title}</h3>
                <p className="min-h-0 flex-1 leading-relaxed text-muted-foreground">{feature.description}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Book Preview Section */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.8 }}
          className="mt-36 md:mt-44 text-center"
        >
          <h2 className="font-display text-3xl md:text-4xl font-medium mb-6 tracking-tight text-foreground">
            {t("home.journeyTitle")}
          </h2>
          <p className="text-muted-foreground max-w-3xl mx-auto leading-relaxed mb-12">
            {t("home.journeyDesc")}
          </p>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-w-4xl mx-auto">
            {[
              { label: t("home.stat1Label"), value: "3,247", unit: t("home.stat1Unit") },
              { label: t("home.stat2Label"), value: "1,923", unit: t("home.stat2Unit") },
              { label: t("home.stat4Label"), value: "5,170", unit: t("home.stat4Unit") }
            ].map((stat, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 2 + index * 0.1 }}
                className="p-6 rounded-sm border border-border/45 bg-card/15"
              >
                <div className="text-3xl font-tech text-gold mb-1">{stat.value}</div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      {purchaseOpen ? <PurchaseModal onClose={() => setPurchaseOpen(false)} /> : null}

    </>
  );
}
