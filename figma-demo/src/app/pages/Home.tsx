import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Users, Calendar, ShoppingCart } from "lucide-react";
import { useTranslation } from "react-i18next";
import ReservationModal from "../components/ReservationModal";
import PurchaseModal from "../components/PurchaseModal";
import Book3DCover from "../components/Book3DCover";
import bookCover from "../../imports/Gemini_Generated_Image_77551s77551s7755.png";

export default function Home() {
  const { t } = useTranslation();
  const [showReservationModal, setShowReservationModal] = useState(false);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  // Book club launch date: May 1, 2026
  const launchDate = new Date("2026-05-01T00:00:00").getTime();

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date().getTime();
      const distance = launchDate - now;

      if (distance > 0) {
        setTimeRemaining({
          days: Math.floor(distance / (1000 * 60 * 60 * 24)),
          hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((distance % (1000 * 60)) / 1000)
        });
      } else {
        setTimeRemaining({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [launchDate]);

  const isLaunched = timeRemaining.days === 0 && timeRemaining.hours === 0 &&
                     timeRemaining.minutes === 0 && timeRemaining.seconds === 0;

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
            <Book3DCover
              src={bookCover}
              alt="《幣安人生》書籍封面 - Freedom of Money"
            />
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
                onClick={() => setShowReservationModal(true)}
                className="shrink-0 rounded-full border border-gold px-5 py-3.5 text-sm font-body font-medium tabular-nums tracking-wide text-foreground transition-colors duration-300 hover:bg-gold/10 flex items-center justify-center gap-2 whitespace-nowrap sm:px-7"
              >
                <Calendar className="h-4 w-4 shrink-0 opacity-90" />
                {t("home.reserveButton")}
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="button"
                onClick={() => setShowPurchaseModal(true)}
                className="shrink-0 rounded-full bg-gold/90 px-5 py-3.5 text-sm font-body font-medium tabular-nums tracking-wide text-primary-foreground transition-colors duration-300 hover:bg-gold flex items-center justify-center gap-2 whitespace-nowrap shadow-sm sm:px-7"
              >
                <ShoppingCart className="h-4 w-4 shrink-0" />
                {t("home.purchaseButton")}
              </motion.button>

              <motion.button
                whileHover={isLaunched ? { scale: 1.02 } : {}}
                whileTap={isLaunched ? { scale: 0.98 } : {}}
                type="button"
                className={`
                  shrink-0 rounded-full px-5 py-3.5 text-sm font-body font-medium tabular-nums leading-snug tracking-wide transition-colors duration-300 border whitespace-nowrap sm:px-7
                  ${isLaunched ? "cursor-pointer border-gold/60 text-gold hover:bg-gold/10" : "cursor-default border-border text-muted-foreground"}
                `}
                disabled={!isLaunched}
                onClick={() => {
                  if (isLaunched) {
                    window.location.href = "/club";
                  }
                }}
              >
                {isLaunched ? (
                  <span className="flex items-center justify-center gap-2 whitespace-nowrap">
                    <Users className="h-4 w-4 shrink-0" />
                    {t("home.clubButton")}
                  </span>
                ) : (
                  <span className="flex flex-col items-center gap-1">
                    <span className="flex items-center gap-2 text-xs uppercase tracking-[0.15em] text-muted-foreground/90">
                      <Calendar className="w-3.5 h-3.5" />
                      {t("home.countdownLabel")}
                    </span>
                    <span className="font-tech text-base tabular-nums">
                      {timeRemaining.days}
                      {t("home.stat1Unit") || "天"}{" "}
                      {String(timeRemaining.hours).padStart(2, "0")}:
                      {String(timeRemaining.minutes).padStart(2, "0")}:
                      {String(timeRemaining.seconds).padStart(2, "0")}
                    </span>
                  </span>
                )}
              </motion.button>
            </motion.div>
          </motion.div>
        </div>

        {/* Features Grid */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 max-w-5xl mx-auto"
        >
          {[
            {
              title: t("home.feature1Title"),
              description: t("home.feature1Desc"),
              icon: "🎫",
              delay: 0
            },
            {
              title: t("home.feature2Title"),
              description: t("home.feature2Desc"),
              icon: "🏅",
              delay: 0.1
            },
            {
              title: t("home.feature3Title"),
              description: t("home.feature3Desc"),
              icon: "👥",
              delay: 0.2
            }
          ].map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.4 + feature.delay }}
              className="group relative"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-gold/[0.04] to-transparent rounded-sm opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative px-8 py-9 rounded-sm border border-border/50 bg-card/20 hover:border-gold/25 transition-colors duration-500">
                <div className="text-4xl mb-5 opacity-90">{feature.icon}</div>
                <h3 className="font-display text-xl mb-2">{feature.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
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

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
            {[
              { label: t("home.stat1Label"), value: "3,247", unit: t("home.stat1Unit") },
              { label: t("home.stat2Label"), value: "1,923", unit: t("home.stat2Unit") },
              { label: t("home.stat3Label"), value: "2,856", unit: t("home.stat3Unit") },
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

      {/* Reservation Modal */}
      {showReservationModal && (
        <ReservationModal onClose={() => setShowReservationModal(false)} />
      )}

      {/* Purchase Modal */}
      {showPurchaseModal && (
        <PurchaseModal onClose={() => setShowPurchaseModal(false)} />
      )}
    </>
  );
}
