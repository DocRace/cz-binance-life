import { useEffect, useState } from "react";
import { Link } from "react-router";
import { motion } from "motion/react";
import { BookOpen, ChevronRight, Trophy } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  fetchRankConfig,
  isRankCampaignLive,
} from "../../lib/chronicle/rankClient";
import ChronicleBookCover from "./ChronicleBookCover";
import bookCoverHero from "../../assets/book-cover-hero.png";
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
  const [rankLive, setRankLive] = useState(false);
  const [faceIdx, setFaceIdx] = useState(0);
  const face = SHOWCASE_FACES[faceIdx];
  const keywords = t(`home.chronicleFaceKw.${face.kwKey}`)
    .split("·")
    .map((part) => part.trim())
    .filter(Boolean);

  useEffect(() => {
    void fetchRankConfig().then((cfg) => setRankLive(isRankCampaignLive(cfg)));
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
      className={`relative overflow-hidden rounded-2xl border border-[#c9a76a]/40 ${className}`}
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
        className="pointer-events-none absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${bookCoverHero})` }}
        animate={{ scale: [1.03, 1.08], x: ["0%", "-1.5%"], y: ["0%", "-1%"] }}
        transition={{ duration: 18, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(110deg, rgba(26,23,20,0.94) 0%, rgba(26,23,20,0.78) 48%, rgba(26,23,20,0.4) 100%), linear-gradient(to top, rgba(26,23,20,0.8), transparent 42%)",
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

      <div className="relative z-[1] grid items-center gap-8 p-5 sm:p-7 md:grid-cols-[1.12fr_0.88fr] md:gap-10 md:p-10">
        <div className="min-w-0">
          <p className="mb-3 inline-flex rounded-full border border-[#c9a76a]/40 bg-[#1a1714]/45 px-3 py-1 text-[10px] font-tech uppercase tracking-[0.2em] text-gold">
            {t("home.chronicleBannerKicker")}
          </p>
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-gold">
            {t("home.chronicleBannerBrand")}
          </p>
          <h2 className="mb-3 max-w-[16ch] font-display text-[2rem] font-medium leading-[1.12] tracking-tight text-[#f5f1e8] sm:text-4xl md:text-5xl">
            {t("home.chronicleBannerTitle")}
          </h2>
          <p className="mb-6 max-w-xl text-sm leading-[1.65] text-[#f5f1e8]/74 sm:text-base">
            {t("home.chronicleBannerDesc")}
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <Link
              to="/club/chronicle"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-gold/95 px-6 py-3.5 text-sm font-body font-medium tracking-wide text-primary-foreground shadow-sm transition-colors hover:bg-gold no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1a1714]"
            >
              <BookOpen className="h-4 w-4 shrink-0" aria-hidden />
              {t("home.chronicleBannerCta")}
              <ChevronRight className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
            </Link>
            {rankLive ? (
              <Link
                to="/club/chronicle/rank"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-gold/50 bg-white/5 px-6 py-3.5 text-sm font-body font-medium tracking-wide text-gold transition-colors hover:bg-gold/10 no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1a1714]"
              >
                <Trophy className="h-4 w-4 shrink-0" aria-hidden />
                {t("home.chronicleRankCta")}
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
            className="max-w-[280px] sm:max-w-[320px] lg:max-w-[360px]"
          />
        </div>
      </div>
    </motion.section>
  );
}
