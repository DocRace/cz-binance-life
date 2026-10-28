import { useEffect, useMemo } from "react";
import { Link, useLocation } from "react-router";
import { motion } from "motion/react";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  Languages,
  MapPin,
  Shirt,
  Users,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  BOOK_CLUB_TELEGRAM_HANDLE,
  BOOK_CLUB_TELEGRAM_QR_SRC,
  BOOK_CLUB_TELEGRAM_URL,
  OXFORD_EVENT_MARK_SRC,
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
type Debater = { name: string; role: string; photo: string };

function asArray<T>(raw: unknown): T[] {
  return Array.isArray(raw) ? (raw as T[]) : [];
}

export default function OfflineEvent() {
  const { t } = useTranslation();
  const location = useLocation();

  useEffect(() => {
    if (location.hash !== "#past") return;
    document.getElementById("past")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [location.hash]);

  const details = [
    { icon: Calendar, label: t("offlineEvent.dateLabel"), value: t("offlineEvent.date") },
    { icon: Clock, label: t("offlineEvent.timeLabel"), value: t("offlineEvent.time") },
    { icon: MapPin, label: t("offlineEvent.venueLabel"), value: t("offlineEvent.venue") },
    { icon: Users, label: t("offlineEvent.formatLabel"), value: t("offlineEvent.format") },
    { icon: Languages, label: t("offlineEvent.languageLabel"), value: t("offlineEvent.language") },
    { icon: Shirt, label: t("offlineEvent.attireLabel"), value: t("offlineEvent.attire") },
  ].filter((item) => item.value);

  const flowParagraphs = useMemo(
    () => asArray<string>(t("offlineEvent.flowParagraphs", { returnObjects: true })),
    [t],
  );

  const agendaRows = useMemo(
    () => asArray<AgendaRow>(t("offlineEvent.agendaRows", { returnObjects: true })),
    [t],
  );

  const debaters = useMemo(
    () => asArray<Debater>(t("offlineEvent.debaters", { returnObjects: true })),
    [t],
  );

  const pastIds = useMemo(
    () => asArray<string>(t("pastEvents.order", { returnObjects: true })),
    [t],
  );

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
        <p className="mb-3 text-xs font-medium uppercase tracking-[0.18em] text-gold/80">
          {t("offlineEvent.brand")}
        </p>
        <h1 className="font-display text-4xl md:text-5xl leading-tight">
          <span className="bg-gradient-to-r from-gold to-gold-light bg-clip-text text-transparent">
            {t("offlineEvent.launchHeadline")}
          </span>
        </h1>
        <p className="mt-4 text-lg text-gold/90 leading-relaxed">{t("offlineEvent.launchTagline")}</p>
        <div className="mx-auto mt-6 flex flex-col items-center">
          <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-gold/75">
            {t("offlineEvent.cohostKicker")}
          </p>
          <div className="mt-3 flex items-center justify-center gap-4 sm:gap-5">
            <p className="text-sm tracking-wide text-foreground">{t("offlineEvent.cohostLeft")}</p>
            <span className="text-gold/55" aria-hidden="true">
              ·
            </span>
            <p className="text-sm tracking-wide text-foreground">{t("offlineEvent.cohostRight")}</p>
          </div>
        </div>
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
            {t("offlineEvent.address") ? (
              <p className="mt-6 text-sm leading-relaxed text-muted-foreground whitespace-pre-line">
                {t("offlineEvent.address")}
              </p>
            ) : null}
          </div>

          <div className={`space-y-4 p-6 md:p-8 ${CARD_SURFACE}`}>
            {flowParagraphs.map((paragraph) => (
              <p key={paragraph.slice(0, 24)} className="text-sm leading-relaxed text-muted-foreground">
                {paragraph}
              </p>
            ))}
          </div>
        </motion.div>

        <div className="flex flex-col items-center">
          <div className={`w-full max-w-sm overflow-hidden p-6 ${CARD_SURFACE}`}>
            <img
              src={OXFORD_EVENT_MARK_SRC}
              alt="Oxford Union"
              className="mx-auto h-44 w-auto object-contain mix-blend-screen"
              loading="eager"
              decoding="async"
            />
          </div>

          <div className={`mt-8 w-full max-w-sm p-6 text-center ${CARD_SURFACE}`} id="register">
            <h2 className="mb-3 font-display text-xl text-gold">{t("offlineEvent.registrationTitle")}</h2>
            <p className="mb-6 text-sm leading-relaxed text-muted-foreground">
              {t("offlineEvent.registrationBody")}
            </p>
            <p className="mb-4 text-sm font-medium text-foreground">{t("offlineEvent.scanTitle")}</p>
            <a
              href={BOOK_CLUB_TELEGRAM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="mx-auto inline-block rounded-2xl border border-border/50 bg-white p-3 shadow-sm transition-opacity hover:opacity-90"
              aria-label={t("offlineEvent.qrAlt")}
            >
              <img
                src={BOOK_CLUB_TELEGRAM_QR_SRC}
                alt={t("offlineEvent.qrAlt")}
                width={220}
                height={220}
                className="h-[13.75rem] w-[13.75rem] object-contain"
                loading="eager"
                decoding="async"
              />
            </a>
            <p className="mt-4 text-xs leading-relaxed text-muted-foreground">{t("offlineEvent.scanHint")}</p>
            <p className="mt-3 text-sm text-muted-foreground">
              Telegram{" "}
              <a
                href={BOOK_CLUB_TELEGRAM_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gold hover:text-gold-light transition-colors"
              >
                @{BOOK_CLUB_TELEGRAM_HANDLE}
              </a>
            </p>
          </div>
        </div>
      </div>

      {debaters.length > 0 ? (
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          className={`${CONTENT_DEFAULT} ${SECTION_SPACING} mt-12 md:mt-16`}
          aria-labelledby="offline-event-debaters"
        >
          <h2 id="offline-event-debaters" className="mb-3 font-display text-2xl md:text-3xl text-foreground">
            {t("offlineEvent.debatersTitle")}
          </h2>
          <p className="mb-8 max-w-3xl text-sm leading-relaxed text-muted-foreground">
            {t("offlineEvent.debatersLead")}
          </p>
          <ul className={`grid list-none grid-cols-2 p-0 sm:grid-cols-4 ${GRID_GAP}`}>
            {debaters.map((person) => (
              <li key={person.name} className={`overflow-hidden ${CARD_SURFACE}`}>
                <img
                  src={person.photo}
                  alt=""
                  className="aspect-[4/5] w-full object-cover object-center"
                  loading="lazy"
                  decoding="async"
                />
                <div className="p-4">
                  <h3 className="font-display text-base leading-snug text-foreground md:text-lg">{person.name}</h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground md:text-sm">{person.role}</p>
                </div>
              </li>
            ))}
          </ul>
        </motion.section>
      ) : null}

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
        <AgendaTable
          rows={agendaRows}
          colTime={t("offlineEvent.agendaColTime")}
          colSegment={t("offlineEvent.agendaColSegment")}
          colContent={t("offlineEvent.agendaColContent")}
        />
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-40px" }}
        className={`${CONTENT_DEFAULT} ${SECTION_SPACING} mt-4 scroll-mt-28`}
        aria-labelledby="offline-event-past"
        id="past"
      >
        <h2 id="offline-event-past" className="mb-3 font-display text-2xl md:text-3xl text-foreground">
          {t("pastEvents.title")}
        </h2>
        <p className="mb-8 max-w-3xl text-sm leading-relaxed text-muted-foreground">{t("pastEvents.lead")}</p>
        <div className={`grid grid-cols-1 ${GRID_GAP}`}>
          {pastIds.map((id) => (
            <Link
              key={id}
              to={`/event/${id}`}
              className={`group block p-6 no-underline md:p-8 ${CARD_SURFACE}`}
            >
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-gold/80">
                {t("pastEvents.ended")} · {t(`pastEvents.${id}.date`)}
              </p>
              <h3 className="mt-2 font-display text-2xl text-foreground group-hover:text-gold md:text-3xl">
                {t(`pastEvents.${id}.launchHeadline`)}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                {t(`pastEvents.${id}.cardSummary`)}
              </p>
              <p className="mt-4 inline-flex items-center gap-1 text-sm text-gold">
                {t("pastEvents.open")}
                <ChevronRight className="h-4 w-4" aria-hidden />
              </p>
            </Link>
          ))}
        </div>
      </motion.section>
    </div>
  );
}

function AgendaTable({
  rows,
  colTime,
  colSegment,
  colContent,
}: {
  rows: AgendaRow[];
  colTime: string;
  colSegment: string;
  colContent: string;
}) {
  return (
    <div className={`overflow-x-auto ${CARD_SURFACE}`}>
      <table className="w-full min-w-[36rem] text-left text-sm">
        <thead>
          <tr className="border-b border-border/50 bg-card/50">
            <th className="px-4 py-3 font-medium text-gold/90 whitespace-nowrap">{colTime}</th>
            <th className="px-4 py-3 font-medium text-gold/90">{colSegment}</th>
            <th className="px-4 py-3 font-medium text-gold/90">{colContent}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={`${row.time}-${row.segment}`} className="border-b border-border/40 last:border-0">
              <td className="px-4 py-3 align-top font-tech text-xs text-gold/85 whitespace-nowrap">{row.time}</td>
              <td className="px-4 py-3 align-top font-medium text-foreground">{row.segment}</td>
              <td className="px-4 py-3 align-top text-muted-foreground leading-relaxed">{row.content}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
