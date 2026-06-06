import { motion, AnimatePresence } from "motion/react";
import { X } from "lucide-react";
import { useTranslation } from "react-i18next";
import RedeemStaffPanel from "./RedeemStaffPanel";
import OverlayPortal from "./OverlayPortal";
import { overlayBackdropClassLight } from "../lib/overlayLayers";

interface RedeemBookModalProps {
  onClose: () => void;
  onConfirm: (staffCode: string) => Promise<void> | void;
  tokenId: string;
  /** NFT series UUID sent as `sourceCollectionId` — compare with admin redemption rule. */
  seriesId?: string;
  busy?: boolean;
  externalError?: string | null;
}

export default function RedeemBookModal({
  onClose,
  onConfirm,
  tokenId,
  seriesId,
  busy = false,
  externalError = null,
}: RedeemBookModalProps) {
  const { t } = useTranslation();

  return (
    <OverlayPortal>
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className={overlayBackdropClassLight}
          onClick={busy ? undefined : onClose}
        >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ type: "spring", duration: 0.5 }}
          className="relative w-full max-w-md bg-card rounded-2xl border border-border overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={busy ? undefined : onClose}
            className="absolute top-4 right-4 z-10 p-2 rounded-full hover:bg-accent transition-colors"
            aria-label={t("common.close")}
          >
            <X className="w-5 h-5" />
          </button>

          <RedeemStaffPanel
            tokenId={tokenId}
            seriesId={seriesId}
            description={t("account.redeemModalBody")}
            onConfirm={onConfirm}
            busy={busy}
            externalError={externalError}
            onCancel={busy ? undefined : onClose}
          />
        </motion.div>
      </motion.div>
      </AnimatePresence>
    </OverlayPortal>
  );
}
