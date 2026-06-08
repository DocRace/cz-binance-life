import { motion, AnimatePresence } from "motion/react";
import { Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import OverlayPortal from "./OverlayPortal";

interface RedeemProcessingOverlayProps {
  open: boolean;
}

export default function RedeemProcessingOverlay({ open }: RedeemProcessingOverlayProps) {
  const { t } = useTranslation();

  return (
    <OverlayPortal>
      <AnimatePresence>
        {open ? (
          <motion.div
            key="redeem-processing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[240] flex items-center justify-center bg-background/80 px-6 backdrop-blur-md"
            role="alertdialog"
            aria-modal="true"
            aria-busy="true"
            aria-labelledby="redeem-processing-title"
            aria-describedby="redeem-processing-body"
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.96, opacity: 0, y: 6 }}
              transition={{ type: "spring", stiffness: 320, damping: 28 }}
              className="w-full max-w-sm rounded-2xl border border-gold/35 bg-card p-8 text-center shadow-2xl"
            >
              <div className="relative mx-auto mb-6 h-16 w-16">
                <motion.span
                  className="absolute inset-0 rounded-full border-2 border-gold/35"
                  animate={{ scale: [1, 1.4, 1], opacity: [0.55, 0, 0.55] }}
                  transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
                  aria-hidden
                />
                <motion.span
                  className="absolute inset-2 rounded-full border border-gold/45"
                  animate={{ scale: [1, 1.25, 1], opacity: [0.75, 0.1, 0.75] }}
                  transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
                  aria-hidden
                />
                <div className="relative flex h-full w-full items-center justify-center rounded-full bg-gold/15">
                  <Loader2 className="h-8 w-8 animate-spin text-gold" aria-hidden />
                </div>
              </div>
              <h3 id="redeem-processing-title" className="font-display text-lg mb-3 text-foreground">
                {t("account.redeemProcessingTitle")}
              </h3>
              <p id="redeem-processing-body" className="text-sm text-muted-foreground leading-relaxed text-balance">
                {t("account.redeemProcessingBody")}
              </p>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </OverlayPortal>
  );
}
