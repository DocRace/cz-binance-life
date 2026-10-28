import { useEffect, useMemo } from "react";
import { Link, useParams } from "react-router";
import { motion } from "motion/react";
import {
  Award,
  Building2,
  Calendar,
  ChevronLeft,
  Clapperboard,
  Clock,
  Handshake,
  Languages,
  MapPin,
  Mic,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  BOOK_CLUB_TELEGRAM_HANDLE,
  BOOK_CLUB_TELEGRAM_QR_SRC,
  BOOK_CLUB_TELEGRAM_URL,
  OFFLINE_EVENT_POSTER_SRC,
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
import NotFound from "./NotFound";
import OfflineEventPress from "../components/OfflineEventPress";
import PartnerLogoMark from "../components/PartnerLogoMark";
import PartnerLogoRow from "../components/PartnerLogoRow";
import { partnerLogoIdFromTitle } from "../../lib/partnerLogos";

type AgendaRow = { time: string; segment: string; content: string };
type PartnerAbout = { title: string; body: string };

const HIGHLIGHT_ICONS: LucideIcon[] = [Users, Award, Building2, Mic, Clapperboard, Handshake];

function asArray<T>(raw: unknown): T[] {
  return Array.isArray(raw) ? (raw as T[]) : [];
}

export default function PastEventPage() {
  const { eventId = "" } = useParams();
  const { t, i18n } = useTranslation();
  const base = `pastEvents.${eventId}`;
  const exists = i18n.exists(`${base}.launchHeadline`);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [eventId]);

  const flowParagraphs = useMemo(
    () => (exists ? asArray<string>(t(`${base}.flowParagraphs`, { returnObjects: true })) : []),
    [base, exists, t],
  );
  const agendaRows = useMemo(
    () => (exists ? asArray<AgendaRow>(t(`${base}.agendaRows`, { returnObjects: true })) : []),
    [base, exists, t],
  );
  const highlights = useMemo(
    () => (exists ? asArray<string>(t(`${base}.highlights`, { returnObjects: true })) : []),
    [base, exists, t],
  );
  const partners = useMemo(
    () => (exists ? asArray<PartnerAbout>(t(`${base}.partners`, { returnObjects: true })) : []),
    [base, exists, t],
  );

  if (!exists) return <NotFound />;

  const details = [
    { icon: Calendar, label: t(`${base}.dateLabel`), value: t(`${base}.date`) },
    { icon: Clock, label: t(`${base}.timeLabel`), value: t(`${base}.time`) },
    { icon: MapPin, label: t(`${base}.venueLabel`), value: t(`${base}.venue`) },
    ...(i18n.exists(`${base}.host`) && t(`${base}.host`)
      ? [{ icon: Mic, label: t(`${base}.hostLabel`), value: t(`${base}.host`) }]
      : []),
    { icon: Languages, label: t(`${base}.languageLabel`), value: t(`${base}.language`) },
  ].filter((item) => item.value);

  const showPoster = t(`${base}.showPoster`) === "yes";
  const showSupporters = t(`${base}.showSupporters`) === "yes";
  const showPress = t(`${base}.showPress`) === "yes";
  const address = i18n.exists(`${base}.address`) ? t(`${base}.address`) : "";

  return (
    <div className={PAGE_SHELL}>
      <div className={`${CONTENT_DEFAULT} mb-8`}>
        <Link
          to="/event#past"
          className="inline-flex items-center justify-center gap-2 rounded-full bg-gold/90 px-6 py-3 text-sm font-body font-medium tracking-wide text-primary-foreground shadow-sm transition-colors hover:bg-gold no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <ChevronLeft className="h-4 w-4 shrink-0" aria-hidden />
          {t("pastEvents.backToCurrent")}
        </Link>
      </div>

      <motion.header
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className={`${PAGE_HEADER} ${CONTENT_NARROW}`}
      >
        <p className="mb-3 text-xs font-medium uppercase tracking-[0.18em] text-gold/80">
          {i18n.exists(`${base}.brand`) ? t(`${base}.brand`) : t("pastEvents.ended")}
        </p>
        <h1 className="font-display text-4xl md:text-5xl leading-tight">
          <span className="bg-gradient-to-r from-gold to-gold-light bg-clip-text text-transparent">
            {t(`${base}.launchHeadline`)}
          </span>
        </h1>
        <p className="mt-4 text-lg text-gold/90 leading-relaxed">{t(`${base}.launchTagline`)}</p>
        <p className="mt-3 text-sm text-muted-foreground">{t(`${base}.subtitle`)}</p>
      </motion.header>

      {showSupporters ? (
        <div className={`${CONTENT_DEFAULT} mb-10`}>
          <p className="mb-4 text-center text-xs font-medium uppercase tracking-[0.18em] text-gold/80">
            {t(`${base}.supportersTitle`)}
          </p>
          <PartnerLogoRow size="md" />
        </div>
      ) : null}

      <div className={`${CONTENT_DEFAULT} grid grid-cols-1 items-start lg:grid-cols-2 ${GRID_GAP}`}>
        <div className="space-y-6">
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
            {address ? (
              <p className="mt-6 text-sm leading-relaxed text-muted-foreground whitespace-pre-line">{address}</p>
            ) : null}
          </div>
          <div className={`space-y-4 p-6 md:p-8 ${CARD_SURFACE}`}>
            {flowParagraphs.map((paragraph) => (
              <p key={paragraph.slice(0, 32)} className="text-sm leading-relaxed text-muted-foreground">
                {paragraph}
              </p>
            ))}
          </div>
        </div>

        <div className="flex flex-col items-center">
          {showPoster ? (
            <div className={`w-full max-w-sm overflow-hidden ${CARD_SURFACE}`}>
              <img
                src={OFFLINE_EVENT_POSTER_SRC}
                alt={t(`${base}.launchHeadline`)}
                className="w-full object-contain"
                loading="eager"
                decoding="async"
              />
            </div>
          ) : null}
          <div className={`${showPoster ? "mt-8" : ""} w-full max-w-sm p-6 text-center ${CARD_SURFACE}`}>
            <p className="mb-4 font-display text-xl text-gold">{t(`${base}.scanTitle`)}</p>
            <a
              href={BOOK_CLUB_TELEGRAM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="mx-auto inline-block rounded-2xl border border-border/50 bg-white p-3 shadow-sm transition-opacity hover:opacity-90"
              aria-label={t(`${base}.qrAlt`)}
            >
              <img
                src={BOOK_CLUB_TELEGRAM_QR_SRC}
                alt={t(`${base}.qrAlt`)}
                width={220}
                height={220}
                className="h-[13.75rem] w-[13.75rem] object-contain"
                loading="lazy"
                decoding="async"
              />
            </a>
            <p className="mt-4 text-xs leading-relaxed text-muted-foreground">{t(`${base}.scanHint`)}</p>
            <p className="mt-3 text-sm text-muted-foreground">
              Telegram{" "}
              <a
                href={BOOK_CLUB_TELEGRAM_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gold transition-colors hover:text-gold-light"
              >
                @{BOOK_CLUB_TELEGRAM_HANDLE}
              </a>
            </p>
          </div>
        </div>
      </div>

      {partners.length > 0 ? (
        <section className={`${CONTENT_DEFAULT} ${SECTION_SPACING} mt-12 md:mt-16`} aria-labelledby="past-partners">
          <h2 id="past-partners" className="mb-6 font-display text-2xl text-foreground md:text-3xl">
            {t(`${base}.partnersTitle`)}
          </h2>
          <div className="grid grid-cols-1 gap-4 md:max-w-xl">
            {partners.map((partner) => {
              const logoId = partnerLogoIdFromTitle(partner.title);
              return (
                <article key={partner.title} className={`p-6 md:p-7 ${CARD_SURFACE}`}>
                  {logoId ? (
                    <div className="mb-4 flex min-h-12 items-center">
                      <PartnerLogoMark id={logoId} size="md" />
                    </div>
                  ) : null}
                  <h3 className="mb-3 font-display text-lg text-gold">{partner.title}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">{partner.body}</p>
                </article>
              );
            })}
          </div>
        </section>
      ) : null}

      {agendaRows.length > 0 ? (
        <section className={`${CONTENT_DEFAULT} ${SECTION_SPACING} mt-12 md:mt-16`} aria-labelledby="past-agenda">
          <h2 id="past-agenda" className="mb-6 font-display text-2xl text-foreground md:text-3xl">
            {t(`${base}.agendaTitle`)}
          </h2>
          <div className={`overflow-x-auto ${CARD_SURFACE}`}>
            <table className="w-full min-w-[36rem] text-left text-sm">
              <thead>
                <tr className="border-b border-border/50 bg-card/50">
                  <th className="whitespace-nowrap px-4 py-3 font-medium text-gold/90">{t(`${base}.agendaColTime`)}</th>
                  <th className="px-4 py-3 font-medium text-gold/90">{t(`${base}.agendaColSegment`)}</th>
                  <th className="px-4 py-3 font-medium text-gold/90">{t(`${base}.agendaColContent`)}</th>
                </tr>
              </thead>
              <tbody>
                {agendaRows.map((row) => (
                  <tr key={`${row.time}-${row.segment}`} className="border-b border-border/40 last:border-0">
                    <td className="whitespace-nowrap px-4 py-3 align-top font-tech text-xs text-gold/85">{row.time}</td>
                    <td className="px-4 py-3 align-top font-medium text-foreground">{row.segment}</td>
                    <td className="px-4 py-3 align-top leading-relaxed text-muted-foreground">{row.content}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {highlights.length > 0 ? (
        <section className={`${CONTENT_DEFAULT} ${SECTION_SPACING}`} aria-labelledby="past-highlights">
          <h2 id="past-highlights" className="mb-6 font-display text-2xl text-foreground md:text-3xl">
            {t(`${base}.highlightsTitle`)}
          </h2>
          <ul className={`grid grid-cols-1 gap-3 sm:grid-cols-2 ${GRID_GAP}`}>
            {highlights.map((item, index) => {
              const Icon = HIGHLIGHT_ICONS[index] ?? Users;
              return (
                <li key={item} className={`flex items-start gap-3 p-4 md:p-5 ${CARD_SURFACE}`}>
                  <Icon className="mt-0.5 h-8 w-8 shrink-0 text-gold" aria-hidden />
                  <span className="text-sm leading-relaxed text-foreground">{item}</span>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {showPress ? <OfflineEventPress base={base} /> : null}
    </div>
  );
}
