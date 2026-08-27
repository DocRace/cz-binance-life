import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useSpring,
} from "motion/react";
import { useTranslation } from "react-i18next";
import {
  DEFAULT_AVATAR_GENDER,
  coverHasDarkBylineZone,
  rolePackSrc,
  type AvatarGenderId,
} from "../../lib/chronicle/roleArt";
import { truncateAuthorName } from "../../lib/chronicle/authorName";
import type { AvatarRoleId } from "../../lib/chronicle/roles";

const MAX_TILT = 12;
const SPRING = { stiffness: 280, damping: 28, mass: 0.5 };
const BASE_ROTATE_Y = 28;
const BASE_ROTATE_X = 2;
const THICKNESS = 50;
/** Cover face design size — typography is composed here, then scaled with the book. */
const DESIGN_COVER_W = 228;
const DESIGN_COVER_H = Math.round((DESIGN_COVER_W * 4) / 3);

function fitOneLine(el: HTMLElement | null) {
  if (!el) return;
  el.style.fontSize = "";
  const { scrollWidth, clientWidth } = el;
  if (scrollWidth <= clientWidth + 0.5) return;
  const base = parseFloat(getComputedStyle(el).fontSize);
  if (!Number.isFinite(base) || base <= 0) return;
  el.style.fontSize = `${Math.max(8, base * (clientWidth / scrollWidth) * 0.98)}px`;
}

function useFitOneLine<T extends HTMLElement>(text: string) {
  const ref = useRef<T | null>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    let cancelled = false;
    const run = () => {
      if (!cancelled) fitOneLine(el);
    };
    run();
    void document.fonts.ready.then(run);
    return () => {
      cancelled = true;
    };
  }, [text]);
  return ref;
}

type Props = {
  authorName: string;
  roleId: AvatarRoleId | null;
  gender?: AvatarGenderId;
  /** Up to 3 life keywords shown under the author byline. */
  keywords?: string[];
  className?: string;
};

type CoverFace = {
  art: string | null;
  byline: string;
  corner: string;
  keywords: string[];
  darkByline: boolean;
};

/**
 * Closed book without a full back board. Cube-face placement for
 * spine / page-edge / top / bottom so the block is not hollow when tilted.
 */
