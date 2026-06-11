import { motion, AnimatePresence } from "motion/react";
import { BookOpen, ShoppingBag, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import OverlayPortal from "./OverlayPortal";
import { overlayBackdropClassLight } from "../lib/overlayLayers";

interface RedeemScanUnavailableModalProps {
  onClose: () => void;
  onPurchase: () => void;
}

export default function RedeemScanUnavailableModal({
  onClose,
  onPurchase,
}: RedeemScanUnavailableModalProps) {
  const { t } = useTranslation();

  return (
    <OverlayPortal>
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className={overlayBackdropClassLight}
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.92, opacity: 0 }}
            transition={{ type: "spring", duration: 0.45 }}
            className="relative w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-xl"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-labelledby="redeem-scan-unavailable-title"
          >
            <button
              type="button"
              onClick={onClose}
              className="absolute top-4 right-4 rounded-full p-2 transition-colors hover:bg-accent"
              aria-label={t("common.close")}
            >
              <X className="h-5 w-5" aria-hidden />
            </button>

            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gold/15">
              <BookOpen className="h-8 w-8 text-gold" aria-hidden />
            </div>

            <h2 id="redeem-scan-unavailable-title" className="font-display text-2xl mb-3">
              {t("account.redeemScanNoneTitle")}
            </h2>
            <p className="mb-8 text-sm leading-relaxed text-muted-foreground">
              {t("account.redeemScanNoneBody")}
            </p>

            <button
              type="button"
              onClick={() => {
                onClose();
                onPurchase();
              }}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-gold/90 px-6 py-3.5 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-gold"
            >
              <ShoppingBag className="h-4 w-4 shrink-0" aria-hidden />
              {t("account.redeemScanPurchaseCta")}
            </button>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    </OverlayPortal>
  );
}
