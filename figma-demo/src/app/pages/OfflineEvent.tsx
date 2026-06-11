import { useMemo } from "react";
import { Link } from "react-router";
import { motion } from "motion/react";
import {
  Award,
  Building2,
  Calendar,
  ChevronLeft,
  Clapperboard,
  Clock,
  Handshake,
  Home,
  Languages,
  MapPin,
  Mic,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  OFFLINE_EVENT_POSTER_SRC,
  OFFLINE_EVENT_REGISTER_QR_SRC,
} from "../../config/platform";
import {
  CARD_SURFACE,
  CONTENT_DEFAULT,
  CONTENT_NARROW,
  GRID_GAP,
  PAGE_HEADER,
  PAGE_SHELL,
  SECTION_SPACING,
} from "../layout/pageLayout";

type AgendaRow = { time: string; segment: string; content: string };

/** Icons aligned with `offlineEvent.highlights` order across locales */
const HIGHLIGHT_ICONS: LucideIcon[] = [Users, Award, Building2, Mic, Clapperboard, Handshake];

export default function OfflineEvent() {
  const { t } = useTranslation();

  const details = [
    { icon: Calendar, label: t("offlineEvent.dateLabel"), value: t("offlineEvent.date") },
    { icon: Clock, label: t("offlineEvent.timeLabel"), value: t("offlineEvent.time") },
    { icon: MapPin, label: t("offlineEvent.venueLabel"), value: t("offlineEvent.venue") },
    { icon: Languages, label: t("offlineEvent.languageLabel"), value: t("offlineEvent.language") },
  ];

  const flowParagraphs = useMemo(() => {
    const raw = t("offlineEvent.flowParagraphs", { returnObjects: true });
    return Array.isArray(raw) ? (raw as string[]) : [];
  }, [t]);

  const agendaRows = useMemo(() => {
    const raw = t("offlineEvent.agendaRows", { returnObjects: true });
    return Array.isArray(raw) ? (raw as AgendaRow[]) : [];
  }, [t]);

  const highlights = useMemo(() => {
    const raw = t("offlineEvent.highlights", { returnObjects: true });
    return Array.isArray(raw) ? (raw as string[]) : [];
  }, [t]);

  return (
    <div className={PAGE_SHELL}>
      <div className={`${CONTENT_DEFAULT} mb-8`}>
        <Link
          to="/"
          className="inline-flex items-center justify-center gap-2 rounded-full bg-gold/90 px-6 py-3 text-sm font-body font-medium tracking-wide text-primary-foreground shadow-sm transition-colors hover:bg-gold no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <ChevronLeft className="h-4 w-4 shrink-0" aria-hidden />
          {t("offlineEvent.backHome")}
        </Link>
      </div>

      <motion.header
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className={`${PAGE_HEADER} ${CONTENT_NARROW}`}
      >
        <h1 className="font-display text-4xl md:text-5xl leading-tight">
          <span className="bg-gradient-to-r from-gold to-gold-light bg-clip-text text-transparent">
            {t("offlineEvent.launchHeadline")}
          </span>
        </h1>
        <p className="mt-4 text-lg text-gold/90 leading-relaxed">{t("offlineEvent.launchTagline")}</p>
        <p className="mt-3 text-sm text-muted-foreground">{t("offlineEvent.subtitle")}</p>
      </motion.header>

      <div className={`${CONTENT_DEFAULT} grid grid-cols-1 items-start lg:grid-cols-2 ${GRID_GAP}`}>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-6"
        >
          <div className={`p-6 md:p-8 ${CARD_SURFACE}`}>
            <dl className="space-y-5">
              {details.map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex gap-3">
                  <Icon className="mt-0.5 h-8 w-8 shrink-0 text-gold" aria-hidden />
                  <div className="min-w-0">
                    <dt className="text-xs font-medium uppercase tracking-[0.14em] text-gold/85">{label}</dt>
                    <dd className="mt-1 text-sm leading-relaxed text-foreground whitespace-pre-line">{value}</dd>
                  </div>
                </div>
              ))}
            </dl>
            <p className="mt-6 text-sm leading-relaxed text-muted-foreground whitespace-pre-line">
              {t("offlineEvent.address")}
            </p>
          </div>

          <div className={`space-y-4 p-6 md:p-8 ${CARD_SURFACE}`}>
            {flowParagraphs.map((paragraph) => (
              <p key={paragraph.slice(0, 24)} className="text-sm leading-relaxed text-muted-foreground">
                {paragraph}
              </p>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18 }}
          className="flex flex-col items-center lg:sticky lg:top-24"
        >
          <div className={`w-full max-w-sm overflow-hidden ${CARD_SURFACE}`}>
            <img
              src={OFFLINE_EVENT_POSTER_SRC}
              alt=""
              className="w-full object-cover object-top"
              loading="eager"
              decoding="async"
            />
          </div>

          <div className={`mt-8 w-full max-w-sm p-6 text-center ${CARD_SURFACE}`}>
            <p className="mb-4 font-display text-xl text-gold">{t("offlineEvent.scanTitle")}</p>
            <div className="mx-auto inline-block rounded-2xl border border-border/50 bg-white p-3 shadow-sm">
              <img
                src={OFFLINE_EVENT_REGISTER_QR_SRC}
                alt={t("offlineEvent.qrAlt")}
                width={220}
                height={220}
                className="h-[13.75rem] w-[13.75rem] object-contain"
                loading="eager"
                decoding="async"
              />
            </div>
            <p className="mt-4 text-xs leading-relaxed text-muted-foreground">{t("offlineEvent.scanHint")}</p>
          </div>

          <Link
            to="/"
            className="mt-8 inline-flex w-full max-w-sm items-center justify-center gap-2 rounded-full border border-gold/60 px-6 py-3.5 text-sm font-body font-medium tracking-wide text-gold transition-colors hover:bg-gold/10 no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <Home className="h-4 w-4 shrink-0" aria-hidden />
            {t("offlineEvent.backHome")}
          </Link>
        </motion.div>
      </div>

      <motion.section
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-40px" }}
        className={`${CONTENT_DEFAULT} ${SECTION_SPACING} mt-12 md:mt-16`}
        aria-labelledby="offline-event-agenda"
      >
        <h2 id="offline-event-agenda" className="mb-6 font-display text-2xl md:text-3xl text-foreground">
          {t("offlineEvent.agendaTitle")}
        </h2>
        <div className={`mb-6 space-y-2 p-6 md:p-8 ${CARD_SURFACE}`}>
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{t("offlineEvent.agendaTopicLabel")}</span>
            {t("offlineEvent.agendaTopic")}
          </p>
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{t("offlineEvent.agendaTimeLabel")}</span>
            {t("offlineEvent.agendaTime")}
          </p>
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{t("offlineEvent.agendaVenueLabel")}</span>
            {t("offlineEvent.agendaVenue")}
          </p>
        </div>

        <div className={`overflow-x-auto ${CARD_SURFACE}`}>
          <table className="w-full min-w-[36rem] text-left text-sm">
            <thead>
              <tr className="border-b border-border/50 bg-card/50">
                <th className="px-4 py-3 font-medium text-gold/90 whitespace-nowrap">
                  {t("offlineEvent.agendaColTime")}
                </th>
                <th className="px-4 py-3 font-medium text-gold/90">{t("offlineEvent.agendaColSegment")}</th>
                <th className="px-4 py-3 font-medium text-gold/90">{t("offlineEvent.agendaColContent")}</th>
              </tr>
            </thead>
            <tbody>
              {agendaRows.map((row) => (
                <tr key={row.time} className="border-b border-border/40 last:border-0">
                  <td className="px-4 py-3 align-top font-tech text-xs text-gold/85 whitespace-nowrap">{row.time}</td>
                  <td className="px-4 py-3 align-top font-medium text-foreground">{row.segment}</td>
                  <td className="px-4 py-3 align-top text-muted-foreground leading-relaxed">{row.content}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-40px" }}
        className={`${CONTENT_DEFAULT} ${SECTION_SPACING}`}
        aria-labelledby="offline-event-highlights"
      >
        <h2 id="offline-event-highlights" className="mb-6 font-display text-2xl md:text-3xl text-foreground">
          {t("offlineEvent.highlightsTitle")}
        </h2>
        <ul className={`grid grid-cols-1 gap-3 sm:grid-cols-2 ${GRID_GAP}`}>
          {highlights.map((item, index) => {
            const HighlightIcon = HIGHLIGHT_ICONS[index] ?? Users;
            return (
              <li
                key={item}
                className={`flex items-start gap-3 p-4 md:p-5 ${CARD_SURFACE}`}
              >
                <HighlightIcon className="mt-0.5 h-8 w-8 shrink-0 text-gold" aria-hidden />
                <span className="text-sm leading-relaxed text-foreground">{item}</span>
              </li>
            );
          })}
        </ul>
      </motion.section>
    </div>
  );
}
