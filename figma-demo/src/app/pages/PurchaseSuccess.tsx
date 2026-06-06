import { useEffect } from "react";
import { Link, useSearchParams } from "react-router";
import { motion } from "motion/react";
import { CheckCircle2 } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function PurchaseSuccess() {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const orderId = `${params.get("orderId") ?? ""}`.trim();

  useEffect(() => {
    document.title = t("purchaseSuccess.documentTitle");
  }, [t]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-16">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg rounded-2xl border border-border bg-card p-8 text-center shadow-xl"
      >
        <CheckCircle2 className="mx-auto mb-5 h-14 w-14 text-gold" aria-hidden />
        <h1 className="font-display text-2xl mb-3">{t("purchaseSuccess.title")}</h1>
        <p className="text-sm text-muted-foreground leading-relaxed mb-2">{t("purchaseSuccess.body")}</p>
        {orderId ? (
          <p className="text-xs text-muted-foreground font-mono mb-6 break-all">
            {t("purchaseSuccess.orderLabel")}: {orderId}
          </p>
        ) : (
          <div className="mb-6" />
        )}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            to="/account"
            className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-gold to-gold-dark px-6 py-3 text-sm font-medium text-primary-foreground hover:from-gold-light hover:to-gold transition-colors"
          >
            {t("purchaseSuccess.viewAccount")}
          </Link>
          <Link
            to="/club"
            className="inline-flex items-center justify-center rounded-xl border border-border px-6 py-3 text-sm font-medium hover:border-gold/50 hover:bg-accent/40 transition-colors"
          >
            {t("purchaseSuccess.backToClub")}
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