export default function ChronicleBookCover({
  authorName,
  roleId,
  gender = DEFAULT_AVATAR_GENDER,
  keywords = [],
  className = "",
}: Props) {
  const { t } = useTranslation();
  const roleLabel = roleId ? t(`chronicle.roles.${roleId}.name`) : "";
  /** Personal author name — prefers under-title byline when present. */
  const signature = truncateAuthorName(authorName);
  /** Archetype label — corner mark when author is shown under the title. */
  const roleByline = roleLabel || t("chronicle.anonymousAuthor");
  const underTitle = signature || roleByline;
  const cornerLabel = signature ? roleByline : "";
  const art = roleId ? rolePackSrc(roleId, gender) : null;
  const title = t("chronicle.bookTitle");
  const publisher = t("chronicle.bookPublisher");
  const darkByline = coverHasDarkBylineZone(roleId, gender);
  const keywordLine = keywords.map((k) => `${k || ""}`.trim()).filter(Boolean).slice(0, 3);
  const halfT = THICKNESS / 2;

  /**
   * Keep art + labels in lockstep: only commit the new face when the
   * incoming pack image is decoded (or immediately when there is no art).
   */
  const [face, setFace] = useState<CoverFace>(() => ({
    art,
    byline: underTitle,
    corner: cornerLabel,
    keywords: keywordLine,
    darkByline,
  }));

  useEffect(() => {
    let cancelled = false;
    const next: CoverFace = {
      art,
      byline: underTitle,
      corner: cornerLabel,
      keywords: keywordLine,
      darkByline,
    };
    if (!art) {
      setFace(next);
      return;
    }
    const img = new Image();
    const commit = () => {
      if (!cancelled) setFace(next);
    };
    img.onload = commit;
    img.onerror = commit;
    img.src = art;
    if (img.complete && img.naturalWidth > 0) commit();
    return () => {
      cancelled = true;
      img.onload = null;
      img.onerror = null;
    };
  }, [art, underTitle, cornerLabel, keywordLine.join("|"), darkByline]);

  const wrapRef = useRef<HTMLDivElement>(null);
  const glareRef = useRef<HTMLDivElement>(null);
  const [halfW, setHalfW] = useState(DESIGN_COVER_W / 2);
  const [halfH, setHalfH] = useState(DESIGN_COVER_H / 2);
  const coverScale = halfW * 2 / DESIGN_COVER_W;
  const titleRef = useFitOneLine<HTMLHeadingElement>(title);
  const bylineRef = useFitOneLine<HTMLParagraphElement>(face.byline);
  const cornerRef = useFitOneLine<HTMLParagraphElement>(face.corner);

  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const update = () => {
      setHalfW(el.offsetWidth / 2);
      setHalfH(el.offsetHeight / 2);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const rotateX = useMotionValue(BASE_ROTATE_X);
  const rotateY = useMotionValue(BASE_ROTATE_Y);
  const springX = useSpring(rotateX, SPRING);
  const springY = useSpring(rotateY, SPRING);
  const shellTransform = useMotionTemplate`rotateX(${springX}deg) rotateY(${springY}deg)`;

  const setGlare = useCallback((clientX: number, clientY: number) => {
    const el = wrapRef.current;
    const g = glareRef.current;
    if (!el || !g) return;
    const r = el.getBoundingClientRect();
    const x = ((clientX - r.left) / r.width) * 100;
    const y = ((clientY - r.top) / r.height) * 100;
    g.style.background = `radial-gradient(
      120% 90% at ${x}% ${y}%,
      rgba(255, 255, 255, 0.36) 0%,
      rgba(255, 255, 255, 0.08) 28%,
      transparent 58%
    )`;
  }, []);

  const handlePointerMove = (e: React.PointerEvent) => {
    const el = wrapRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const nx = (e.clientX - r.left) / r.width - 0.5;
    const ny = (e.clientY - r.top) / r.height - 0.5;
    rotateY.set(BASE_ROTATE_Y + nx * 2 * MAX_TILT);
    rotateX.set(BASE_ROTATE_X - ny * 2 * MAX_TILT);
    setGlare(e.clientX, e.clientY);
  };

  const handlePointerLeave = () => {
    rotateX.set(BASE_ROTATE_X);
    rotateY.set(BASE_ROTATE_Y);
    const g = glareRef.current;
    if (g) {
      g.style.background =
        "radial-gradient(120% 90% at 42% 18%, rgba(255,255,255,0.18) 0%, transparent 55%)";
    }
  };

  const sideBase: React.CSSProperties = {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: "50%",
    width: THICKNESS,
    marginLeft: -halfT,
  };

  const pageFaceBg =
    "repeating-linear-gradient(180deg, rgba(90,70,40,0.1) 0 1px, transparent 1px 5px), linear-gradient(90deg, #b9ad93 0%, #f7f2e8 20%, #ebe3d2 55%, #f3eee3 80%, #cfc3ab 100%)";

  const capBase: React.CSSProperties = {
    position: "absolute",
    left: 0,
    right: 0,
    height: THICKNESS,
    top: "50%",
    marginTop: -halfT,
    background: pageFaceBg,
  };

  return (
    <div
      className={`relative mx-auto w-full max-w-[360px] px-10 pb-8 pt-4 ${className}`}
      style={{ perspective: "1100px", perspectiveOrigin: "50% 40%" }}
    >
      <div
        className="pointer-events-none absolute bottom-1 left-1/2 z-0 h-10 w-[70%] -translate-x-1/2 rounded-[100%] bg-black/50"
        style={{ filter: "blur(14px)" }}
        aria-hidden
      />

      <motion.div
        ref={wrapRef}
        className="relative z-[1] mx-auto aspect-[3/4] w-[min(100%,228px)] cursor-grab touch-pan-y active:cursor-grabbing"
        style={{
          transform: shellTransform,
          transformStyle: "preserve-3d",
          WebkitTransformStyle: "preserve-3d",
        }}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        onPointerEnter={(e) => setGlare(e.clientX, e.clientY)}
      >
        {/* Spine (left face) */}
        <div
          style={{
            ...sideBase,
            transform: `rotateY(-90deg) translateZ(${halfW}px)`,
            background: "linear-gradient(90deg, #cfc6b4 0%, #f2eee5 42%, #e8e1d4 100%)",
            boxShadow:
              "inset -3px 0 10px rgba(0,0,0,0.2), inset 1px 0 0 rgba(255,255,255,0.4)",
          }}
          aria-hidden
        >
          {/* Horizontal line type rotated along the spine (reads as a normal line, not stacked glyphs) */}
          <div className="relative h-full w-full overflow-hidden">
            <span
              className="font-display absolute left-1/2 top-[22%] whitespace-nowrap font-medium leading-none text-gold [transform:translate(-50%,-50%)_rotate(-90deg)]"
              style={{ fontSize: `${11 * coverScale}px` }}
            >
              {title}
            </span>
            <span
              className="font-cjk absolute left-1/2 top-1/2 max-w-[180px] truncate whitespace-nowrap font-medium leading-none text-[#1a1a1a] [transform:translate(-50%,-50%)_rotate(-90deg)]"
              style={{ fontSize: `${10 * coverScale}px` }}
            >
              {face.byline}
            </span>
            <span
              className="font-body absolute left-1/2 top-[78%] max-w-[150px] truncate whitespace-nowrap font-normal leading-none text-[#1a1a1a]/55 [transform:translate(-50%,-50%)_rotate(-90deg)]"
              style={{ fontSize: `${8 * coverScale}px` }}
            >
              {publisher}
            </span>
          </div>
        </div>

        {/* Page edge (right face) */}
        <div
          className="pointer-events-none"
          style={{
            ...sideBase,
            top: "2.5%",
            bottom: "2.5%",
            transform: `rotateY(90deg) translateZ(${halfW}px)`,
            background: pageFaceBg,
          }}
          aria-hidden
        />

        {/* Top page face */}
        <div
          className="pointer-events-none"
          style={{
            ...capBase,
            transform: `rotateX(90deg) translateZ(${halfH}px)`,
          }}
          aria-hidden
        />

        {/* Bottom page face */}
        <div
          className="pointer-events-none"
          style={{
            ...capBase,
            transform: `rotateX(-90deg) translateZ(${halfH}px)`,
          }}
          aria-hidden
        />

        {/* Front cover only — no full back board */}
        <div
          id="chronicle-share-card"
          className="absolute inset-0 overflow-hidden rounded-[3px] bg-[#f4f1ea]"
          style={{
            transform: `translateZ(${halfT}px)`,
            boxShadow:
              "0 28px 48px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.45)",
          }}
        >
          <div
            className="pointer-events-none absolute inset-y-0 left-0 z-[7] w-3.5"
            style={{
              background:
                "linear-gradient(90deg, rgba(0,0,0,0.28) 0%, rgba(0,0,0,0.08) 50%, transparent 100%)",
            }}
            aria-hidden
          />
          <div
            className="pointer-events-none absolute inset-0 z-[5] opacity-60 mix-blend-soft-light"
            style={{
              background:
                "linear-gradient(125deg, rgba(255,255,255,0.45) 0%, transparent 38%, transparent 64%, rgba(0,0,0,0.1) 100%)",
            }}
            aria-hidden
          />
          <div
            ref={glareRef}
            className="pointer-events-none absolute inset-0 z-[6] mix-blend-overlay opacity-90"
            style={{
              background:
                "radial-gradient(120% 90% at 42% 18%, rgba(255,255,255,0.18) 0%, transparent 55%)",
            }}
            aria-hidden
          />

          <div className="relative z-[1] h-full overflow-hidden">
            {/* Cream board shows through pack PNG alpha; slight bleed hides subpixel edge gaps */}
            {face.art ? (
              <img
                key={face.art}
                src={face.art}
                alt=""
                draggable={false}
                className="absolute -inset-[1px] h-[calc(100%+2px)] w-[calc(100%+2px)] max-w-none object-cover object-top"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                {t("chronicle.needRole")}
              </div>
            )}

            <div
              className="pointer-events-none absolute left-0 top-0 z-[2] origin-top-left"
              style={{
                width: DESIGN_COVER_W,
                height: DESIGN_COVER_H,
                transform: `scale(${coverScale})`,
              }}
            >
              {face.corner ? (
                <p
                  ref={cornerRef}
                  className="font-cjk absolute left-3 top-3 max-w-[70%] truncate whitespace-nowrap text-left text-[0.95rem] font-medium leading-normal text-[#1a1a1a]"
                >
                  {face.corner}
                </p>
              ) : null}

              <div className="absolute inset-x-0 bottom-0 px-3 pb-4 pt-10 text-right">
                <h2
                  ref={titleRef}
                  className="font-display whitespace-nowrap text-[1.75rem] font-medium leading-[1.05] text-gold"
                >
                  {title}
                </h2>
                <p
                  ref={bylineRef}
                  className={`font-cjk mt-2 whitespace-nowrap text-[1.15rem] font-medium leading-none ${
                    face.darkByline ? "text-white" : "text-[#1a1a1a]"
                  }`}
                >
                  {face.byline}
                </p>
                {face.keywords.length > 0 ? (
                  <p
                    className={`font-cjk mt-2 text-[0.72rem] font-medium leading-snug tracking-wide ${
                      face.darkByline ? "text-white/85" : "text-[#1a1a1a]/75"
                    }`}
                  >
                    {face.keywords.join(" · ")}
                  </p>
                ) : null}
                <p
                  className={`font-cjk mt-2 text-[0.58rem] leading-tight ${
                    face.darkByline ? "text-white/55" : "text-[#1a1a1a]/50"
                  }`}
                >
                  {t("chronicle.coverPartners")}
                </p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
