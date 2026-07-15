import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Gift, Mail, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import OverlayPortal from "./OverlayPortal";
import { overlayBackdropClassLight } from "../lib/overlayLayers";
import { type DisplayNft } from "../../lib/bookAccountNftApi";
import {
  giftNftToEmail,
  localizedGiftFailureMessage,
  lookupGiftRecipientEmail,
  resolveGiftCollectionId,
} from "../../lib/giftNftClient";

type GiftNftModalProps = {
  nft: DisplayNft;
  payerEmail: string;
  onClose: () => void;
  onGifted?: () => void;
};

export default function GiftNftModal({ nft, payerEmail, onClose, onGifted }: GiftNftModalProps) {
  const { t } = useTranslation();
  const [recipientEmail, setRecipientEmail] = useState("");
  const [verifiedEmail, setVerifiedEmail] = useState("");
  const [lookupBusy, setLookupBusy] = useState(false);
  const [giftBusy, setGiftBusy] = useState(false);
  const [lookupExists, setLookupExists] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleLookup = async () => {
    const email = recipientEmail.trim().toLowerCase();
    if (!email.includes("@")) return;
    if (payerEmail.trim().toLowerCase() === email) {
      setError(t("giftPurchase.cannotGiftToSelf"));
      return;
    }
    setLookupBusy(true);
    setError(null);
    setLookupExists(null);
    setVerifiedEmail("");
    try {
      const out = await lookupGiftRecipientEmail(email);
      if (!out.ok) {
        setError(t("giftPurchase.lookupFailed"));
        return;
      }
      setLookupExists(out.data.exists);
      setVerifiedEmail(email);
    } catch {
      setError(t("purchase.bffOffline"));
    } finally {
      setLookupBusy(false);
    }
  };

  const handleGift = async () => {
    if (!verifiedEmail || !nft.tokenId) return;
    const collectionId = resolveGiftCollectionId(nft.collectionId);
    if (!collectionId) {
      setError(t("giftPurchase.errorInvalidParameter"));
      return;
    }
    setGiftBusy(true);
    setError(null);
    try {
      const out = await giftNftToEmail({
        collectionId,
        tokenId: nft.tokenId,
        recipientEmail: verifiedEmail,
      });
      if (!out.ok) {
        setError(localizedGiftFailureMessage(t, { code: out.code ?? -1, message: out.message }));
        return;
      }
      onGifted?.();
      onClose();
    } catch {
      setError(t("purchase.bffOffline"));
    } finally {
      setGiftBusy(false);
    }
  };

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
            className="relative w-full max-w-md rounded-2xl border border-border bg-card p-8 pt-10"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={onClose}
              className="absolute top-3 right-3 rounded-full p-2 hover:bg-accent transition-colors"
              aria-label={t("common.close")}
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center mb-6">
              <Gift className="w-8 h-8 text-gold mx-auto mb-3" aria-hidden />
              <h2 className="font-display text-2xl mb-2">{t("account.giftTitle")}</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">{t("account.giftSubtitle")}</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs text-muted-foreground">{t("giftPurchase.recipientEmailLabel")}</label>
                <input
                  type="email"
                  value={recipientEmail}
                  onChange={(e) => {
                    setRecipientEmail(e.target.value);
                    setVerifiedEmail("");
                    setLookupExists(null);
                    setError(null);
                  }}
                  className="mt-1 w-full px-4 py-3 rounded-xl bg-input-background border border-border focus:border-gold/50 focus:outline-none text-sm"
                  placeholder="friend@example.com"
                  autoComplete="email"
                />
              </div>

              {verifiedEmail ? (
                <p className="text-xs text-emerald-600/90 dark:text-emerald-400/90 leading-relaxed">
                  {lookupExists ? t("giftPurchase.recipientExists") : t("giftPurchase.recipientWillProvision")}
                </p>
              ) : null}

              {!verifiedEmail ? (
                <button
                  type="button"
                  disabled={lookupBusy || !recipientEmail.includes("@")}
                  onClick={() => void handleLookup()}
                  className="w-full flex items-center justify-center gap-2 p-3 rounded-xl border border-border hover:border-gold/50 hover:bg-accent/50 transition-all disabled:opacity-50"
                >
                  <Mail className="w-4 h-4" />
                  {lookupBusy ? t("common.loading") : t("giftPurchase.confirmRecipient")}
                </button>
              ) : (
                <button
                  type="button"
                  disabled={giftBusy}
                  onClick={() => void handleGift()}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-gold to-gold-dark hover:from-gold-light hover:to-gold transition-all disabled:opacity-50"
                >
                  <span className="text-primary-foreground font-medium">
                    {giftBusy ? t("common.loading") : t("account.giftSubmit")}
                  </span>
                </button>
              )}

              {error ? (
                <p className="text-xs text-red-400/95 text-center" role="alert">
                  {error}
                </p>
              ) : null}
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    </OverlayPortal>
  );
}
