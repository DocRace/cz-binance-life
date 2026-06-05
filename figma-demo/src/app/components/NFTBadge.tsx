import { motion } from "motion/react";
import { useTranslation } from "react-i18next";

interface NFTBadgeProps {
  tokenId: string;
  type: "original" | "redeemed" | "principle";
  /** Token or collection artwork from IPDEX nft-balance / token detail. */
  imageUrl?: string;
  displayName?: string;
  /** Free STANDARD tier — commemorative member badge, not a redeemable premium voucher. */
  standardMember?: boolean;
  /** Attendance NFT minted after on-site redemption (stub / ticket root)—distinct label vs generic “attendance commemorative”. */
  stubTicket?: boolean;
  size?: "sm" | "md" | "lg";
  animated?: boolean;
  principleName?: string;
  principleColor?: "gold" | "cyan" | "purple" | "green" | "pink";
}

export default function NFTBadge({
  tokenId,
  type,
  imageUrl,
  displayName,
  standardMember = false,
  stubTicket = false,
  size = "md",
  animated = true,
  principleName,
  principleColor = "cyan",
}: NFTBadgeProps) {
  const { t } = useTranslation();
  const sizeClasses = {
    sm: "w-32 h-40",
    md: "w-48 h-60",
    lg: "w-64 h-80"
  };

  const principleGradients = {
    gold: "from-gold via-gold-light to-gold-dark",
    cyan: "from-stone-400 via-stone-600 to-stone-700",
    purple: "from-stone-600 via-stone-500 to-stone-700",
    green: "from-stone-500 via-stone-600 to-stone-700",
    pink: "from-stone-500 via-stone-400 to-stone-600",
  };

  const standardMode = type === "original" && standardMember;
  const bgGradient =
    standardMode
      ? "from-stone-500 via-stone-600 to-stone-800"
      : type === "original"
        ? "from-gold via-gold-light to-gold-dark"
        : type === "principle"
          ? principleGradients[principleColor]
          : "from-muted via-card to-muted";

  const stubMode = type === "redeemed" && stubTicket;
  const badgeType =
    standardMode
      ? t("nftBadge.typeStandard")
      : type === "original"
        ? t("nftBadge.typeReservation")
        : type === "principle"
          ? t("nftBadge.typePrinciple")
          : stubMode
            ? t("nftBadge.typeStub")
            : t("nftBadge.typeAttendance");

  const badgeTitle =
    standardMode
      ? t("nftBadge.titleStandard")
      : type === "original"
        ? t("nftBadge.titleReservation")
        : type === "principle"
          ? t("nftBadge.titlePrinciple")
          : stubMode
            ? t("nftBadge.titleStub")
            : t("nftBadge.titleAttendance");

  const badgeSubtitle =
    standardMode
      ? t("nftBadge.subtitleStandard")
      : type === "original"
        ? t("nftBadge.subtitleReservation")
        : type === "principle"
          ? principleName || t("nftBadge.subtitlePrincipleFallback")
          : stubMode
            ? t("nftBadge.subtitleStub")
            : t("nftBadge.subtitleAttendance");

  const artUrl = imageUrl?.trim() || "";
  const hasArt = artUrl.length > 0;

  const BadgeContent = (
    <div className={`${sizeClasses[size]} relative rounded-2xl overflow-hidden`}>
      {hasArt ? (
        <>
          <img src={artUrl} alt={displayName || badgeTitle} className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-black/10" />
        </>
      ) : (
        <div className={`absolute inset-0 bg-gradient-to-br ${bgGradient}`} />
      )}

      {/* Hexagon pattern */}
      <div className={`absolute inset-0 ${hasArt ? "opacity-[0.07]" : "opacity-10"}`}>
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id={`hexagons-${tokenId}`} x="0" y="0" width="50" height="43.4" patternUnits="userSpaceOnUse">
              <polygon points="25,0 50,14.43 50,28.87 25,43.3 0,28.87 0,14.43" fill="none" stroke="currentColor" strokeWidth="0.5"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill={`url(#hexagons-${tokenId})`} />
        </svg>
      </div>

      {!hasArt && type !== "redeemed" ? (
        <div className="absolute inset-0 bg-gradient-to-t from-transparent via-white/5 to-white/20" />
      ) : null}

      <div className="relative h-full p-4 flex flex-col justify-between text-white">
        <div>
          <div className="flex items-center justify-between mb-2 gap-2">
            <span className="text-[10px] font-tech uppercase opacity-80">{badgeType}</span>
          </div>
          <h3 className="font-display text-base leading-snug line-clamp-2 mb-0.5">
            {displayName?.trim() || badgeTitle}
          </h3>
          <p className="text-[10px] opacity-75 line-clamp-2">{badgeSubtitle}</p>
        </div>

        {!hasArt ? (
          <div className="flex items-center justify-center py-2">
            <div className={`relative ${size === "lg" ? "w-24 h-24" : size === "md" ? "w-20 h-20" : "w-16 h-16"}`}>
              <div className="absolute inset-0 bg-white/20 backdrop-blur-sm rounded-xl transform rotate-6" />
              <div className="absolute inset-0 bg-white/30 backdrop-blur-sm rounded-xl flex items-center justify-center">
                <svg className={`${size === "lg" ? "w-12 h-12" : size === "md" ? "w-10 h-10" : "w-8 h-8"}`} viewBox="0 0 24 24" fill="currentColor">
                  <path d="M4 6h16v12H4z" opacity="0.3" />
                  <path d="M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 4h5v8l-2.5-1.5L6 12V4z" />
                </svg>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 min-h-[8px]" />
        )}

        <div>
          <p className="text-center text-lg font-tech tracking-wider mb-1">#{tokenId}</p>
          <div className="h-px bg-white/25 mb-1.5" />
          <div className="flex items-center justify-between text-[10px] opacity-75">
            <span>{t("nftBadge.seriesFooter")}</span>
            <span className="font-tech">{t("nftBadge.nftChip")}</span>
          </div>
        </div>
      </div>

      <div className="absolute inset-0 rounded-2xl border border-white/20 pointer-events-none" />
    </div>
  );

  if (!animated) {
    return BadgeContent;
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8, rotateY: -30 }}
      animate={{ opacity: 1, scale: 1, rotateY: 0 }}
      transition={{ duration: 0.6, type: "spring" }}
      whileHover={{ scale: 1.05, rotateY: 5 }}
      style={{ transformStyle: "preserve-3d" }}
    >
      {BadgeContent}
    </motion.div>
  );
}
