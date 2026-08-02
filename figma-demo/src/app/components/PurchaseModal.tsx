import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ExternalLink, Gift, Mail, Minus, Plus, User, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import PlatformSettlementRibbon from "./PlatformSettlementRibbon";
import OverlayPortal from "./OverlayPortal";
import { overlayBackdropClassLight } from "../lib/overlayLayers";
import {
  DATADANCE_CHAIN_NAME,
  IPDEX_PRODUCT_NAME,
  getBookPrimaryListingId,
  getBookPrimaryPriceHkdHint,
  getBookPrimarySaleId,
} from "../../config/platform";
import { rememberCheckoutOrderId } from "../../lib/accountPurchaseSync";
import { lookupGiftRecipientEmail } from "../../lib/giftNftClient";
import { rememberPendingGiftPurchase } from "../../lib/giftPurchaseStorage";
import { bookBffJson, bookBffIsTransportIssue } from "../../lib/bookBffClient";

interface PurchaseModalProps {
  onClose: () => void;
  skipLogin?: boolean;
  /** Override env primary sale (e.g. free STANDARD «免費版»). */
  saleIdOverride?: string;
  listingIdOverride?: string;
  priceHkdHintOverride?: number | null;
}

type Step = "login" | "select" | "success";
type PurchaseMode = "self" | "gift";

const ORDER_ERROR_UNPAID = -20008;

