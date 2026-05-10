import { useCallback, useRef } from "react";
import {
  motion,
  useMotionValue,
  useSpring,
} from "motion/react";

const MAX_TILT = 16;
const SPRING = { stiffness: 320, damping: 30, mass: 0.55 };

type Book3DCoverProps = {
  src: string;
  alt: string;
  className?: string;
  /** When true, use pointer cursor — use when the cover is wrapped in a `<Link>`. */
  navigable?: boolean;
  /** When false, skip fake spine/back-plane (use for artwork that already includes spine, e.g. transparent PNG). */
  showSyntheticDepth?: boolean;
};

/**
 * Hero book: perspective card with pointer-driven rotateX/Y and moving specular highlight.
 */
export default function Book3DCover({
  src,
  alt,
  className = "",
  navigable = false,
  showSyntheticDepth = true,
}: Book3DCoverProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const glareRef = useRef<HTMLDivElement>(null);

  const pointerClass = navigable
    ? "cursor-pointer active:cursor-pointer"
    : "cursor-grab active:cursor-grabbing";

  const rotateX = useMotionValue(0);
  const rotateY = useMotionValue(0);
  const springX = useSpring(rotateX, SPRING);
  const springY = useSpring(rotateY, SPRING);

  const setGlare = useCallback((clientX: number, clientY: number) => {
    const el = wrapRef.current;
    const g = glareRef.current;
    if (!el || !g) return;
    const r = el.getBoundingClientRect();
    const x = ((clientX - r.left) / r.width) * 100;
    const y = ((clientY - r.top) / r.height) * 100;
    g.style.background = `radial-gradient(
      120% 90% at ${x}% ${y}%,
      rgba(255, 255, 255, 0.38) 0%,
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
    rotateY.set(nx * 2 * MAX_TILT);
    rotateX.set(-ny * 2 * MAX_TILT);
    setGlare(e.clientX, e.clientY);
  };

  const handlePointerLeave = () => {
    rotateX.set(0);
    rotateY.set(0);
    const g = glareRef.current;
    if (g) {
      g.style.background =
        "radial-gradient(120% 90% at 50% 18%, rgba(255,255,255,0.2) 0%, transparent 55%)";
    }
  };

  const handlePointerEnter = (e: React.PointerEvent) => {
    setGlare(e.clientX, e.clientY);
  };

  return (
    <div
      className={`relative select-none touch-pan-y ${className}`}
      style={{ perspective: "1200px", perspectiveOrigin: "50% 50%" }}
    >
      {showSyntheticDepth ? (
        <>
          <div className="pointer-events-none absolute -inset-10 rounded-[40%] bg-gold/15 blur-[80px]" />
          <div className="pointer-events-none absolute -inset-4 rounded-3xl bg-gradient-to-br from-gold/20 via-transparent to-stone-400/10 opacity-70 blur-2xl" />
        </>
      ) : null}

      {showSyntheticDepth ? (
        <motion.div
          ref={wrapRef}
          className={`relative mx-auto ${pointerClass}`}
          style={{
            rotateX: springX,
            rotateY: springY,
            transformStyle: "preserve-3d",
          }}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.75, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          whileHover={{ scale: 1.02 }}
          onPointerMove={handlePointerMove}
          onPointerLeave={handlePointerLeave}
          onPointerEnter={handlePointerEnter}
        >
          <>
            <div
              className="absolute bottom-[10%] left-4 right-4 top-[12%] rounded-lg bg-black/55 blur-xl"
              style={{ transform: "translateZ(-48px)" }}
              aria-hidden
            />
            <div
              className="absolute bottom-[3%] top-[3%] -left-[10px] w-[18px] rounded-l-md rounded-r-sm opacity-90"
              style={{
                transform: "translateZ(-14px) rotateY(-26deg)",
                transformOrigin: "right center",
                background:
                  "linear-gradient(90deg, rgba(15,15,22,0.95) 0%, rgba(40,38,52,0.75) 45%, rgba(80,78,92,0.35) 100%)",
                boxShadow: "inset -2px 0 8px rgba(0,0,0,0.45)",
              }}
              aria-hidden
            />
            <div
              className="relative overflow-hidden rounded-lg shadow-[0_25px_50px_-12px_rgba(0,0,0,0.55),0_0_0_1px_rgba(255,255,255,0.06)_inset]"
              style={{
                transform: "translateZ(12px)",
                transformStyle: "preserve-3d",
              }}
            >
              <img
                src={src}
                alt={alt}
                className="relative z-[1] block h-auto max-h-[min(92vh,520px)] w-56 md:w-64 lg:w-72 object-contain"
                draggable={false}
              />
              <div
                className="pointer-events-none absolute inset-0 z-[2] rounded-lg opacity-70 mix-blend-soft-light"
                style={{
                  background:
                    "linear-gradient(125deg, rgba(255,255,255,0.22) 0%, transparent 42%, transparent 62%, rgba(0,0,0,0.12) 100%)",
                }}
                aria-hidden
              />
              <div
                ref={glareRef}
                className="pointer-events-none absolute inset-0 z-[3] rounded-lg mix-blend-overlay opacity-95 transition-opacity duration-300"
                style={{
                  background:
                    "radial-gradient(120% 90% at 50% 18%, rgba(255,255,255,0.2) 0%, transparent 55%)",
                }}
                aria-hidden
              />
              <div
                className="pointer-events-none absolute inset-0 z-[4] rounded-lg bg-gradient-to-t from-black/10 via-transparent to-white/[0.05]"
                aria-hidden
              />
            </div>
            <div
              className="pointer-events-none absolute inset-0 rounded-lg"
              style={{
                transform: "translateZ(20px)",
                boxShadow:
                  "0 0 0 1px rgba(255,255,255,0.18), 0 0 40px rgba(247,147,26,0.12)",
              }}
              aria-hidden
            />
          </>
        </motion.div>
      ) : (
        <div className="relative mx-auto w-fit pb-14">
          {/* Ground shadow on page — not rotated with the book */}
          <div
            className="pointer-events-none absolute left-1/2 top-[82%] z-0 w-[min(320px,92vw)] max-w-none -translate-x-1/2"
            style={{
              height: "5.5rem",
              background:
                "radial-gradient(ellipse 72% 48% at 50% 42%, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.28) 38%, rgba(0,0,0,0.08) 58%, transparent 74%)",
              filter: "blur(18px)",
              transform: "translateY(24%) scaleX(1.12)",
            }}
            aria-hidden
          />
          <div
            className="pointer-events-none absolute left-1/2 top-[86%] z-0 w-[min(360px,96vw)] -translate-x-1/2"
            style={{
              height: "4rem",
              background:
                "radial-gradient(ellipse 80% 40% at 50% 45%, rgba(0,0,0,0.22) 0%, transparent 68%)",
              filter: "blur(10px)",
              transform: "translateY(18%) scaleX(1.08)",
            }}
            aria-hidden
          />
          <motion.div
            ref={wrapRef}
            className={`relative z-10 mx-auto ${pointerClass}`}
            style={{
              rotateX: springX,
              rotateY: springY,
              transformStyle: "preserve-3d",
            }}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.75, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            whileHover={{ scale: 1.02 }}
            onPointerMove={handlePointerMove}
            onPointerLeave={handlePointerLeave}
            onPointerEnter={handlePointerEnter}
          >
            <div
              className="relative inline-block bg-transparent"
              style={{
                transform: "translateZ(12px)",
                transformStyle: "preserve-3d",
                WebkitBackfaceVisibility: "hidden",
                backfaceVisibility: "hidden",
              }}
            >
              <img
                src={src}
                alt={alt}
                draggable={false}
                className="relative z-[1] block h-auto max-h-[min(92vh,520px)] w-56 md:w-64 lg:w-72 object-contain bg-transparent"
                style={{
                  WebkitBackfaceVisibility: "hidden",
                  backfaceVisibility: "hidden",
                }}
              />
              <div
                ref={glareRef}
                className="pointer-events-none absolute inset-0 z-[2] mix-blend-soft-light opacity-[0.55]"
                style={{
                  maskImage: `url("${src}")`,
                  WebkitMaskImage: `url("${src}")`,
                  maskSize: "contain",
                  WebkitMaskSize: "contain",
                  maskPosition: "center",
                  WebkitMaskPosition: "center",
                  maskRepeat: "no-repeat",
                  WebkitMaskRepeat: "no-repeat",
                }}
                aria-hidden
              />
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
