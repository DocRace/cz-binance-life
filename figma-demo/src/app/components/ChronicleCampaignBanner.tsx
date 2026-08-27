import { useEffect, useState } from "react";
import { Link } from "react-router";
import { motion } from "motion/react";
import { BookOpen, ListOrdered } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  fetchRankConfig,
  isRankCampaignLive,
} from "../../lib/chronicle/rankClient";
import ChronicleBookCover from "./ChronicleBookCover";
import czPortraitBanner from "../../assets/cz-portrait-banner.png";
import type { AvatarGenderId } from "../../lib/chronicle/roleArt";
import type { AvatarRoleId } from "../../lib/chronicle/roles";

type ChronicleCampaignBannerProps = {
  className?: string;
};

const SHOWCASE_FACES: Array<{
  roleId: AvatarRoleId;
  gender: AvatarGenderId;
  author: string;
  kwKey: "founder" | "creator" | "degen" | "whale" | "diamondHands" | "whiteHat";
}> = [
  { roleId: "founder", gender: "male", author: "Ava", kwKey: "founder" },
  { roleId: "creator", gender: "female", author: "Ava", kwKey: "creator" },
  { roleId: "degen", gender: "male", author: "Kai", kwKey: "degen" },
  { roleId: "whale", gender: "male", author: "Kai", kwKey: "whale" },
  { roleId: "diamond-hands", gender: "male", author: "Ava", kwKey: "diamondHands" },
  { roleId: "white-hat", gender: "male", author: "Ava", kwKey: "whiteHat" },
];

/** Shared “My Binance Life” campaign strip used on Home and Join. */
export default function ChronicleCampaignBanner({ className = "" }: ChronicleCampaignBannerProps) {
  const { t } = useTranslation();
  const [rankLive, setRankLive] = useState(true);
  const [faceIdx, setFaceIdx] = useState(0);
  const face = SHOWCASE_FACES[faceIdx];
  const keywords = t(`home.chronicleFaceKw.${face.kwKey}`)
    .split("·")
    .map((part) => part.trim())
    .filter(Boolean);

  useEffect(() => {
    void fetchRankConfig().then((cfg) => {
      if (cfg) setRankLive(isRankCampaignLive(cfg));
    });
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => {
      setFaceIdx((i) => (i + 1) % SHOWCASE_FACES.length);
    }, 2600);
    return () => window.clearInterval(id);
  }, []);

  return (
    <motion.section
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55 }}
      className={`relative overflow-hidden rounded-2xl border border-[#c9a76a]/40 md:aspect-video md:min-h-[22rem] ${className}`}
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 55% at 80% 8%, rgba(201,167,106,0.2), transparent 55%), radial-gradient(ellipse 70% 60% at 8% 92%, rgba(92,84,76,0.55), transparent 50%), linear-gradient(160deg, #1a1714 0%, #2c2824 48%, #3d3832 100%)",
        }}
        aria-hidden
      />
      <motion.div
        className="pointer-events-none absolute inset-0 origin-top bg-cover bg-[center_8%] opacity-[0.56] contrast-[1.06] brightness-[0.88] md:left-[14%] md:bg-[50%_18%] md:opacity-[0.5]"
        style={{
          backgroundImage: `url(${czPortraitBanner})`,
          WebkitMaskImage:
            "linear-gradient(90deg, transparent 0%, rgba(0,0,0,0.38) 18%, #000 36%, #000 82%, rgba(0,0,0,0.4) 93%, transparent 100%), linear-gradient(180deg, transparent 0%, #000 16%, #000 68%, transparent 100%)",
          maskImage:
            "linear-gradient(90deg, transparent 0%, rgba(0,0,0,0.38) 18%, #000 36%, #000 82%, rgba(0,0,0,0.4) 93%, transparent 100%), linear-gradient(180deg, transparent 0%, #000 16%, #000 68%, transparent 100%)",
          WebkitMaskComposite: "source-in",
          maskComposite: "intersect",
        }}
        animate={{ scale: [1.01, 1.035], x: ["0%", "-0.6%"] }}
        transition={{ duration: 18, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(90deg, rgba(26,23,20,0.88) 0%, rgba(26,23,20,0.52) 38%, rgba(26,23,20,0.2) 66%, rgba(26,23,20,0.42) 100%)",
        }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-50"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.018) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.018) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          maskImage: "linear-gradient(to bottom, rgba(0,0,0,0.5), transparent 85%)",
        }}
        aria-hidden
      />

      <div className="relative z-[1] grid h-full items-center gap-6 p-5 sm:p-7 md:grid-cols-[1.12fr_0.88fr] md:gap-8 md:p-8 lg:p-10">
        <div className="min-w-0">
          <p className="mb-3 inline-flex rounded-full border border-[#c9a76a]/40 bg-[#1a1714]/45 px-3 py-1 text-[10px] font-tech uppercase tracking-[0.2em] text-gold">
            {t("home.chronicleBannerKicker")}
          </p>
          <h2 className="mb-3 max-w-[16ch] font-display text-[2rem] font-medium leading-[1.12] tracking-tight text-[#f5f1e8] sm:text-4xl md:text-[2.5rem] lg:text-5xl">
            {t("home.chronicleBannerTitle")}
          </h2>
          <p className="mb-5 max-w-xl text-sm leading-[1.65] text-[#f5f1e8]/74 sm:text-base">
            {t("home.chronicleBannerDesc")}
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <Link
              to="/club/chronicle"
              className="relative inline-flex w-full items-center justify-center rounded-full bg-gold/95 px-6 py-3.5 text-sm font-body font-medium tracking-wide text-primary-foreground shadow-sm transition-colors hover:bg-gold no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1a1714] sm:w-auto sm:min-w-[14.5rem]"
            >
              <BookOpen className="pointer-events-none absolute left-5 top-1/2 h-4 w-4 -translate-y-1/2" aria-hidden />
              <span>{t("home.chronicleBannerCta")}</span>
            </Link>
            {rankLive ? (
              <Link
                to="/club/chronicle/rank"
                className="relative inline-flex w-full items-center justify-center rounded-full border border-gold/50 bg-white/5 px-6 py-3.5 text-sm font-body font-medium tracking-wide text-gold transition-colors hover:bg-gold/10 no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1a1714] sm:w-auto sm:min-w-[14.5rem]"
              >
                <ListOrdered className="pointer-events-none absolute left-5 top-1/2 h-4 w-4 -translate-y-1/2" aria-hidden />
                <span>{t("home.chronicleRankCta")}</span>
              </Link>
            ) : null}
          </div>
        </div>

        <div className="flex justify-center lg:justify-end">
          <ChronicleBookCover
            authorName={face.author}
            roleId={face.roleId}
            gender={face.gender}
            keywords={keywords}
            className="max-w-[240px] sm:max-w-[280px] md:max-w-[300px] lg:max-w-[320px]"
          />
        </div>
      </div>
    </motion.section>
  );
}
