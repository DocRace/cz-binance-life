import { useMemo, useRef, useState } from "react";
import { motion, useReducedMotion, useScroll, useSpring } from "motion/react";
import { useTranslation } from "react-i18next";
import {
  BookOpen,
  Briefcase,
  Globe2,
  GraduationCap,
  Landmark,
  Rocket,
  Scale,
  Sparkles,
  TrendingUp,
  Bitcoin,
  type LucideIcon,
} from "lucide-react";

type Era = "origin" | "markets" | "crypto" | "binance" | "horizon";

interface TimelineEvent {
  yearKey: string;
  titleKey: string;
  descKey: string;
  locKey: string;
  era: Era;
  icon: LucideIcon;
  detailKeys: string[];
}

const ERA_UI: Record<
  Era,
  { border: string; node: string; pill: string; gradient: string }
> = {
  origin: {
    border: "border-amber-200/20",
    node: "from-amber-200/90 to-amber-600/80",
    pill: "bg-amber-500/15 text-amber-100 border-amber-400/25",
    gradient: "from-amber-500/20 via-transparent to-transparent",
  },
  markets: {
    border: "border-slate-400/20",
    node: "from-slate-300/90 to-slate-600/80",
    pill: "bg-slate-500/15 text-slate-100 border-slate-400/25",
    gradient: "from-slate-400/15 via-transparent to-transparent",
  },
  crypto: {
    border: "border-emerald-400/20",
    node: "from-emerald-400/90 to-teal-700/80",
    pill: "bg-emerald-500/12 text-emerald-100 border-emerald-400/20",
    gradient: "from-emerald-500/18 via-transparent to-transparent",
  },
  binance: {
    border: "border-yellow-400/25",
    node: "from-yellow-300/95 to-amber-700/85",
    pill: "bg-yellow-500/12 text-yellow-50 border-yellow-400/30",
    gradient: "from-yellow-500/20 via-transparent to-transparent",
  },
  horizon: {
    border: "border-violet-400/20",
    node: "from-violet-400/90 to-indigo-800/80",
    pill: "bg-violet-500/12 text-violet-100 border-violet-400/25",
    gradient: "from-violet-500/18 via-transparent to-transparent",
  },
};

