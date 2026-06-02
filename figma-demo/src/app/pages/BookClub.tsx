import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Users, MessageCircle, Calendar, BookOpen, Video, Trophy, Sparkles, ExternalLink, ShoppingBag } from "lucide-react";
import { useTranslation } from "react-i18next";
import EventRegistrationModal from "../components/EventRegistrationModal";
import PurchaseModal from "../components/PurchaseModal";

type BookClubStory = {
  id: string;
  kind?: string;
  author_display: string;
  author_avatar_url?: string;
  headline: string;
  body: string;
  url?: string;
  created_at?: string;
  curator?: { tier: string; score: number; method: string };
};

function ClubStoryAvatar({ story }: { story: BookClubStory }) {
  const handleGuess = story.author_display
    .replace(/^@/, "")
    .trim()
    .split(/[\s·|,]/)[0]
    .trim();
  const candidates = [
    story.author_avatar_url?.trim(),
    handleGuess && /^[A-Za-z0-9_]{1,30}$/.test(handleGuess)
      ? `https://unavatar.io/x/${encodeURIComponent(handleGuess)}`
      : "",
  ].filter(Boolean) as string[];

  const [idx, setIdx] = useState(0);

  useEffect(() => {
    setIdx(0);
  }, [story.id, story.author_avatar_url, story.author_display]);

  if (idx >= candidates.length) {
    return (
      <div
        className="flex size-11 shrink-0 items-center justify-center rounded-full border border-gold/20 bg-gold/10"
        aria-hidden
      >
        <Users className="size-5 text-gold/70" />
      </div>
    );
  }

  return (
    <img
      src={candidates[idx]}
      alt=""
      width={44}
      height={44}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      className="size-11 shrink-0 rounded-full border border-gold/25 object-cover bg-card/40"
      onError={() => setIdx((k) => k + 1)}
    />
  );
}

type BookClubStoriesDoc = {
  format_version?: number;
  stories?: BookClubStory[];
};

/** True for rows sourced from X (including legacy JSON with id tw-<tweetId> only). */
function isTwitterStoryRow(story: BookClubStory): boolean {
  if (story.kind === "twitter") return true;
  if (story.kind === "community") return false;
  return /^tw-\d+$/.test(story.id);
}

/** External story link — sheet hyperlinks (X/Telegram/etc.), legacy tweet ids, or profile fallback. */
/** X/oEmbed text is one block; prefer longer field when legacy JSON still has both. */
function storyDisplayText(story: BookClubStory): string {
  const body = `${story.body ?? ""}`.trim();
  const headline = `${story.headline ?? ""}`.trim();
  if (!body) return headline;
  if (!headline) return body;
  return body.length >= headline.length ? body : headline;
}

function resolveStoryExternalUrl(story: BookClubStory): string | undefined {
  const raw = story.url?.trim();
  if (raw && /^https?:\/\//i.test(raw)) {
    if (/x\.com|twitter\.com/i.test(raw)) {
      return raw
        .replace(/twitter\.com/gi, "x.com")
        .replace(/mobile\.x\.com/gi, "x.com");
    }
    return raw;
  }
  if (isTwitterStoryRow(story) && /^tw-\d+$/.test(story.id)) {
    return `https://x.com/i/web/status/${story.id.slice(3)}`;
  }
  const handle = story.author_display.match(/@([A-Za-z0-9_]{1,30})/)?.[1];
  if (handle) return `https://x.com/${handle}`;
  return undefined;
}

export default function BookClub() {
  const { t } = useTranslation();
  const [showRegistrationModal, setShowRegistrationModal] = useState(false);
  const [purchaseOpen, setPurchaseOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<string>("");
  const [communityStories, setCommunityStories] = useState<BookClubStory[] | null>(undefined);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/data/book_club_stories.json", { cache: "no-store" });
        if (!res.ok) throw new Error(String(res.status));
        const doc = (await res.json()) as BookClubStoriesDoc;
        const rows = Array.isArray(doc.stories) ? doc.stories : [];
        const positive = rows.filter((s) => {
          const t = s.curator?.tier;
          const sc = s.curator?.score ?? 0.55;
          if (t === "exclude") return false;
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
            href="https://t.me/BinanceBookClub"
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
                <motion.article
                  key={story.id}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.08 + idx * 0.05 }}
                  className="flex min-w-0 flex-col rounded-2xl border border-border/60 bg-card/35 p-5 backdrop-blur-sm hover:border-gold/25 transition-colors"
                >
                  <div className="mb-3 flex min-w-0 items-center gap-3">
                    <ClubStoryAvatar story={story} />
                    <p className="min-w-0 flex-1 font-mono text-[11px] leading-snug text-gold/85 wrap-anywhere">
                      {story.author_display}
                    </p>
                  </div>
                  {displayText ? (
                    <p className="font-display text-base font-medium leading-relaxed text-white/95 flex-1 whitespace-pre-wrap wrap-anywhere">
                      {displayText}
                    </p>
                  ) : null}
                  {externalUrl ? (
                    <a
                      href={externalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-sky-400 hover:text-sky-300"
                    >
                      {linkLabel}
                      <ExternalLink className="size-3" aria-hidden />
                    </a>
                  ) : null}
                </motion.article>
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
    {purchaseOpen ? <PurchaseModal onClose={() => setPurchaseOpen(false)} /> : null}
    </>
  );
}
