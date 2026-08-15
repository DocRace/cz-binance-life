import { Link } from "react-router";
import { Copy, MessageCircle, Share2, Trophy, X } from "lucide-react";
import { useTranslation } from "react-i18next";

const H5_RADIUS = "rounded-[1.75rem]";
const H5_CARD =
  `${H5_RADIUS} border border-gold/20 bg-[#2c2824] shadow-[0_18px_50px_rgba(0,0,0,0.45)]`;
const H5_CTA =
  "inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-gold to-gold-light px-6 py-3 text-sm font-semibold text-primary-foreground";
const H5_GHOST =
  "inline-flex w-full items-center justify-center gap-2 rounded-full border border-gold/40 bg-gold/5 px-6 py-2.5 text-sm text-gold";

type Props = {
  open: boolean;
  onClose: () => void;
  entryId?: string | null;
  onShareX: () => void;
  onShareWechat: () => void;
  onCopy: () => void;
};

export default function ChronicleRankModal({
  open,
  onClose,
  entryId,
  onShareX,
  onShareWechat,
  onCopy,
}: Props) {
  const { t } = useTranslation();
  if (!open) return null;

  const boardTo = entryId
    ? `/club/chronicle/rank?entryId=${encodeURIComponent(entryId)}`
    : "/club/chronicle/rank";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/65 p-4 sm:items-center">
      <div className={`${H5_CARD} relative w-full max-w-[400px] p-5`}>
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 rounded-full p-1.5 text-muted-foreground hover:bg-white/5"
          aria-label={t("common.close")}
        >
          <X className="h-4 w-4" />
        </button>
        <p className="pr-8 text-center text-sm font-medium text-gold">{t("chronicle.rank.modalTitle")}</p>
        <p className="mt-2 text-center text-xs text-muted-foreground">{t("chronicle.rank.modalHint")}</p>

        <div className="mt-5 space-y-2.5">
          <button type="button" onClick={onShareX} className={H5_GHOST}>
            <Share2 className="h-4 w-4" aria-hidden />
            {t("chronicle.rank.shareX")}
          </button>
          <button type="button" onClick={onShareWechat} className={H5_GHOST}>
            <MessageCircle className="h-4 w-4" aria-hidden />
            {t("chronicle.rank.shareWechat")}
          </button>
          <button type="button" onClick={onCopy} className={H5_GHOST}>
            <Copy className="h-4 w-4" aria-hidden />
            {t("chronicle.rank.copyShare")}
          </button>
          <Link to={boardTo} className={H5_CTA} onClick={onClose}>
            <Trophy className="h-4 w-4" aria-hidden />
            {t("chronicle.rank.viewBoard")}
          </Link>
        </div>
      </div>
    </div>
  );
}
