import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ExternalLink, Mail, Minus, Plus, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import PlatformSettlementRibbon from "./PlatformSettlementRibbon";
import {
  DATADANCE_CHAIN_ID,
  DATADANCE_CHAIN_NAME,
  IPDEX_PRODUCT_NAME,
  getBookPrimaryListingId,
} from "../../config/platform";
import { buildBookPrimarySaleCheckoutUrl } from "../../ipdex/marketUrls";
import { getPartnerApiPublicLabel } from "../../ipdex/partnerApi";
import { bookBffJson, bookBffIsTransportIssue } from "../../lib/bookBffClient";

interface PurchaseModalProps {
  onClose: () => void;
  skipLogin?: boolean;
}

type Step = "login" | "select" | "checkout" | "success";

type PaymentMode = "bff" | "market";

interface PrimaryPurchaseData {
  orderId?: string;
  paymentUrl?: string;
}

export default function PurchaseModal({ onClose, skipLogin = false }: PurchaseModalProps) {
  const { t } = useTranslation();
  const [step, setStep] = useState<Step>(skipLogin ? "select" : "login");
  const [quantity, setQuantity] = useState(1);

  const [loginSubStep, setLoginSubStep] = useState<"email" | "otp">("email");
  const [emailInput, setEmailInput] = useState("");
  const [otpInput, setOtpInput] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [bffSessionOk, setBffSessionOk] = useState<boolean | null>(null);

  const [apiCheckoutError, setApiCheckoutError] = useState<string | null>(null);
  const [checkoutBusy, setCheckoutBusy] = useState(false);
  const [lastPaymentMode, setLastPaymentMode] = useState<PaymentMode | null>(null);

  const pricePerNFT = 99;
  const totalPrice = quantity * pricePerNFT;

  const checkoutUrl = useMemo(
    () => buildBookPrimarySaleCheckoutUrl(quantity),
    [quantity],
  );

  const listingConfigured = Boolean(getBookPrimaryListingId().trim());

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const s = await bookBffJson<{ authenticated: boolean }>("/api/bff/auth/session");
        if (cancel) return;
        if (bookBffIsTransportIssue(s)) {
          setBffSessionOk(false);
          return;
        }
        setBffSessionOk(true);
        if (s.code === 0 && s.data?.authenticated) {
          if (!skipLogin) setStep("select");
        }
      } catch {
        if (!cancel) setBffSessionOk(false);
      }
    })();
    return () => {
      cancel = true;
    };
  }, [skipLogin]);

  const handleSendCode = async () => {
    const email = emailInput.trim();
    if (!email.includes("@")) return;
    setAuthBusy(true);
    setApiCheckoutError(null);
    try {
      const out = await bookBffJson<null>("/api/bff/auth/send-code", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      if (out.code === 0) {
        setLoginSubStep("otp");
      } else {
        setApiCheckoutError(
          bookBffIsTransportIssue(out) ? t("purchase.bffOffline") : out.message || t("purchase.bffAuthError"),
        );
      }
    } catch {
      setApiCheckoutError(t("purchase.bffOffline"));
    } finally {
      setAuthBusy(false);
    }
  };

  const handleVerifyOtp = async () => {
    const email = emailInput.trim();
    const code = otpInput.trim();
    if (!email || !code) return;
    setAuthBusy(true);
    setApiCheckoutError(null);
    try {
      const out = await bookBffJson<{ ok?: boolean }>("/api/bff/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, code }),
      });
      if (out.code === 0) {
        setStep("select");
      } else {
        setApiCheckoutError(
          bookBffIsTransportIssue(out) ? t("purchase.bffOffline") : out.message || t("purchase.bffAuthError"),
        );
      }
    } catch {
      setApiCheckoutError(t("purchase.bffOffline"));
    } finally {
      setAuthBusy(false);
    }
  };

  const handleConfirmPurchase = () => {
    setApiCheckoutError(null);
    setStep("checkout");
  };

  const handleCheckout = async () => {
    setApiCheckoutError(null);
    setCheckoutBusy(true);

    try {
      const body: { quantity: number; listingId?: string } = {
        quantity: Math.floor(quantity),
      };
      const lid = getBookPrimaryListingId().trim();
      if (lid) body.listingId = lid;

      const out = await bookBffJson<PrimaryPurchaseData>("/api/bff/orders/primary", {
        method: "POST",
        body: JSON.stringify(body),
      });

      if (out.code === 0 && out.data?.paymentUrl) {
        setLastPaymentMode("bff");
        window.open(out.data.paymentUrl, "_blank", "noopener,noreferrer");
        setStep("success");
        return;
      }

      if (
        checkoutUrl &&
        (out.message?.includes("listingId") ||
          out.message?.includes("BOOK_PRIMARY_LISTING_ID") ||
          out.code !== 0)
      ) {
        setLastPaymentMode("market");
        window.open(checkoutUrl, "_blank", "noopener,noreferrer");
        setStep("success");
        return;
      }

      setApiCheckoutError(
        bookBffIsTransportIssue(out)
          ? t("purchase.bffOffline")
          : out.message || t("purchase.primaryPurchaseFailed"),
      );
    } catch {
      if (checkoutUrl) {
        setLastPaymentMode("market");
        window.open(checkoutUrl, "_blank", "noopener,noreferrer");
        setStep("success");
      } else {
        setApiCheckoutError(t("purchase.bffOffline"));
      }
    } finally {
      setCheckoutBusy(false);
    }
  };

  const handleOpenMarketAgain = () => {
    if (checkoutUrl) window.open(checkoutUrl, "_blank", "noopener,noreferrer");
  };

  const checkoutDisabled =
    checkoutBusy || (bffSessionOk === false && !checkoutUrl && !listingConfigured);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ type: "spring", duration: 0.5 }}
          className="relative w-full max-w-md bg-card rounded-2xl border border-border overflow-hidden max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <PlatformSettlementRibbon />
          <button
            type="button"
            onClick={onClose}
            className="absolute top-3 right-3 z-10 rounded-full bg-card/95 p-2 shadow-sm ring-1 ring-border/60 hover:bg-accent transition-colors"
            aria-label={t("common.close")}
          >
            <X className="w-5 h-5" />
          </button>

          {step === "login" && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="p-8 pt-10"
            >
              <div className="text-center mb-8">
                <h2 className="font-display text-2xl mb-2">{t("purchase.loginPrompt")}</h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {bffSessionOk === false ? t("purchase.bffOffline") : t("purchase.bffEmailIntro")}
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs text-muted-foreground">{t("purchase.emailLabel")}</label>
                  <input
                    type="email"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    className="mt-1 w-full px-4 py-3 rounded-xl bg-input-background border border-border focus:border-gold/50 focus:outline-none text-sm"
                    placeholder="you@example.com"
                    autoComplete="email"
                  />
                </div>

                {loginSubStep === "otp" ? (
                  <div>
                    <label className="text-xs text-muted-foreground">{t("purchase.otpLabel")}</label>
                    <input
                      type="text"
                      inputMode="text"
                      value={otpInput}
                      onChange={(e) => setOtpInput(e.target.value)}
                      className="mt-1 w-full px-4 py-3 rounded-xl bg-input-background border border-border focus:border-gold/50 focus:outline-none text-sm tracking-wider"
                      placeholder="••••••••"
                      autoComplete="one-time-code"
                    />
                  </div>
                ) : null}

                <button
                  type="button"
                  disabled={authBusy || bffSessionOk === false}
                  onClick={() => void (loginSubStep === "email" ? handleSendCode() : handleVerifyOtp())}
                  className="w-full flex items-center justify-center gap-2 p-4 rounded-xl border border-border hover:border-gold/50 hover:bg-accent/50 transition-all duration-300 disabled:opacity-50"
                >
                  <Mail className="w-5 h-5" />
                  <span>
                    {authBusy
                      ? t("common.loading")
                      : loginSubStep === "email"
                        ? t("purchase.sendCode")
                        : t("purchase.verifyAndContinue")}
                  </span>
                </button>

                {loginSubStep === "otp" ? (
                  <button
                    type="button"
                    onClick={() => {
                      setLoginSubStep("email");
                      setOtpInput("");
                    }}
                    className="w-full text-center text-xs text-muted-foreground hover:text-foreground"
                  >
                    {t("purchase.changeEmail")}
                  </button>
                ) : null}
              </div>

              <p className="text-xs text-muted-foreground text-center mt-6 leading-relaxed">
                {t("purchase.termsNote")}
              </p>
              {apiCheckoutError ? (
                <p className="text-xs text-red-400/95 text-center mt-3">{apiCheckoutError}</p>
              ) : null}
            </motion.div>
          )}

          {step === "select" && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="p-8 pt-10"
            >
              <div className="text-center mb-8">
                <h2 className="font-display text-2xl mb-2">{t("purchase.selectQuantity")}</h2>
                <p className="text-sm text-muted-foreground">{t("purchase.pricePerNFT")} HK$ {pricePerNFT}</p>
                <p className="text-xs text-muted-foreground mt-3 leading-relaxed">
                  {t("purchase.ipdexPriceNote")}
                </p>
              </div>

              <div className="mb-8">
                <div className="flex items-center justify-center gap-4 mb-6">
                  <button
                    type="button"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="p-3 rounded-xl border border-border hover:border-gold/50 hover:bg-accent/50 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={quantity <= 1}
                  >
                    <Minus className="w-5 h-5" />
                  </button>

                  <div className="w-24 text-center">
                    <div className="text-4xl font-tech text-gold">{quantity}</div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setQuantity(Math.min(10, quantity + 1))}
                    className="p-3 rounded-xl border border-border hover:border-gold/50 hover:bg-accent/50 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={quantity >= 10}
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-4 rounded-xl bg-accent/30 border border-border">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-muted-foreground">{t("purchase.unitPrice")}</span>
                    <span className="font-tech">HK$ {pricePerNFT}</span>
                  </div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-muted-foreground">{t("purchase.quantity")}</span>
                    <span className="font-tech">{quantity}</span>
                  </div>
                  <div className="h-px bg-border my-3" />
                  <div className="flex justify-between items-center">
                    <span>{t("purchase.totalPrice")}</span>
                    <span className="text-xl font-tech text-gold">HK$ {totalPrice}</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleConfirmPurchase}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-gold to-gold-dark hover:from-gold-light hover:to-gold transition-all duration-300"
              >
                <span className="text-primary-foreground font-medium">{t("purchase.confirmPurchase")}</span>
              </button>

              {!skipLogin ? (
                <button
                  type="button"
                  onClick={() => setStep("login")}
                  className="w-full mt-4 text-center text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  {t("purchase.switchAccount")}
                </button>
              ) : null}
            </motion.div>
          )}

          {step === "checkout" && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="p-8 pt-10"
            >
              <div className="text-center mb-8">
                <h2 className="font-display text-2xl mb-2">{t("purchase.ipdexCheckoutTitle")}</h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {t("purchase.ipdexCheckoutSubtitle", { quantity, totalPrice })}
                </p>
              </div>

              <div className="mb-6 space-y-3 rounded-xl border border-border bg-accent/25 p-4 text-sm text-muted-foreground leading-relaxed">
                <p>{t("purchase.bffCheckoutNote")}</p>
                <p>{t("purchase.ddcSettlementLine", {
                  chain: DATADANCE_CHAIN_NAME,
                  chainId: DATADANCE_CHAIN_ID,
                })}</p>
                <p className="text-xs border-t border-border/60 pt-3">
                  {t("purchase.partnerApiReminder", {
                    partnerBase: getPartnerApiPublicLabel(),
                  })}
                </p>
              </div>

              <button
                type="button"
                disabled={checkoutDisabled}
                onClick={() => void handleCheckout()}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-gold to-gold-dark hover:from-gold-light hover:to-gold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <ExternalLink className="w-5 h-5" aria-hidden />
                <span className="text-primary-foreground font-medium">
                  {checkoutBusy ? t("purchase.checkoutBusy") : t("purchase.payWithBffStripe")}
                </span>
              </button>

              {bffSessionOk === false ? (
                <p className="text-xs text-amber-500/95 text-center mt-4">{t("purchase.bffOffline")}</p>
              ) : null}

              {!listingConfigured ? (
                <p className="text-xs text-muted-foreground text-center mt-3">
                  {t("purchase.listingFallbackHint")}
                </p>
              ) : null}

              {apiCheckoutError ? (
                <p className="text-xs text-red-400/95 text-center mt-3">{apiCheckoutError}</p>
              ) : null}

              <button
                type="button"
                onClick={() => setStep("select")}
                className="w-full mt-4 text-center text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {t("purchase.backToQuantity")}
              </button>
            </motion.div>
          )}

          {step === "success" && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-8 pt-12 text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                className="w-20 h-20 mx-auto mb-6 rounded-full bg-gold/20 flex items-center justify-center"
              >
                <ExternalLink className="w-10 h-10 text-gold" aria-hidden />
              </motion.div>

              <h2 className="font-display text-2xl mb-2">{t("purchase.ipdexOpenedTitle")}</h2>
              <p className="text-muted-foreground mb-4 leading-relaxed text-sm">
                {lastPaymentMode === "bff"
                  ? t("purchase.successBffStripe")
                  : lastPaymentMode === "market"
                    ? t("purchase.successMarketFallback")
                    : t("purchase.ipdexOpenedBody", {
                        dex: IPDEX_PRODUCT_NAME,
                        chain: DATADANCE_CHAIN_NAME,
                        chainId: DATADANCE_CHAIN_ID,
                      })}
              </p>
              <p className="text-muted-foreground mb-8 text-xs leading-relaxed">
                <span>{t("purchase.ipdexOpenedHint")}</span>
              </p>

              <div className="space-y-3">
                {checkoutUrl ? (
                  <button
                    type="button"
                    onClick={handleOpenMarketAgain}
                    className="w-full py-3 rounded-xl border border-gold/50 text-gold hover:bg-gold/10 transition-colors text-sm flex items-center justify-center gap-2"
                  >
                    <ExternalLink className="w-4 h-4" aria-hidden />
                    {t("purchase.openIpdexAgain")}
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    window.location.href = "/account";
                  }}
                  className="w-full py-4 rounded-xl bg-gradient-to-r from-gold to-gold-dark hover:from-gold-light hover:to-gold transition-all duration-300"
                >
                  <span className="text-primary-foreground font-medium">{t("purchase.viewAccountButton")}</span>
                </button>
              </div>
            </motion.div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
