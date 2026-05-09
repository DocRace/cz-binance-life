import { useState } from "react";
import { motion } from "motion/react";
import { Users, MessageCircle, Calendar, BookOpen, Video, Trophy } from "lucide-react";
import { useTranslation } from "react-i18next";
import EventRegistrationModal from "../components/EventRegistrationModal";

export default function BookClub() {
  const { t } = useTranslation();
  const [showRegistrationModal, setShowRegistrationModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<string>("");

  const handleRegister = (eventTitle: string) => {
    setSelectedEvent(eventTitle);
    setShowRegistrationModal(true);
  };

  return (
    <>
    <div className="container mx-auto px-6 py-20">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-20"
      >
        <h1 className="font-display text-5xl md:text-6xl mb-6">
          <span className="bg-gradient-to-r from-gold to-gold-light bg-clip-text text-transparent">
            {t("club.title")}
          </span>
        </h1>
        <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
          {t("club.subtitle")}
        </p>
      </motion.div>

      {/* Hero Image/Illustration */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2 }}
        className="max-w-4xl mx-auto mb-20"
      >
        <div className="relative aspect-[16/9] rounded-3xl overflow-hidden border border-gold/30 bg-gradient-to-br from-card to-background">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <Users className="w-24 h-24 mx-auto mb-6 text-gold" />
              <h2 className="font-display text-3xl mb-2">{t("home.feature3Title")}</h2>
              <p className="text-muted-foreground"><span className="text-gold font-tech">2,856</span> {t("club.memberCount")}</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Club Benefits */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="mb-20"
      >
        <h2 className="font-display text-3xl text-center mb-12">{t("club.benefitsTitle")}</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {[
            {
              icon: MessageCircle,
              title: t("club.benefit1Title"),
              description: t("club.benefit1Desc"),
              color: "from-gold to-gold-dark"
            },
            {
              icon: Video,
              title: t("club.benefit2Title"),
              description: t("club.benefit2Desc"),
              color: "from-stone-400 to-stone-600"
            },
            {
              icon: Calendar,
              title: t("club.benefit3Title"),
              description: t("club.benefit3Desc"),
              color: "from-stone-500 to-[#e5528d]"
            },
            {
              icon: BookOpen,
              title: t("club.benefit4Title"),
              description: t("club.benefit4Desc"),
              color: "from-stone-600 to-[#a855f7]"
            },
            {
              icon: Trophy,
              title: t("club.benefit5Title"),
              description: t("club.benefit5Desc"),
              color: "from-[#4ade80] to-[#22c55e]"
            },
            {
              icon: Users,
              title: t("club.benefit6Title"),
              description: t("club.benefit6Desc"),
              color: "from-[#fbbf24] to-[#f59e0b]"
            }
          ].map((benefit, index) => {
            const Icon = benefit.icon;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 + index * 0.1 }}
                className="group relative"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${benefit.color} opacity-0 group-hover:opacity-10 rounded-2xl transition-opacity duration-500`} />
                <div className="relative p-6 rounded-2xl border border-border/50 bg-card/30 backdrop-blur-sm hover:border-gold/30 transition-all duration-500">
                  <div className="w-12 h-12 mb-4 rounded-xl bg-gradient-to-br bg-gold/20 flex items-center justify-center">
                    <Icon className="w-6 h-6 text-gold" />
                  </div>
                  <h3 className="font-display text-xl mb-2">{benefit.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{benefit.description}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {/* Upcoming Events */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="max-w-4xl mx-auto mb-20"
      >
        <h2 className="font-display text-3xl mb-8">{t("club.eventsTitle")}</h2>
        <div className="space-y-4">
          {[
            {
              date: "2026年5月5日",
              time: "19:00 - 21:00",
              title: "開幕典禮暨首次線上聚會",
              type: "線上",
              description: "書友會正式啟動，與作者 CZ 線上對話"
            },
            {
              date: "2026年5月12日",
              time: "14:00 - 17:00",
              title: "香港線下見面會",
              type: "線下",
              description: "商務印書館總部，限額50人"
            },
            {
              date: "2026年5月19日",
              time: "20:00 - 21:30",
              title: "第一章書友會：創業初心",
              type: "線上",
              description: "深度解讀第一章內容，分享創業心得"
            }
          ].map((event, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 1.2 + index * 0.1 }}
              className="group p-6 rounded-xl border border-border/50 bg-card/30 backdrop-blur-sm hover:border-gold/30 transition-all duration-300"
            >
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="px-3 py-1 rounded-full bg-gold/20 text-gold text-xs font-tech">
                      {event.type}
                    </span>
                    <span className="text-sm text-muted-foreground font-tech">
                      {event.date} {event.time}
                    </span>
                  </div>
                  <h3 className="font-display text-xl mb-2">{event.title}</h3>
                  <p className="text-sm text-muted-foreground">{event.description}</p>
                </div>
                <button
                  onClick={() => handleRegister(event.title)}
                  className="px-6 py-2 rounded-lg border border-gold/50 text-gold hover:bg-gold/10 transition-colors duration-300"
                >
                  {t("club.registerButton")}
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* How to Join */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.6 }}
        className="max-w-4xl mx-auto"
      >
        <div className="p-8 rounded-2xl border border-gold/30 bg-gradient-to-br from-gold/5 to-transparent">
          <h2 className="font-display text-3xl mb-6 text-center">{t("club.howToJoinTitle")}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {[
              {
                step: "01",
                title: t("club.step1Title"),
                description: t("club.step1Desc")
              },
              {
                step: "02",
                title: t("club.step2Title"),
                description: t("club.step2Desc")
              },
              {
                step: "03",
                title: t("club.step3Title"),
                description: t("club.step3Desc")
              }
            ].map((step, index) => (
              <div key={index} className="text-center">
                <div className="text-5xl font-tech text-gold mb-3 opacity-50">{step.step}</div>
                <h3 className="font-display text-xl mb-2">{step.title}</h3>
                <p className="text-sm text-muted-foreground">{step.description}</p>
              </div>
            ))}
          </div>

          <div className="border-t border-border/50 pt-6 text-center">
            <h3 className="font-display text-lg mb-2">{t("club.contactTitle")}</h3>
            <p className="text-sm text-muted-foreground">
              {t("club.contactTelegram")}: <a href="https://t.me/BinanceBookClub" className="text-gold hover:text-gold-light transition-colors">@BinanceBookClub</a>
            </p>
          </div>
        </div>
      </motion.div>
    </div>

    {/* Registration Modal */}
    {showRegistrationModal && (
      <EventRegistrationModal
        onClose={() => setShowRegistrationModal(false)}
        eventTitle={selectedEvent}
      />
    )}
    </>
  );
}