export default function Timeline() {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const reduceMotion = useReducedMotion();

  const events: TimelineEvent[] = useMemo(
    () => [
      {
        yearKey: "timeline.y1",
        titleKey: "timeline.event1Title",
        descKey: "timeline.event1Desc",
        locKey: "timeline.event1Location",
        era: "origin",
        icon: Sparkles,
        detailKeys: ["timeline.event1Detail1", "timeline.event1Detail2"],
      },
      {
        yearKey: "timeline.y2",
        titleKey: "timeline.event2Title",
        descKey: "timeline.event2Desc",
        locKey: "timeline.event2Location",
        era: "origin",
        icon: Globe2,
        detailKeys: ["timeline.event2Detail1", "timeline.event2Detail2", "timeline.event2Detail3"],
      },
      {
        yearKey: "timeline.y3",
        titleKey: "timeline.event3Title",
        descKey: "timeline.event3Desc",
        locKey: "timeline.event3Location",
        era: "origin",
        icon: GraduationCap,
        detailKeys: ["timeline.event3Detail1", "timeline.event3Detail2", "timeline.event3Detail3"],
      },
      {
        yearKey: "timeline.y4",
        titleKey: "timeline.event4Title",
        descKey: "timeline.event4Desc",
        locKey: "timeline.event4Location",
        era: "markets",
        icon: Landmark,
        detailKeys: ["timeline.event4Detail1", "timeline.event4Detail2", "timeline.event4Detail3"],
      },
      {
        yearKey: "timeline.y5",
        titleKey: "timeline.event5Title",
        descKey: "timeline.event5Desc",
        locKey: "timeline.event5Location",
        era: "markets",
        icon: Briefcase,
        detailKeys: ["timeline.event5Detail1", "timeline.event5Detail2", "timeline.event5Detail3"],
      },
      {
        yearKey: "timeline.y6",
        titleKey: "timeline.event6Title",
        descKey: "timeline.event6Desc",
        locKey: "timeline.event6Location",
        era: "crypto",
        icon: Bitcoin,
        detailKeys: ["timeline.event6Detail1", "timeline.event6Detail2", "timeline.event6Detail3"],
      },
      {
        yearKey: "timeline.y7",
        titleKey: "timeline.event7Title",
        descKey: "timeline.event7Desc",
        locKey: "timeline.event7Location",
        era: "crypto",
        icon: TrendingUp,
        detailKeys: ["timeline.event7Detail1", "timeline.event7Detail2", "timeline.event7Detail3"],
      },
      {
        yearKey: "timeline.y8",
        titleKey: "timeline.event8Title",
        descKey: "timeline.event8Desc",
        locKey: "timeline.event8Location",
        era: "binance",
        icon: Rocket,
        detailKeys: [
          "timeline.event8Detail1",
          "timeline.event8Detail2",
          "timeline.event8Detail3",
          "timeline.event8Detail4",
        ],
      },
      {
        yearKey: "timeline.y9",
        titleKey: "timeline.event9Title",
        descKey: "timeline.event9Desc",
        locKey: "timeline.event9Location",
        era: "binance",
        icon: TrendingUp,
        detailKeys: ["timeline.event9Detail1", "timeline.event9Detail2", "timeline.event9Detail3"],
      },
      {
        yearKey: "timeline.y10",
        titleKey: "timeline.event10Title",
        descKey: "timeline.event10Desc",
        locKey: "timeline.event10Location",
        era: "binance",
        icon: Globe2,
        detailKeys: ["timeline.event10Detail1", "timeline.event10Detail2", "timeline.event10Detail3"],
      },
      {
        yearKey: "timeline.y11",
        titleKey: "timeline.event11Title",
        descKey: "timeline.event11Desc",
        locKey: "timeline.event11Location",
        era: "binance",
        icon: Landmark,
        detailKeys: ["timeline.event11Detail1", "timeline.event11Detail2", "timeline.event11Detail3"],
      },
      {
        yearKey: "timeline.y12",
        titleKey: "timeline.event12Title",
        descKey: "timeline.event12Desc",
        locKey: "timeline.event12Location",
        era: "binance",
        icon: Sparkles,
        detailKeys: ["timeline.event12Detail1", "timeline.event12Detail2", "timeline.event12Detail3"],
      },
      {
        yearKey: "timeline.y13",
        titleKey: "timeline.event13Title",
        descKey: "timeline.event13Desc",
        locKey: "timeline.event13Location",
        era: "horizon",
        icon: Scale,
        detailKeys: ["timeline.event13Detail1", "timeline.event13Detail2", "timeline.event13Detail3"],
      },
      {
        yearKey: "timeline.y14",
        titleKey: "timeline.event14Title",
        descKey: "timeline.event14Desc",
        locKey: "timeline.event14Location",
        era: "horizon",
        icon: BookOpen,
        detailKeys: ["timeline.event14Detail1", "timeline.event14Detail2", "timeline.event14Detail3"],
      },
    ],
    [],
  );

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start 0.1", "end 0.9"],
  });
  const lineProgress = useSpring(scrollYProgress, { stiffness: 100, damping: 30 });

  return (
    <div ref={containerRef} className="relative min-h-screen overflow-x-hidden bg-[#070708] text-foreground">
      {/* Ambient backdrop */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_120%_80%_at_50%_-20%,rgba(212,175,55,0.14),transparent_55%),radial-gradient(ellipse_80%_50%_at_100%_50%,rgba(99,102,241,0.06),transparent_45%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent,transparent,rgba(0,0,0,0.45))]" />
        <div
          className="absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80' viewBox='0 0 80 80'%3E%3Cg fill='none' stroke='%23fff' stroke-width='0.5'%3E%3Cpath d='M0 40h80M40 0v80'/%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
      </div>

      {/* Hero */}
      <header className="relative px-4 pb-16 pt-24 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto max-w-4xl text-center"
        >
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground backdrop-blur-sm">
            <Sparkles className="h-3.5 w-3.5 text-gold" aria-hidden />
            {t("timeline.heroKicker")}
          </div>
          <h1 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl md:text-6xl">
            <span className="bg-gradient-to-br from-[#f4e4bc] via-gold to-[#a67c2d] bg-clip-text text-transparent">
              {t("timeline.title")}
            </span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            {t("timeline.subtitle")}
          </p>
          {/* Era chips */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
            {[t("timeline.chipEra1"), t("timeline.chipEra2"), t("timeline.chipEra3"), t("timeline.chipEra4")].map(
              (label) => (
                <span
                  key={label}
                  className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-muted-foreground backdrop-blur-sm"
                >
                  {label}
                </span>
              ),
            )}
          </div>
        </motion.div>
      </header>

      {/* Timeline — 3D perspective scene */}
      <section
        className="relative mx-auto max-w-6xl px-4 pb-28 sm:px-6 lg:px-8 [perspective:min(1400px,100vw)]"
        style={{ perspectiveOrigin: "50% 0%" }}
      >
        <div
          className="relative [transform-style:preserve-3d]"
          style={{ transform: reduceMotion ? undefined : "rotateX(0.6deg)" }}
        >
          {/* Center spine: faux cylinder + glow */}
          <div className="pointer-events-none absolute left-5 top-0 z-0 hidden h-full w-20 -translate-x-1/2 md:left-1/2 md:block">
            <div
              className="absolute left-1/2 top-0 h-full w-[18px] -translate-x-1/2 rounded-full opacity-90"
              style={{
                background:
                  "linear-gradient(90deg, rgba(0,0,0,0.85) 0%, rgba(212,175,55,0.35) 35%, rgba(255,255,255,0.2) 50%, rgba(100,80,20,0.5) 72%, rgba(0,0,0,0.9) 100%)",
                boxShadow:
                  "inset 4px 0 12px rgba(255,220,160,0.15), inset -6px 0 14px rgba(0,0,0,0.6), 0 0 40px rgba(212,175,55,0.25)",
                transform: reduceMotion ? undefined : "rotateX(12deg)",
                transformOrigin: "center top",
              }}
            />
            <div className="absolute left-1/2 top-0 h-full w-9 -translate-x-1/2 rounded-full bg-gradient-to-b from-gold/15 via-transparent to-violet-500/10 blur-xl" />
          </div>
          <motion.div
            className="pointer-events-none absolute left-5 top-0 z-[1] hidden h-full w-[3px] origin-top md:left-1/2 md:block md:-translate-x-1/2"
            style={{
              scaleY: lineProgress,
              background: "linear-gradient(180deg, rgba(212,175,55,0.95), rgba(167,139,250,0.45), transparent)",
              boxShadow: "0 0 28px rgba(212,175,55,0.45), 0 0 2px rgba(255,255,255,0.4)",
              transform: reduceMotion ? undefined : "translateZ(24px)",
            }}
          />

          <div className="relative z-[2] space-y-12 md:space-y-28">
            {events.map((event, index) => {
              const Icon = event.icon;
              const ui = ERA_UI[event.era];
              const isLeft = index % 2 === 0;
              const expanded = openIndex === index;
              const card = (
                <motion.div
                  className="relative [transform-style:preserve-3d]"
                  initial={false}
                  style={{ transformStyle: "preserve-3d" }}
                  animate={
                    reduceMotion
                      ? {}
                      : {
                          rotateY: isLeft ? -5 : 5,
                          rotateX: 0.5,
                          z: 0,
                        }
                  }
                  whileHover={
                    reduceMotion
                      ? {}
                      : {
                          rotateY: isLeft ? -7 : 7,
                          z: 32,
                          transition: { type: "spring", stiffness: 260, damping: 22 },
                        }
                  }
                  transition={{ type: "spring", stiffness: 140, damping: 24 }}
                >
                  {/* depth stack behind card */}
                  <div
                    aria-hidden
                    className={`pointer-events-none absolute -inset-1 -z-10 rounded-[1.05rem] border ${ui.border} bg-black/50 opacity-70 blur-[1px]`}
                    style={{
                      transform: "translateZ(-14px) translateY(10px) scale(0.98)",
                    }}
                  />
                  <div
                    aria-hidden
                    className="pointer-events-none absolute -inset-x-1 -bottom-4 top-1/2 -z-20 rounded-3xl bg-gradient-to-b from-transparent via-black/50 to-black/90 opacity-80"
                    style={{ transform: "translateZ(-28px) rotateX(8deg)" }}
                  />
                  <CardPanel
                    event={event}
                    Icon={Icon}
                    ui={ui}
                    expanded={expanded}
                    onToggle={() => setOpenIndex(expanded ? null : index)}
                    t={t}
                  />
                </motion.div>
              );
              const node = (
                <div className="flex justify-center pt-1 md:flex md:pt-2" style={{ transformStyle: "preserve-3d" }}>
                  <motion.div
                    whileHover={reduceMotion ? {} : { scale: 1.08, z: 36 }}
                    className={`relative flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br shadow-xl ring-2 ring-black/50 ${ui.node}`}
                    style={{
                      boxShadow:
                        "0 12px 24px rgba(0,0,0,0.65), 0 0 0 1px rgba(255,255,255,0.12) inset, 8px 8px 20px rgba(212,175,55,0.15)",
                      transform: reduceMotion ? undefined : "translateZ(48px) rotateX(-12deg)",
                    }}
                  >
                    <span
                      className="pointer-events-none absolute inset-[3px] rounded-full bg-gradient-to-br from-white/35 via-transparent to-transparent opacity-90"
                      style={{ transform: "translateZ(2px)" }}
                    />
                    <span className="pointer-events-none absolute inset-0 rounded-full bg-white/10 blur-md" />
                    <Icon className="relative h-7 w-7 text-white drop-shadow-lg" aria-hidden />
                  </motion.div>
                </div>
              );

              return (
                <motion.article
                  key={event.titleKey}
                  initial={{ opacity: 0, y: 36 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.12 }}
                  transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                  className="timeline-event relative [transform-style:preserve-3d]"
                  style={
                    reduceMotion
                      ? undefined
                      : {
                          transform: "translateZ(0px)",
                        }
                  }
                >
                  {/* Mobile: 3d-lite rail */}
                  <div className="relative pl-6 md:hidden [perspective:800px]">
                    <div
                      className="absolute -left-[7px] top-8 h-4 w-4 rounded-full border-2 border-gold/50 bg-[#070708] shadow-[0_6px_16px_rgba(0,0,0,0.85),0_0_14px_rgba(212,175,55,0.45)]"
                      style={{ transform: "translateZ(12px)" }}
                    />
                    <div
                      className="absolute bottom-4 left-[5px] top-8 w-[3px] rounded-full bg-gradient-to-b from-gold/70 via-white/20 to-transparent opacity-90"
                      style={{
                        boxShadow: "inset -1px 0 2px rgba(255,255,255,0.2)",
                        transform: "rotateY(-18deg)",
                        transformOrigin: "left center",
                      }}
                    />
                    {card}
                  </div>

                  {/* Desktop: alternating 3-col */}
                  <div className="relative hidden md:grid md:grid-cols-[1fr_auto_1fr] md:items-start md:gap-8">
                    {isLeft ? (
                      <>
                        <div className="min-w-0 pr-2 text-right">{card}</div>
                        <div className="flex w-16 shrink-0 justify-center [transform-style:preserve-3d]">
                          {node}
                        </div>
                        <div />
                      </>
                    ) : (
                      <>
                        <div />
                        <div className="flex w-16 shrink-0 justify-center [transform-style:preserve-3d]">
                          {node}
                        </div>
                        <div className="min-w-0 pl-2 text-left">{card}</div>
                      </>
                    )}
                  </div>
                </motion.article>
              );
            })}
          </div>
        </div>

        <p className="mx-auto mt-20 max-w-3xl text-center text-xs leading-relaxed text-muted-foreground/80">
          {t("timeline.disclaimer")}
        </p>
      </section>
    </div>
  );
}

