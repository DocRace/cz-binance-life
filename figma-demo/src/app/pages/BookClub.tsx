import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Users, MessageCircle, Calendar, BookOpen, Video, Trophy, Sparkles, ShoppingBag } from "lucide-react";
import { useTranslation } from "react-i18next";
import EventRegistrationModal from "../components/EventRegistrationModal";
import PurchaseModal from "../components/PurchaseModal";
import AirdropClaimModal from "../components/AirdropClaimModal";
import MembershipTiers from "../components/MembershipTiers";
import ClubStoryCard from "../components/ClubStoryCard";
import ClubStoryDetailModal from "../components/ClubStoryDetailModal";
import {
  type BookClubStory,
  type BookClubStoriesDoc,
  resolveStoryExternalUrl,
  storyDisplayText,
} from "../../lib/bookClubStories";
import { BOOK_CLUB_TELEGRAM_HANDLE, BOOK_CLUB_TELEGRAM_URL } from "../../config/platform";

const CLUB_EVENT_KEYS = ["event1", "event2", "event3"] as const;

export default function BookClub() {
  const { t } = useTranslation();
  const [showRegistrationModal, setShowRegistrationModal] = useState(false);
  const [purchaseOpen, setPurchaseOpen] = useState(false);
  const [airdropOpen, setAirdropOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<string>("");
  const [communityStories, setCommunityStories] = useState<BookClubStory[] | null>(undefined);
  const [expandedStory, setExpandedStory] = useState<BookClubStory | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/data/book_club_stories.json", { cache: "no-store" });
        if (!res.ok) throw new Error(String(res.status));
        const doc = (await res.json()) as BookClubStoriesDoc;
        const rows = Array.isArray(doc.stories) ? doc.stories : [];
        const positive = rows.filter((s) => {
          const tier = s.curator?.tier;
          const sc = s.curator?.score ?? 0.55;
          if (tier === "exclude") return false;
          return sc >= 0.42;
        });
        if (!cancelled) setCommunityStories(positive);
      } catch {
        if (!cancelled) setCommunityStories([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleRegister = (eventTitle: string) => {
    setSelectedEvent(eventTitle);
    setShowRegistrationModal(true);
  };

  const expandedDisplayText = expandedStory ? storyDisplayText(expandedStory) : "";
  const expandedExternalUrl = expandedStory ? resolveStoryExternalUrl(expandedStory) : undefined;
  const expandedLinkLabel =
    expandedExternalUrl && /x\.com|twitter\.com/i.test(expandedExternalUrl)
      ? t("club.storiesOpenX")
      : t("club.storiesOpen");

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
        <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
          {t("club.subtitle")}
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
          <a
            href={BOOK_CLUB_TELEGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-gold/90 px-8 py-3.5 text-sm font-body font-medium tracking-wide text-primary-foreground shadow-sm transition-colors hover:bg-gold"
          >
            {t("club.joinClubCta")}
          </a>
          <button
            type="button"
            onClick={() => setPurchaseOpen(true)}
            className="inline-flex items-center justify-center gap-2 rounded-full border border-gold/60 px-8 py-3.5 text-sm font-body font-medium tracking-wide text-gold hover:bg-gold/10 transition-colors"
          >
            <ShoppingBag className="h-4 w-4" aria-hidden />
            {t("club.buyBadgeCta")}
          </button>
        </div>
      </motion.div>

      <MembershipTiers
        onPremiumClick={() => setPurchaseOpen(true)}
        onStandardClick={() => setAirdropOpen(true)}
        className="max-w-5xl mx-auto mb-20"
      />

      {/* Community stories (UGC / Binance-positive, curated) */}
      {communityStories !== undefined ? (
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}
          className="max-w-5xl mx-auto mb-20 px-2"
          aria-labelledby="club-stories-heading"
        >
          <div className="mb-6 flex flex-col items-center text-center">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/5 px-4 py-1.5 text-xs font-medium uppercase tracking-[0.16em] text-gold/90">
              <Sparkles className="size-3.5" aria-hidden />
              {t("club.storiesKicker")}
            </div>
            <h2 id="club-stories-heading" className="font-display text-3xl md:text-4xl mb-3">
              <span className="bg-gradient-to-r from-gold to-amber-200 bg-clip-text text-transparent">
                {t("club.storiesTitle")}
              </span>
            </h2>
            <p className="text-sm text-muted-foreground max-w-2xl leading-relaxed">
              {t("club.storiesSubtitle")}
            </p>
          </div>
          {communityStories.length === 0 ? (
            <p className="rounded-2xl border border-white/10 bg-card/20 px-4 py-8 text-center text-sm text-muted-foreground">
              {t("club.storiesEmpty")}
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 [&>*]:min-w-0">
              {communityStories.map((story, idx) => {
                const externalUrl = resolveStoryExternalUrl(story);
                const displayText = storyDisplayText(story);
                const linkLabel =
                  externalUrl && /x\.com|twitter\.com/i.test(externalUrl)
                    ? t("club.storiesOpenX")
                    : t("club.storiesOpen");
                return (
                  <ClubStoryCard
                    key={story.id}
                    story={story}
                    displayText={displayText}
                    externalUrl={externalUrl}
                    linkLabel={linkLabel}
                    index={idx}
                    onExpand={() => setExpandedStory(story)}
                  />
                );
              })}
            </div>
          )}
          <p className="mt-8 text-center text-[11px] leading-relaxed text-muted-foreground/75 max-w-3xl mx-auto">
            {t("club.storiesDisclaimer")}
          </p>
        </motion.section>
      ) : null}

      {/* Club Benefits */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="max-w-5xl mx-auto mb-20 px-2"
      >
        <h2 className="font-display text-3xl text-center mb-12">{t("club.benefitsTitle")}</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
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
                className="group relative flex h-full flex-col"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${benefit.color} opacity-0 group-hover:opacity-10 rounded-2xl transition-opacity duration-500`} />
                <div className="relative flex h-full min-h-[220px] flex-col p-6 rounded-2xl border border-border/50 bg-card/30 backdrop-blur-sm hover:border-gold/30 transition-all duration-500">
                  <div className="w-12 h-12 mb-4 shrink-0 rounded-xl bg-gradient-to-br bg-gold/20 flex items-center justify-center">
                    <Icon className="w-6 h-6 text-gold" />
                  </div>
                  <h3 className="font-display text-xl mb-2 min-h-[3.5rem] line-clamp-2">{benefit.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed flex-1">{benefit.description}</p>
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
        className="max-w-5xl mx-auto mb-20 px-2"
      >
        <h2 className="font-display text-3xl mb-8">{t("club.eventsTitle")}</h2>
        <div className="space-y-4">
          {CLUB_EVENT_KEYS.map((key, index) => {
            const event = {
              date: t(`club.${key}Date`),
              time: t(`club.${key}Time`),
              title: t(`club.${key}Title`),
              type: t(`club.${key}Type`),
              description: t(`club.${key}Desc`),
            };
            return (
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
            );
          })}
        </div>
        <p className="mt-6 text-center text-[11px] leading-relaxed text-muted-foreground/75">
          {t("club.eventsDisclaimer")}
        </p>
      </motion.div>

      {/* How to Join */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.6 }}
        className="max-w-5xl mx-auto px-2"
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
              {t("club.contactTelegram")}:{" "}
              <a href={BOOK_CLUB_TELEGRAM_URL} className="text-gold hover:text-gold-light transition-colors">
                @{BOOK_CLUB_TELEGRAM_HANDLE}
              </a>
            </p>
          </div>
        </div>
      </motion.div>
    </div>

    {expandedStory ? (
      <ClubStoryDetailModal
        story={expandedStory}
        displayText={expandedDisplayText}
        externalUrl={expandedExternalUrl}
        linkLabel={expandedLinkLabel}
        onClose={() => setExpandedStory(null)}
      />
    ) : null}

    {/* Registration Modal */}
    {showRegistrationModal && (
      <EventRegistrationModal
        onClose={() => setShowRegistrationModal(false)}
        eventTitle={selectedEvent}
      />
    )}
    {purchaseOpen ? <PurchaseModal onClose={() => setPurchaseOpen(false)} /> : null}
    {airdropOpen ? <AirdropClaimModal onClose={() => setAirdropOpen(false)} /> : null}
    </>
  );
}
