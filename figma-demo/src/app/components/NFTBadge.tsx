import { motion } from "motion/react";
import { useTranslation } from "react-i18next";

interface NFTBadgeProps {
  tokenId: string;
  type: "original" | "redeemed" | "principle";
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

  const bgGradient =
    type === "original"
      ? "from-gold via-gold-light to-gold-dark"
      : type === "principle"
      ? principleGradients[principleColor]
      : "from-muted via-card to-muted";

  const stubMode = type === "redeemed" && stubTicket;
  const badgeType =
    type === "original"
      ? t("nftBadge.typeReservation")
      : type === "principle"
        ? t("nftBadge.typePrinciple")
        : stubMode
          ? t("nftBadge.typeStub")
          : t("nftBadge.typeAttendance");

  const badgeTitle =
    type === "original"
      ? t("nftBadge.titleReservation")
      : type === "principle"
        ? t("nftBadge.titlePrinciple")
        : stubMode
          ? t("nftBadge.titleStub")
          : t("nftBadge.titleAttendance");

  const badgeSubtitle =
    type === "original"
      ? t("nftBadge.subtitleReservation")
      : type === "principle"
        ? principleName || t("nftBadge.subtitlePrincipleFallback")
        : stubMode
          ? t("nftBadge.subtitleStub")
          : t("nftBadge.subtitleAttendance");

  const BadgeContent = (
    <div className={`${sizeClasses[size]} relative rounded-2xl overflow-hidden`}>
      {/* Background gradient */}
      <div className={`absolute inset-0 bg-gradient-to-br ${bgGradient}`} />

      {/* Hexagon pattern */}
      <div className="absolute inset-0 opacity-10">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id={`hexagons-${tokenId}`} x="0" y="0" width="50" height="43.4" patternUnits="userSpaceOnUse">
              <polygon points="25,0 50,14.43 50,28.87 25,43.3 0,28.87 0,14.43" fill="none" stroke="currentColor" strokeWidth="0.5"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill={`url(#hexagons-${tokenId})`} />
        </svg>
      </div>

      {/* Glow effect */}
      {type !== "redeemed" && (
        <div className="absolute inset-0 bg-gradient-to-t from-transparent via-white/5 to-white/20" />
      )}

      {/* Content */}
      <div className="relative h-full p-6 flex flex-col justify-between">
        {/* Top section */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-tech opacity-70">
              {badgeType}
            </span>
            <div className="w-8 h-8 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z" />
              </svg>
            </div>
          </div>

          <h3 className="font-display text-lg mb-1">
            {badgeTitle}
          </h3>
          <p className="text-xs opacity-70">
            {badgeSubtitle}
          </p>
        </div>

        {/* Middle section - Book icon */}
        <div className="flex items-center justify-center">
          <div className={`relative ${size === 'lg' ? 'w-24 h-24' : size === 'md' ? 'w-20 h-20' : 'w-16 h-16'}`}>
            <div className="absolute inset-0 bg-white/20 backdrop-blur-sm rounded-xl transform rotate-6" />
            <div className="absolute inset-0 bg-white/30 backdrop-blur-sm rounded-xl flex items-center justify-center">
              <svg className={`${size === 'lg' ? 'w-12 h-12' : size === 'md' ? 'w-10 h-10' : 'w-8 h-8'}`} viewBox="0 0 24 24" fill="currentColor">
                <path d="M4 6h16v12H4z" opacity="0.3"/>
                <path d="M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 4h5v8l-2.5-1.5L6 12V4z"/>
              </svg>
            </div>
          </div>
        </div>

        {/* Bottom section */}
        <div>
          <div className="text-center mb-2">
            <p className="text-2xl font-tech tracking-wider">#{tokenId}</p>
          </div>
          <div className="h-px bg-white/20 mb-2" />
          <div className="flex items-center justify-between text-xs">
            <span className="opacity-70">{t("nftBadge.seriesFooter")}</span>
            <span className="font-tech opacity-70">{t("nftBadge.nftChip")}</span>
          </div>
        </div>
      </div>

      {/* Border glow */}
      {type !== "redeemed" && (
        <div className="absolute inset-0 rounded-2xl border-2 border-white/20" />
      )}
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