function CardPanel({
  event,
  Icon,
  ui,
  expanded,
  onToggle,
  t,
}: {
  event: TimelineEvent;
  Icon: LucideIcon;
  ui: (typeof ERA_UI)["origin"];
  expanded: boolean;
  onToggle: () => void;
  t: (k: string) => string;
}) {
  return (
    <motion.button
      type="button"
      onClick={onToggle}
      className={`group w-full text-left outline-none transition-all duration-300 focus-visible:ring-2 focus-visible:ring-gold/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#070708] ${expanded ? "scale-[1.01]" : "hover:scale-[1.01]"} `}
    >
      <div
        className={`relative overflow-hidden rounded-2xl border ${ui.border} bg-gradient-to-br from-white/[0.07] to-white/[0.02] p-6 shadow-[0_24px_55px_-18px_rgba(0,0,0,0.85)] backdrop-blur-xl transition-all duration-500 group-hover:border-white/25 group-hover:shadow-[0_32px_70px_-24px_rgba(212,175,55,0.18)]`}
        style={{ transform: "translateZ(12px)", transformStyle: "preserve-3d" }}
      >
        <div className={`pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full blur-3xl ${ui.gradient}`} />
        <div className="relative flex flex-col gap-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <span
              className={`inline-flex items-center rounded-full border px-3 py-1 font-mono text-xs font-semibold tracking-wide ${ui.pill}`}
            >
              {t(event.yearKey)}
            </span>
            <span className="rounded-md border border-white/10 bg-black/30 px-2 py-0.5 text-[10px] uppercase tracking-widest text-muted-foreground">
              {t(event.locKey)}
            </span>
          </div>
          <div className="flex items-start gap-3 md:items-center">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10 md:hidden">
              <Icon className="h-6 w-6 text-gold-light" aria-hidden />
            </div>
            <div>
              <h2 className="font-display text-xl font-semibold leading-snug tracking-tight sm:text-2xl">
                {t(event.titleKey)}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t(event.descKey)}</p>
            </div>
          </div>
          <motion.div
            initial={false}
            animate={{ height: expanded ? "auto" : 0, opacity: expanded ? 1 : 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <ul className="mt-3 space-y-2 border-t border-white/10 pt-4">
              {event.detailKeys.map((key) => (
                <li key={key} className="flex gap-2 text-sm text-muted-foreground">
                  <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-gold/80" />
                  <span className="leading-relaxed">{t(key)}</span>
                </li>
              ))}
            </ul>
          </motion.div>
          <span className="mt-1 text-[11px] font-medium uppercase tracking-wider text-gold/70">
            {expanded ? t("timeline.collapse") : t("timeline.expand")}
          </span>
        </div>
      </div>
    </motion.button>
  );
}