function isAllowedPaymentUrl(url: string): boolean {
  const u = url.trim();
  if (!/^https?:\/\//i.test(u)) return false;
  // Stripe Checkout
  if (/^https?:\/\/([^/]+\.)?stripe\.com\//i.test(u)) return true;
  // BSC $U cashier (real host or local stub Intent)
  if (/settlement\.stub\.local/i.test(u)) return true;
  if (/\/pay\//i.test(u) || /settlement/i.test(u) || /cashier/i.test(u)) return true;
  return false;
}

/**
 * Reserve a tab while the user gesture is active; navigate after async checkout.
 * Do not pass `noopener` — it makes `window.open` return null, so we cannot set
 * `tab.location` and Stripe would fall back to replacing the book-site tab.
 */
function reservePaymentTab(): Window | null {
  const tab = window.open("about:blank", "_blank");
  if (tab) {
    try {
      tab.opener = null;
      tab.document.title = "Stripe checkout";
      tab.document.body.innerHTML =
        '<p style="font-family:system-ui,sans-serif;padding:2rem;color:#444">Opening Stripe checkout…</p>';
    } catch {
      /* cross-origin once navigated; ignore */
    }
  }
  return tab;
}

function navigatePaymentTab(tab: Window | null, paymentUrl: string): void {
  const url = paymentUrl.trim();
  if (!url) return;
  if (tab && !tab.closed) {
    tab.location.href = url;
    return;
  }
  const fallback = window.open(url, "_blank");
  if (fallback) {
    try {
      fallback.opener = null;
    } catch {
      /* ignore */
    }
    return;
  }
  window.location.assign(url);
}

interface PrimaryPurchaseData {
  orderId?: string;
  paymentUrl?: string;
  paymentChannel?: string;
  settleAsset?: string;
  settleAmount?: string;
  settleChainId?: string;
}

type PrimarySaleListingRow = Record<string, unknown>;

type PrimarySaleHints = {
  listingId: string;
  /** HK$ per unit from listing `c_price_hkd` (stored in cents on IPDEX). */
  unitPriceHkd?: number;
  /** From `c_per_user_limit` when present. */
  perUserPurchaseCap?: number;
};

/** See `primarySalesStatus.js` / `listingStatus.js` in ipdex-backend (PRIMARY_* 一级发售 activity + listing). */
const PRIMARY_SALES_STATUS = {
  NOT_STARTED: 0,
  ACTIVE: 1,
  SOLD_OUT: 2,
  EXPIRED: 3,
  DELISTED: 4,
} as const;

type PrimarySaleUnavailableReason =
  | "soldOut"
  | "expired"
  | "delisted"
  | "notStarted";

function unknownToNum(v: unknown): number | undefined {
  if (typeof v === "bigint") return Number(v);
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}

/** When non-null, Stripe / opening the market deeplink cannot succeed — IPDEX considers the sale inactive. */
function derivePrimarySaleUnavailable(data: unknown): PrimarySaleUnavailableReason | null {
  if (data == null || typeof data !== "object") return null;
  const o = data as { sales?: PrimarySaleListingRow; listing?: PrimarySaleListingRow };
  const sales = o.sales;
  const listing = o.listing;
  const ss = sales ? unknownToNum(sales.c_status) : undefined;
  const ls = listing ? unknownToNum(listing.c_status) : undefined;

  const fromStatusCode = (s: number): PrimarySaleUnavailableReason | null => {
    switch (s) {
      case PRIMARY_SALES_STATUS.SOLD_OUT:
        return "soldOut";
      case PRIMARY_SALES_STATUS.EXPIRED:
        return "expired";
      case PRIMARY_SALES_STATUS.DELISTED:
        return "delisted";
      case PRIMARY_SALES_STATUS.NOT_STARTED:
        return "notStarted";
      default:
        return null;
    }
  };

  const blockFromSales = ss !== undefined ? fromStatusCode(ss) : null;
  const blockFromListing = ls !== undefined ? fromStatusCode(ls) : null;
  if (blockFromSales) return blockFromSales;
  if (blockFromListing) return blockFromListing;

  const qty = listing ? unknownToNum(listing.c_quantity) : undefined;
  const sold = listing ? unknownToNum(listing.c_sold_quantity) : undefined;
  const frozen = (listing ? unknownToNum(listing.c_frozen_quantity) : undefined) ?? 0;
  if (
    qty != null &&
    sold != null &&
    (ss === PRIMARY_SALES_STATUS.ACTIVE || ls === PRIMARY_SALES_STATUS.ACTIVE) &&
    qty - sold - frozen <= 0
  ) {
    return "soldOut";
  }

  return null;
}

function extractListingUuidFromPrimarySalePayload(data: unknown): string {
  if (data == null || typeof data !== "object") return "";
  const listing = (data as { listing?: PrimarySaleListingRow }).listing;
  if (listing == null || typeof listing !== "object") return "";
  const raw = listing.c_listing_id ?? listing.c_listingId;
  const s = typeof raw === "string" ? raw.trim() : `${raw ?? ""}`.trim();
  return s;
}

function extractPrimarySaleHints(data: unknown): PrimarySaleHints {
  const listingId = extractListingUuidFromPrimarySalePayload(data);
  const hints: PrimarySaleHints = { listingId };
  if (data == null || typeof data !== "object") return hints;
  const listing = (data as { listing?: PrimarySaleListingRow }).listing;
  if (listing == null || typeof listing !== "object") return hints;

  const rawCents = listing.c_price_hkd ?? listing.price_hkd ?? listing.priceHkd;
  const cents =
    typeof rawCents === "bigint"
      ? Number(rawCents)
      : typeof rawCents === "number"
        ? rawCents
        : Number(`${rawCents ?? ""}`);
  if (Number.isFinite(cents) && cents > 0) {
    hints.unitPriceHkd = Math.round((cents / 100) * 100) / 100;
  }

  const lim = listing.c_per_user_limit ?? listing.per_user_limit ?? listing.perUserLimit;
  const cap =
    typeof lim === "bigint"
      ? Number(lim)
      : typeof lim === "number"
        ? lim
        : Number(`${lim ?? ""}`);
  if (Number.isFinite(cap) && cap >= 1 && cap <= 999) {
    hints.perUserPurchaseCap = Math.floor(cap);
  }
  return hints;
}

export default function PurchaseModal({
  onClose,
  skipLogin = false,
  saleIdOverride,
  listingIdOverride,
  priceHkdHintOverride,
}: PurchaseModalProps) {
  const { t } = useTranslation();
  const [step, setStep] = useState<Step>(skipLogin ? "select" : "login");
  const [purchaseMode, setPurchaseMode] = useState<PurchaseMode>("self");
  const cryptoPayEnabled =
    `${import.meta.env.VITE_CRYPTO_SETTLEMENT_ENABLED ?? ""}`.trim() === "1" ||
    `${import.meta.env.VITE_CRYPTO_SETTLEMENT_ENABLED ?? ""}`.trim().toLowerCase() === "true";
  const [checkoutPaymentChannel, setCheckoutPaymentChannel] = useState<"stripe" | "crypto">("stripe");
  const [quantity, setQuantity] = useState(1);
  const [giftRecipientEmail, setGiftRecipientEmail] = useState("");
  const [giftVerifiedEmail, setGiftVerifiedEmail] = useState("");
  const [giftRecipientExists, setGiftRecipientExists] = useState<boolean | null>(null);
  const [giftLookupBusy, setGiftLookupBusy] = useState(false);

  const [loginSubStep, setLoginSubStep] = useState<"email" | "otp">("email");
  const [emailInput, setEmailInput] = useState("");
  const [otpInput, setOtpInput] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [bffSessionOk, setBffSessionOk] = useState<boolean | null>(null);

  const [apiCheckoutError, setApiCheckoutError] = useState<string | null>(null);
  const [checkoutBusy, setCheckoutBusy] = useState(false);
  const [lastPaymentUrl, setLastPaymentUrl] = useState<string | null>(null);
  const [saleResolvedListingId, setSaleResolvedListingId] = useState<string | null>(null);
  const [saleListingFetchState, setSaleListingFetchState] = useState<"idle" | "loading" | "ok" | "fail">("idle");
  const [primarySaleUnavailable, setPrimarySaleUnavailable] = useState<PrimarySaleUnavailableReason | null>(null);

  const envPriceBaseline = useMemo(
    () => priceHkdHintOverride ?? getBookPrimaryPriceHkdHint() ?? 100,
    [priceHkdHintOverride],
  );
  const [unitPriceHkd, setUnitPriceHkd] = useState<number>(() => envPriceBaseline);
  const [quantityCap, setQuantityCap] = useState(10);

  const pricePerNFT = unitPriceHkd;
  const totalPrice = quantity * pricePerNFT;

  const envListingId = useMemo(
    () => (listingIdOverride ?? getBookPrimaryListingId()).trim(),
    [listingIdOverride],
  );
  const primarySaleId = useMemo(
    () => (saleIdOverride ?? getBookPrimarySaleId()).trim(),
    [saleIdOverride],
  );
  /** BFF checkout can succeed with env listing id, or by resolving listing from primary-sale id. */
  const canPurchaseViaBff = Boolean(envListingId || primarySaleId);

  const fetchPrimarySaleHints = useCallback(async (): Promise<PrimarySaleHints> => {
    const sid = primarySaleId;
    if (!sid) return { listingId: "" };
    const out = await bookBffJson<unknown>(
      `/api/bff/market/primary-sales/${encodeURIComponent(sid)}`,
    );
    if (out.code !== 0 || bookBffIsTransportIssue(out) || !out.data) return { listingId: "" };
    return extractPrimarySaleHints(out.data);
  }, [primarySaleId]);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      if (!primarySaleId) {
        setPrimarySaleUnavailable(null);
        if (envListingId) {
          setSaleResolvedListingId(envListingId);
          setSaleListingFetchState("ok");
        } else {
          setSaleResolvedListingId(null);
          setSaleListingFetchState("idle");
        }
        return;
      }

      if (!envListingId) setSaleListingFetchState("loading");
      const out = await bookBffJson<unknown>(
        `/api/bff/market/primary-sales/${encodeURIComponent(primarySaleId)}`,
      );
      if (cancelled) return;

      const hints =
        out.code === 0 && !bookBffIsTransportIssue(out) && out.data ? extractPrimarySaleHints(out.data) : { listingId: "" };

      if (out.code === 0 && !bookBffIsTransportIssue(out) && out.data) {
        setPrimarySaleUnavailable(derivePrimarySaleUnavailable(out.data));
      } else {
        setPrimarySaleUnavailable(null);
      }

      const resolvedListing = envListingId || hints.listingId || null;
      if (resolvedListing) {
        setSaleResolvedListingId(resolvedListing);
        setSaleListingFetchState("ok");
      } else {
        setSaleResolvedListingId(null);
        setSaleListingFetchState("fail");
      }

      if (hints.unitPriceHkd != null) setUnitPriceHkd(hints.unitPriceHkd);
      if (hints.perUserPurchaseCap != null) setQuantityCap(hints.perUserPurchaseCap);
    })();

    return () => {
      cancelled = true;
    };
  }, [envListingId, primarySaleId]);

  useEffect(() => {
    setQuantity((q) => Math.min(Math.max(1, q), quantityCap));
  }, [quantityCap]);

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

  const resolvePurchaseError = (out: {
    code: number;
    message?: string;
  }): string => {
    if (out.code === ORDER_ERROR_UNPAID || out.message?.toLowerCase().includes("unpaid")) {
      return t("purchase.unpaidOrderBlocksCheckout");
    }
    if (primarySaleUnavailable) {
      return t(`purchase.primarySaleUnavailable.${primarySaleUnavailable}`);
    }
    return out.message || t("purchase.primaryPurchaseFailed");
  };

  const resetGiftRecipient = () => {
    setGiftVerifiedEmail("");
    setGiftRecipientExists(null);
  };

  const handleGiftRecipientLookup = async () => {
    const email = giftRecipientEmail.trim().toLowerCase();
    if (!email.includes("@")) return;
    setGiftLookupBusy(true);
    setApiCheckoutError(null);
    resetGiftRecipient();
    try {
      const me = await bookBffJson<Record<string, unknown>>("/api/bff/me");
      const payerEmail = `${me.data?.email ?? emailInput ?? ""}`.trim().toLowerCase();
      if (payerEmail && payerEmail === email) {
        setApiCheckoutError(t("giftPurchase.cannotGiftToSelf"));
        return;
      }
      const out = await lookupGiftRecipientEmail(email);
      if (!out.ok) {
        setApiCheckoutError(t("giftPurchase.lookupFailed"));
        return;
      }
      setGiftVerifiedEmail(email);
      setGiftRecipientExists(out.data.exists);
    } catch {
      setApiCheckoutError(t("purchase.bffOffline"));
    } finally {
      setGiftLookupBusy(false);
    }
  };

  const giftRecipientReady = purchaseMode !== "gift" || Boolean(giftVerifiedEmail);

  const handleCheckout = async () => {
    setApiCheckoutError(null);
    setCheckoutBusy(true);
    setLastPaymentUrl(null);
    const paymentTab = reservePaymentTab();

    try {
      const body: {
        quantity: number;
        listingId?: string;
        paymentChannel?: "stripe" | "crypto";
      } = {
        quantity: Math.floor(quantity),
        paymentChannel: checkoutPaymentChannel,
      };
      let lid = envListingId || (saleResolvedListingId || "").trim();
      if (!lid && primarySaleId) {
        const h = await fetchPrimarySaleHints();
        if (h.listingId) {
          lid = h.listingId;
          setSaleResolvedListingId(h.listingId);
        }
        if (h.unitPriceHkd != null) setUnitPriceHkd(h.unitPriceHkd);
        if (h.perUserPurchaseCap != null) setQuantityCap(h.perUserPurchaseCap);
      }
      if (lid) body.listingId = lid;

      const out = await bookBffJson<PrimaryPurchaseData>("/api/bff/orders/primary", {
        method: "POST",
        body: JSON.stringify(body),
      });

      const paymentUrl = out.data?.paymentUrl?.trim() ?? "";
      if (out.code === 0 && paymentUrl) {
        if (out.data?.orderId) {
          rememberCheckoutOrderId(out.data.orderId);
          if (purchaseMode === "gift" && giftVerifiedEmail) {
            rememberPendingGiftPurchase({
              recipientEmail: giftVerifiedEmail,
              quantity: Math.floor(quantity),
              orderId: out.data.orderId,
            });
          }
        }
        if (!isAllowedPaymentUrl(paymentUrl)) {
          paymentTab?.close();
          setApiCheckoutError(t("purchase.invalidPaymentUrl"));
          return;
        }
        setLastPaymentUrl(paymentUrl);
        navigatePaymentTab(paymentTab, paymentUrl);
        setStep("success");
        return;
      }

      paymentTab?.close();
      setApiCheckoutError(
        bookBffIsTransportIssue(out) ? t("purchase.bffOffline") : resolvePurchaseError(out),
      );
    } catch {
      paymentTab?.close();
      setApiCheckoutError(t("purchase.bffOffline"));
    } finally {
      setCheckoutBusy(false);
    }
  };

  const handleReopenStripe = () => {
    if (!lastPaymentUrl) return;
    navigatePaymentTab(reservePaymentTab(), lastPaymentUrl);
  };

  const purchaseDisabled =
    checkoutBusy ||
    primarySaleUnavailable !== null ||
    bffSessionOk === false ||
    !canPurchaseViaBff ||
    !giftRecipientReady ||
    (!!primarySaleId && !envListingId && saleListingFetchState === "loading");

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
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-gold/90 mb-2">
                  {t("purchase.premiumTierLabel")}
                </p>
                <h2 className="font-display text-2xl mb-2">{t("purchase.selectQuantity")}</h2>
                <p className="text-sm text-muted-foreground">{t("purchase.pricePerNFT")} HK$ {pricePerNFT}</p>
                <p className="text-xs text-muted-foreground mt-3 leading-relaxed">
                  {t("purchase.stripePriceNote")}
                </p>
                {primarySaleUnavailable ? (
                  <p
                    className="text-xs text-amber-500/95 text-center mt-4 leading-relaxed whitespace-pre-line"
                    role="alert"
                  >
                    {t(`purchase.primarySaleUnavailable.${primarySaleUnavailable}`)}
                  </p>
                ) : null}
              </div>

              <div className="mb-6 grid grid-cols-2 gap-2 rounded-xl border border-border p-1 bg-muted/20">
                <button
                  type="button"
                  onClick={() => {
                    setPurchaseMode("self");
                    resetGiftRecipient();
                    setApiCheckoutError(null);
                  }}
                  className={`inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                    purchaseMode === "self"
                      ? "bg-card border border-gold/40 text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <User className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
                  {t("giftPurchase.modeSelf")}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPurchaseMode("gift");
                    resetGiftRecipient();
                    setApiCheckoutError(null);
                  }}
                  className={`inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                    purchaseMode === "gift"
                      ? "bg-card border border-gold/40 text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Gift className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
                  {t("giftPurchase.modeGift")}
                </button>
              </div>

              {purchaseMode === "gift" ? (
                <div className="mb-6 space-y-3 rounded-xl border border-border bg-accent/20 p-4">
                  <p className="text-sm text-muted-foreground leading-relaxed">{t("giftPurchase.intro")}</p>
                  <div>
                    <label className="text-xs text-muted-foreground">{t("giftPurchase.recipientEmailLabel")}</label>
                    <input
                      type="email"
                      value={giftRecipientEmail}
                      onChange={(e) => {
                        setGiftRecipientEmail(e.target.value);
                        resetGiftRecipient();
                      }}
                      className="mt-1 w-full px-4 py-3 rounded-xl bg-input-background border border-border focus:border-gold/50 focus:outline-none text-sm"
                      placeholder="friend@example.com"
                      autoComplete="email"
                    />
                  </div>
                  {giftVerifiedEmail ? (
                    <p className="text-xs text-emerald-600/90 dark:text-emerald-400/90 leading-relaxed">
                      {giftRecipientExists
                        ? t("giftPurchase.recipientExists")
                        : t("giftPurchase.recipientWillProvision")}
                    </p>
                  ) : (
                    <button
                      type="button"
                      disabled={giftLookupBusy || !giftRecipientEmail.includes("@")}
                      onClick={() => void handleGiftRecipientLookup()}
                      className="w-full flex items-center justify-center gap-2 rounded-xl border border-border px-4 py-3 text-sm hover:border-gold/50 hover:bg-accent/40 transition-colors disabled:opacity-50"
                    >
                      <Mail className="h-4 w-4" aria-hidden />
                      {giftLookupBusy ? t("common.loading") : t("giftPurchase.confirmRecipient")}
                    </button>
                  )}
                </div>
              ) : null}

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
                    onClick={() => setQuantity(Math.min(quantityCap, quantity + 1))}
                    className="p-3 rounded-xl border border-border hover:border-gold/50 hover:bg-accent/50 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={quantity >= quantityCap}
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

                {cryptoPayEnabled ? (
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setCheckoutPaymentChannel("stripe")}
                      className={`rounded-xl border px-3 py-2 text-sm transition-colors ${
                        checkoutPaymentChannel === "stripe"
                          ? "border-gold bg-gold/15 text-foreground"
                          : "border-border text-muted-foreground hover:border-gold/40"
                      }`}
                    >
                      Card / Alipay
                    </button>
                    <button
                      type="button"
                      onClick={() => setCheckoutPaymentChannel("crypto")}
                      className={`rounded-xl border px-3 py-2 text-sm transition-colors ${
                        checkoutPaymentChannel === "crypto"
                          ? "border-gold bg-gold/15 text-foreground"
                          : "border-border text-muted-foreground hover:border-gold/40"
                      }`}
                    >
                      Pay with $U (BSC)
                    </button>
                  </div>
                ) : null}
              </div>

              <button
                type="button"
                disabled={purchaseDisabled}
                onClick={() => void handleCheckout()}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-gold to-gold-dark hover:from-gold-light hover:to-gold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="text-primary-foreground font-medium">
                  {checkoutBusy
                    ? t("purchase.checkoutBusy")
                    : purchaseMode === "gift"
                      ? t("giftPurchase.confirmGiftPurchase")
                      : t("purchase.confirmPurchase")}
                </span>
              </button>

              {apiCheckoutError ? (
                <p className="text-xs text-red-400/95 text-center mt-3" role="alert">
                  {apiCheckoutError}
                </p>
              ) : null}

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

              <h2 className="font-display text-2xl mb-2">{t("purchase.stripeOpenedTitle")}</h2>
              <p className="text-muted-foreground mb-4 leading-relaxed text-sm">
                {purchaseMode === "gift" && giftVerifiedEmail
                  ? t("giftPurchase.successStripe", { email: giftVerifiedEmail, count: quantity })
                  : t("purchase.successBffStripe")}
              </p>
              <p className="text-muted-foreground mb-8 text-xs leading-relaxed">
                {t("purchase.stripeOpenedHint", {
                  dex: IPDEX_PRODUCT_NAME,
                  chain: DATADANCE_CHAIN_NAME,
                })}
              </p>

              <div className="space-y-3">
                {lastPaymentUrl ? (
                  <button
                    type="button"
                    onClick={handleReopenStripe}
                    className="w-full py-3 rounded-xl border border-gold/50 text-gold hover:bg-gold/10 transition-colors text-sm flex items-center justify-center gap-2"
                  >
                    <ExternalLink className="w-4 h-4" aria-hidden />
                    {t("purchase.reopenStripe")}
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
    </OverlayPortal>
  );
}
