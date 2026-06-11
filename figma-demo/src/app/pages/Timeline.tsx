import { useCallback, useEffect, useMemo, useReducer } from "react";
import { motion, useReducedMotion } from "motion/react";
import { useTranslation } from "react-i18next";
import {
  Bitcoin,
  BookOpen,
  Briefcase,
  ChevronLeft,
  ChevronRight,
  Globe2,
  GraduationCap,
  Landmark,
  Rocket,
  Scale,
  Sparkles,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";

import { TimelineYouTubeArchive } from "../components/TimelineYouTubeArchive";

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

/** Cover-flow offsets — fewer visible layers, clearer depth separation */
function carouselTransform(d: number) {
  const ad = Math.abs(d);
  const sign = Math.sign(d) || 0;
  const rotateY = -sign * (32 + Math.min(ad, 2) * 5);
  const translateX = d * (ad <= 2 ? 228 : 196);
  const translateZ = -(ad ** 1.12) * 92 + (d === 0 ? 112 : 0);
  const scale = d === 0 ? 1 : Math.max(0.74, 0.97 - Math.min(ad, 4) * 0.09);
  const opacity = ad > 3 ? 0 : d === 0 ? 1 : Math.max(0.38, 0.9 - ad * 0.22);
  return { rotateY, translateX, translateZ, scale, opacity };
}

const CARD_HALF_PX = 205;
const CAROUSEL_VISIBLE_RADIUS = 3;

const ERA_SEGMENT_DEFS: { chipKey: string; match: (era: Era) => boolean }[] = [
  { chipKey: "timeline.chipEra1", match: (era) => era === "origin" },
  { chipKey: "timeline.chipEra2", match: (era) => era === "markets" },
  { chipKey: "timeline.chipEra3", match: (era) => era === "crypto" || era === "binance" },
  { chipKey: "timeline.chipEra4", match: (era) => era === "horizon" },
];

type CarouselState = { focus: number; expandedOpen: boolean };
type CarouselAction =
  | { type: "prev" }
  | { type: "next" }
  | { type: "jump"; index: number }
  | { type: "interact"; index: number }
  | { type: "collapse" };

function createCarouselReducer(eventCount: number) {
  const cap = Math.max(0, eventCount - 1);
  return (state: CarouselState, action: CarouselAction): CarouselState => {
    switch (action.type) {
      case "prev":
        return { focus: Math.max(0, state.focus - 1), expandedOpen: false };
      case "next":
        return { focus: Math.min(cap, state.focus + 1), expandedOpen: false };
      case "jump":
        return {
          focus: Math.min(cap, Math.max(0, action.index)),
          expandedOpen: false,
        };
      case "interact":
        if (state.focus !== action.index)
          return { focus: Math.min(cap, Math.max(0, action.index)), expandedOpen: false };
        return { ...state, expandedOpen: !state.expandedOpen };
      case "collapse":
        return { ...state, expandedOpen: false };
      default:
        return state;
    }
  };
}

export default function Timeline() {
  const { t } = useTranslation();
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

  const total = events.length;

  const eraSegments = useMemo(
    () =>
      ERA_SEGMENT_DEFS.map((def) => ({
        chipKey: def.chipKey,
        indices: events.map((_, i) => i).filter((i) => def.match(events[i].era)),
      })),
    [events],
  );

  const carouselReducer = useMemo(() => createCarouselReducer(events.length), [events.length]);
  const [carousel, carouselDispatch] = useReducer(carouselReducer, {
    focus: 0,
    expandedOpen: false,
  });
  const focusedIndex = carousel.focus;
  const expandedActive = carousel.expandedOpen;

  const goPrev = useCallback(() => {
    carouselDispatch({ type: "prev" });
  }, []);

  const goNext = useCallback(() => {
    carouselDispatch({ type: "next" });
  }, []);

  const handleInteract = useCallback((index: number) => {
    carouselDispatch({ type: "interact", index });
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        goPrev();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        goNext();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goPrev, goNext]);

  const scrollToSection = useCallback((id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const swipeDrag = reduceMotion ? false : ("x" as const);
  const onDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: { offset: { x: number }; velocity: { x: number } }) => {
    const thresh = 48;
    if (info.velocity.x > 220 || info.offset.x > thresh) goPrev();
    else if (info.velocity.x < -220 || info.offset.x < -thresh) goNext();
  };

  const progressPct = `${((focusedIndex + 1) / total) * 100}%`;

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#070708] text-foreground">
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_120%_80%_at_50%_-20%,rgba(212,175,55,0.14),transparent_55%),radial-gradient(ellipse_80%_50%_at_100%_50%,rgba(99,102,241,0.06),transparent_45%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent,transparent,rgba(0,0,0,0.52))]" />
        <div
          className="absolute inset-x-0 bottom-0 h-[42%]"
          style={{
            background:
              "radial-gradient(ellipse 80% 65% at 50% 100%,rgba(212,175,55,0.07),transparent 70%)",
          }}
        />
      </div>

      <header className="relative px-4 pb-6 pt-14 max-sm:z-30 max-sm:bg-[#070708] sm:px-6 sm:pb-7 sm:pt-16 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto max-w-4xl text-center"
        >
          <h1 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl md:text-6xl">
            <span className="bg-gradient-to-br from-[#f4e4bc] via-gold to-[#a67c2d] bg-clip-text text-transparent">
              {t("timeline.title")}
            </span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            {t("timeline.subtitle")}
          </p>
          <nav
            className="mx-auto mt-8 flex max-w-2xl flex-wrap items-center justify-center gap-1.5 sm:gap-2"
            aria-label={t("timeline.pageNavAria")}
          >
            <button
              type="button"
              onClick={() => scrollToSection("section-timeline-carousel")}
              className="min-w-0 max-w-[calc(50%-0.2rem)] rounded-full border border-white/12 bg-white/[0.05] px-3 py-1.5 text-center text-xs font-medium leading-tight text-balance text-muted-foreground transition-colors hover:border-gold/35 hover:bg-white/[0.08] hover:text-white sm:max-w-none sm:px-4 sm:text-sm"
            >
              {t("timeline.navMilestones")}
            </button>
            <button
              type="button"
              onClick={() => scrollToSection("section-timeline-youtube")}
              className="min-w-0 max-w-[calc(50%-0.2rem)] rounded-full border border-white/12 bg-white/[0.05] px-3 py-1.5 text-center text-xs font-medium leading-tight text-balance text-muted-foreground transition-colors hover:border-gold/35 hover:bg-white/[0.08] hover:text-white sm:max-w-none sm:px-4 sm:text-sm"
            >
              {t("timeline.navVideos")}
            </button>
          </nav>

          {/* “Now playing” timeline progress strip */}
          <div className="mx-auto mt-6 h-1 max-w-xl overflow-hidden rounded-full bg-white/[0.08]">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-gold via-amber-200 to-violet-400"
              animate={{ width: progressPct }}
              transition={{ type: "spring", stiffness: 420, damping: 40 }}
            />
          </div>
          <div className="mt-2 text-center font-mono text-[10px] text-muted-foreground/80 tabular-nums">
            {focusedIndex + 1} / {total}
          </div>
        </motion.div>
      </header>

      <section
        className="relative z-0 mx-auto max-w-[1700px] px-4 pb-0 sm:px-6 lg:px-10"
        style={{ perspectiveOrigin: "50% 40%" }}
      >
        <div
          id="section-timeline-carousel"
          className="scroll-mt-6"
        >
        {/* perspective shell — vista / flip-3d stage */}
        <div
          className="relative isolate mx-auto [perspective:min(1900px,110vw)] [transform-style:preserve-3d] max-sm:pt-2"
          aria-label="timeline cover flow carousel"
        >
          <div
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-[72%] h-[200px] w-[120%] max-w-3xl -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(212,175,55,0.1),transparent_68%)] opacity-60"
          />

          {expandedActive ? (
            <button
              type="button"
              className="absolute inset-0 z-[150] cursor-default bg-black/15"
              onClick={() => carouselDispatch({ type: "collapse" })}
              aria-label={t("timeline.collapse")}
            />
          ) : null}

          <motion.div
            className="relative z-[160] flex min-h-[min(480px,calc(100vh-168px))] cursor-grab items-center justify-center touch-pan-y active:cursor-grabbing sm:min-h-[min(560px,calc(100vh-240px))] [transform-style:preserve-3d]"
            drag={expandedActive ? false : swipeDrag}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.12}
            onDragEnd={onDragEnd}
          >
            {events.map((event, index) => {
              const d = index - focusedIndex;
              if (Math.abs(d) > CAROUSEL_VISIBLE_RADIUS) return null;

              const { rotateY, translateX, translateZ, scale, opacity } = carouselTransform(d);
              const ui = ERA_UI[event.era];
              const Icon = event.icon;
              const isFocused = index === focusedIndex;
              const expanded = expandedActive && isFocused;
              const zIndex = 20 - Math.abs(d) + (isFocused ? 10 : 0);

              const transition = reduceMotion
                ? { duration: 0.15 }
                : { type: "spring" as const, stiffness: 380, damping: 36 };

              return (
                <motion.article
                  key={event.yearKey}
                  initial={false}
                  animate={{
                    rotateY,
                    x: translateX,
                    y: "-50%",
                    translateZ,
                    scale,
                    opacity,
                  }}
                  transition={transition}
                  className="absolute top-1/2 w-[min(calc(100vw-88px),420px)] will-change-transform [transform-style:preserve-3d]"
                  style={{
                    left: "50%",
                    marginLeft: -CARD_HALF_PX,
                    transformOrigin: "center center",
                    zIndex,
                    pointerEvents: Math.abs(d) > 2 && !isFocused ? ("none" as const) : "auto",
                  }}
                >
                  <TimelineCarouselCard
                    event={event}
                    Icon={Icon}
                    ui={ui}
                    expanded={expanded}
                    isFocused={isFocused}
                    onInteract={() => handleInteract(index)}
                    t={t}
                  />
                </motion.article>
              );
            })}
          </motion.div>

          {/* Arrows */}
          <div className="pointer-events-none absolute inset-x-0 top-1/2 z-[220] flex -translate-y-1/2 justify-between px-1 sm:px-4 md:px-10">
            <button
              type="button"
              disabled={focusedIndex <= 0}
              onClick={goPrev}
              className="pointer-events-auto flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/15 bg-black/65 text-white shadow-lg backdrop-blur-md transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-25"
              aria-label="Previous milestone"
            >
              <ChevronLeft className="h-6 w-6" aria-hidden />
            </button>
            <button
              type="button"
              disabled={focusedIndex >= total - 1}
              onClick={goNext}
              className="pointer-events-auto flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/15 bg-black/65 text-white shadow-lg backdrop-blur-md transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-25"
              aria-label="Next milestone"
            >
              <ChevronRight className="h-6 w-6" aria-hidden />
            </button>
          </div>
        </div>

        {/* Era-grouped milestone strip */}
        <div className="relative z-10 mt-10 px-1 py-5 sm:mt-14">
          <div className="mx-auto flex max-w-5xl flex-wrap items-end justify-center gap-x-6 gap-y-8 sm:gap-x-10">
            {eraSegments.map((segment) => {
              const isActiveSegment = segment.indices.includes(focusedIndex);
              return (
                <div key={segment.chipKey} className="flex flex-col items-center gap-2.5">
                  <div className="flex items-center justify-center gap-1.5">
                    {segment.indices.map((idx) => {
                      const ev = events[idx];
                      const Icon = ev.icon;
                      const active = idx === focusedIndex;
                      return (
                        <button
                          key={ev.yearKey}
                          type="button"
                          className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full border transition-colors ${
                            active
                              ? "border-gold/50 bg-gold/25 text-gold"
                              : "border-white/10 bg-white/[0.04] text-muted-foreground hover:border-white/20 hover:bg-white/[0.08]"
                          }`}
                          onClick={() => {
                            carouselDispatch({ type: "jump", index: idx });
                          }}
                          aria-current={active ? true : undefined}
                          aria-label={t(ev.titleKey)}
                        >
                          <Icon className="h-7 w-7" aria-hidden />
                        </button>
                      );
                    })}
                  </div>
                  <button
                    type="button"
                    onClick={() => carouselDispatch({ type: "jump", index: segment.indices[0] })}
                    className={`max-w-[10.5rem] text-balance text-center text-[10px] leading-snug transition-colors sm:max-w-[13rem] sm:text-xs ${
                      isActiveSegment
                        ? "font-medium text-gold/90"
                        : "text-muted-foreground/75 hover:text-muted-foreground"
                    }`}
                  >
                    {t(segment.chipKey)}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
        </div>

        <div
          id="section-timeline-youtube"
          className="scroll-mt-6 pt-14 sm:pt-20"
        >
          <TimelineYouTubeArchive />
        </div>

        <p className="mx-auto mt-16 max-w-3xl pb-12 text-center text-xs leading-relaxed text-muted-foreground/80 sm:mt-20 sm:pb-14">
          {t("timeline.disclaimer")}
        </p>
      </section>
    </div>
  );
}

function TimelineCarouselCard({
  event,
  Icon,
  ui,
  expanded,
  isFocused,
  onInteract,
  t,
}: {
  event: TimelineEvent;
  Icon: LucideIcon;
  ui: (typeof ERA_UI)["origin"];
  expanded: boolean;
  isFocused: boolean;
  onInteract: () => void;
  t: (k: string) => string;
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onInteract();
      }}
      className="group relative w-full text-left outline-none focus-visible:ring-2 focus-visible:ring-gold/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0a0c]"
    >
      <div
        className={`relative overflow-hidden rounded-2xl border p-5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)] backdrop-blur-xl backdrop-saturate-150 transition-[border-color,box-shadow] sm:p-6 ${
          isFocused
            ? `border-white/20 bg-black/62 ${ui.border} shadow-[0_28px_72px_-34px_rgba(212,175,55,0.42),inset_0_1px_0_0_rgba(255,255,255,0.1)] ring-1 ring-white/12`
            : "border-white/15 bg-black/58 hover:border-white/25"
        }`}
      >
        {/* Frosted scrim — improves text contrast over the cover-flow stage */}
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/25 via-[#0a0a0c]/55 to-black/70"
          aria-hidden
        />
        {isFocused ? (
          <div
            className={`pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full blur-3xl ${ui.gradient}`}
            aria-hidden
          />
        ) : (
          <span className="absolute right-4 top-4 z-10 rounded-full border border-white/15 bg-black/55 px-2 py-0.5 text-[9px] uppercase tracking-[0.2em] text-muted-foreground/90 backdrop-blur-md">
            {t("timeline.carouselFocusCue")}
          </span>
        )}

        <div className="relative z-10 flex flex-col gap-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <span
              className={`inline-flex items-center rounded-full border px-3 py-1 font-mono text-xs font-semibold tracking-wide ${ui.pill}`}
            >
              {t(event.yearKey)}
            </span>
            <span className="max-w-[min(100%,11rem)] text-balance break-words rounded-md border border-white/12 bg-black/50 px-2 py-0.5 text-left text-[10px] font-medium uppercase leading-tight tracking-wide text-muted-foreground backdrop-blur-sm sm:max-w-[min(100%,13rem)]">
              {t(event.locKey)}
            </span>
          </div>

          <div className="flex items-start gap-3">
            <div
              className={`relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ring-2 ring-black/45 ${ui.node}`}
            >
              <span className="pointer-events-none absolute inset-0 rounded-full bg-white/[0.12] blur-sm" />
              <Icon className="relative h-6 w-6 text-white" aria-hidden />
            </div>
            <div>
              <h2 className="font-display text-xl font-semibold leading-snug tracking-tight text-foreground sm:text-2xl">
                {t(event.titleKey)}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-foreground/85">{t(event.descKey)}</p>
            </div>
          </div>

          <motion.div
            initial={false}
            animate={{ height: expanded ? "auto" : 0, opacity: expanded ? 1 : 0 }}
            transition={{ duration: expanded ? 0.36 : 0.22, ease: [0.22, 1, 0.36, 1] }}
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
          <span className={`mt-1 text-balance text-[11px] font-medium uppercase leading-snug tracking-wider ${isFocused ? "text-gold/80" : "text-muted-foreground/70"}`}>
            {expanded
              ? t("timeline.collapse")
              : isFocused
                ? t("timeline.expand")
                : t("timeline.carouselTapCentreExpand")}
          </span>
        </div>
      </div>
    </button>
  );
}
