import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { Gift, Mail, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import PlatformSettlementRibbon from "./PlatformSettlementRibbon";
import {
  getBookStandardAirdropPublicCode,
  getBookStandardCollectionId,
} from "../../config/platform";
import { bookBffJson, bookBffIsTransportIssue } from "../../lib/bookBffClient";

interface AirdropClaimModalProps {
  onClose: () => void;
}

type Step = "login" | "claim" | "success";

type AirdropCampaignBundle = {
  campaign?: {
    title?: string;
    publicCode?: string;
    collectionId?: string;
  };
  collection?: {
    name?: string;
    cover?: string;
    supportsAirdrop?: boolean;
  };
  claimAllowed?: boolean;
};

type AirdropClaimRow = {
  c_status?: string;
};

function claimStatusKey(status: string | undefined): "pending" | "distributed" | "failed" | "unknown" {
  const s = `${status ?? ""}`.trim().toLowerCase();
  if (s === "pending") return "pending";
  if (s === "distributed") return "distributed";
  if (s === "failed") return "failed";
  return "unknown";
}

export default function AirdropClaimModal({ onClose }: AirdropClaimModalProps) {
  const { t } = useTranslation();
  const publicCode = useMemo(() => getBookStandardAirdropPublicCode(), []);
  const expectedCollectionId = useMemo(() => getBookStandardCollectionId().toLowerCase(), []);

  const [step, setStep] = useState<Step>("login");
  const [loginSubStep, setLoginSubStep] = useState<"email" | "otp">("email");
  const [emailInput, setEmailInput] = useState("");
  const [otpInput, setOtpInput] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [claimBusy, setClaimBusy] = useState(false);
  const [bffSessionOk, setBffSessionOk] = useState<boolean | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  const [campaignLoadState, setCampaignLoadState] = useState<"idle" | "loading" | "ok" | "fail">("idle");
  const [bundle, setBundle] = useState<AirdropCampaignBundle | null>(null);
  const [existingClaim, setExistingClaim] = useState<AirdropClaimRow | null>(null);
  const [finalClaimStatus, setFinalClaimStatus] = useState<string | undefined>(undefined);

  const campaignQuery = useMemo(() => {
    const q = publicCode ? `?publicCode=${encodeURIComponent(publicCode)}` : "";
    return q;
  }, [publicCode]);

  const refreshMyClaim = useCallback(async () => {
    if (!publicCode) return;
    const out = await bookBffJson<{ claim?: AirdropClaimRow | null }>(
      `/api/bff/airdrop/my-claim${campaignQuery}`,
    );
    if (out.code === 0 && out.data) {
      setExistingClaim(out.data.claim ?? null);
      if (out.data.claim?.c_status) setFinalClaimStatus(out.data.claim.c_status);
    }
  }, [campaignQuery, publicCode]);

  const loadCampaign = useCallback(async () => {
    if (!publicCode) {
      setCampaignLoadState("fail");
      return;
    }
    setCampaignLoadState("loading");
    const out = await bookBffJson<AirdropCampaignBundle>(`/api/bff/airdrop/campaign${campaignQuery}`);
    if (out.code !== 0 || bookBffIsTransportIssue(out) || !out.data) {
      setCampaignLoadState("fail");
      setBundle(null);
      return;
    }

    const loadedCollectionId = `${out.data.collection?.collectionId ?? out.data.campaign?.collectionId ?? ""}`
      .trim()
      .toLowerCase();
    if (expectedCollectionId && loadedCollectionId && loadedCollectionId !== expectedCollectionId) {
      setCampaignLoadState("fail");
      setBundle(null);
      setApiError(t("airdropClaim.collectionMismatch"));
      return;
    }

    setBundle(out.data);
    setCampaignLoadState("ok");
  }, [campaignQuery, expectedCollectionId, publicCode, t]);

  useEffect(() => {
    void loadCampaign();
  }, [loadCampaign]);

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
          setStep("claim");
          await refreshMyClaim();
        }
      } catch {
        if (!cancel) setBffSessionOk(false);
      }
    })();
    return () => {
      cancel = true;
    };
  }, [refreshMyClaim]);

  const handleSendCode = async () => {
    const email = emailInput.trim();
    if (!email.includes("@")) return;
    setAuthBusy(true);
    setApiError(null);
    try {
      const out = await bookBffJson<null>("/api/bff/auth/send-code", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      if (out.code === 0) {
        setLoginSubStep("otp");
      } else {
        setApiError(
          bookBffIsTransportIssue(out) ? t("airdropClaim.bffOffline") : out.message || t("airdropClaim.authError"),
        );
      }
    } catch {
      setApiError(t("airdropClaim.bffOffline"));
    } finally {
      setAuthBusy(false);
    }
  };

  const handleVerifyOtp = async () => {
    const email = emailInput.trim();
    const code = otpInput.trim();
    if (!email || !code) return;
    setAuthBusy(true);
    setApiError(null);
    try {
      const out = await bookBffJson<{ ok?: boolean }>("/api/bff/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, code }),
      });
      if (out.code === 0) {
        setStep("claim");
        await refreshMyClaim();
      } else {
        setApiError(
          bookBffIsTransportIssue(out) ? t("airdropClaim.bffOffline") : out.message || t("airdropClaim.authError"),
        );
      }
    } catch {
      setApiError(t("airdropClaim.bffOffline"));
    } finally {
      setAuthBusy(false);
    }
  };

  const handleClaim = async () => {
    if (!publicCode) return;
    setClaimBusy(true);
    setApiError(null);
    try {
      const out = await bookBffJson<{
        claim?: AirdropClaimRow;
        fulfillment?: { distributed?: boolean; tokenId?: string };
      }>("/api/bff/airdrop/claim", {
        method: "POST",
        body: JSON.stringify(publicCode ? { publicCode } : {}),
      });
      if (out.code === 0) {
        const status = out.data?.claim?.c_status;
        setFinalClaimStatus(status);
        setExistingClaim(out.data?.claim ?? { c_status: status ?? "pending" });
        setStep("success");
        return;
      }
      const msg = out.message || "";
      setApiError(
        bookBffIsTransportIssue(out)
          ? t("airdropClaim.bffOffline")
          : msg.includes("inventory exhausted") || msg.includes("-10022")
            ? t("airdropClaim.inventoryExhausted")
            : msg.includes("mint failed") || msg.includes("-10023")
              ? t("airdropClaim.mintFailed")
              : msg || t("airdropClaim.claimFailed"),
      );
    } catch {
      setApiError(t("airdropClaim.bffOffline"));
    } finally {
      setClaimBusy(false);
    }
  };

  const claimAllowed = bundle?.claimAllowed !== false && bundle?.collection?.supportsAirdrop !== false;
  const alreadyClaimed = Boolean(existingClaim);
  const statusForSuccess = claimStatusKey(finalClaimStatus ?? existingClaim?.c_status);

  const configMissing = !publicCode;

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

          {configMissing ? (
            <div className="p-8 pt-10 text-center">
              <h2 className="font-display text-2xl mb-3">{t("airdropClaim.title")}</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">{t("airdropClaim.configMissing")}</p>
            </div>
          ) : null}

          {!configMissing && step === "login" ? (
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="p-8 pt-10">
              <div className="text-center mb-8">
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-gold/90 mb-2">
                  {t("airdropClaim.tierLabel")}
                </p>
                <h2 className="font-display text-2xl mb-2">{t("airdropClaim.loginTitle")}</h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {bffSessionOk === false ? t("airdropClaim.bffOffline") : t("airdropClaim.loginIntro")}
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

              {apiError ? <p className="text-xs text-red-400/95 text-center mt-4">{apiError}</p> : null}
            </motion.div>
          ) : null}

          {!configMissing && step === "claim" ? (
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="p-8 pt-10">
              <div className="text-center mb-6">
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-gold/90 mb-2">
                  {t("airdropClaim.tierLabel")}
                </p>
                <h2 className="font-display text-2xl mb-2">{t("airdropClaim.claimTitle")}</h2>
                <p className="text-sm text-muted-foreground leading-relaxed">{t("airdropClaim.claimIntro")}</p>
              </div>

              {campaignLoadState === "loading" ? (
                <p className="text-center text-sm text-muted-foreground py-6">{t("common.loading")}</p>
              ) : null}

              {campaignLoadState === "ok" && bundle ? (
                <div className="mb-6 rounded-xl border border-border bg-accent/20 p-4">
                  {bundle.collection?.cover ? (
                    <img
                      src={bundle.collection.cover}
                      alt=""
                      className="mx-auto mb-3 h-24 w-24 rounded-lg object-cover border border-border/60"
                    />
                  ) : null}
                  <p className="text-center font-display text-lg">{bundle.campaign?.title || bundle.collection?.name}</p>
                  <p className="text-center text-xs text-muted-foreground mt-2">{t("airdropClaim.freeBadgeNote")}</p>
                </div>
              ) : null}

              {campaignLoadState === "fail" ? (
                <p className="text-center text-sm text-amber-500/95 mb-4">{t("airdropClaim.campaignUnavailable")}</p>
              ) : null}

              {alreadyClaimed ? (
                <p className="text-center text-sm text-gold/90 mb-4">
                  {t(`airdropClaim.status.${claimStatusKey(existingClaim?.c_status)}`)}
                </p>
              ) : null}

              {!alreadyClaimed ? (
                <button
                  type="button"
                  disabled={claimBusy || !claimAllowed || campaignLoadState !== "ok"}
                  onClick={() => void handleClaim()}
                  className="w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-gradient-to-r from-gold to-gold-dark hover:from-gold-light hover:to-gold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Gift className="w-5 h-5" />
                  <span>{claimBusy ? t("common.loading") : t("airdropClaim.claimButton")}</span>
                </button>
              ) : (
                <Link
                  to="/account"
                  className="block w-full py-4 rounded-xl bg-gold/90 text-center text-sm font-medium text-primary-foreground hover:bg-gold transition-colors"
                >
                  {t("airdropClaim.viewAccount")}
                </Link>
              )}

              {apiError ? <p className="text-xs text-red-400/95 text-center mt-4">{apiError}</p> : null}

              <p className="text-xs text-muted-foreground text-center mt-6 leading-relaxed">
                {t("airdropClaim.onChainNote")}
              </p>
            </motion.div>
          ) : null}

          {!configMissing && step === "success" ? (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="p-8 pt-10 text-center">
              <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-gold/20 flex items-center justify-center">
                <Gift className="w-8 h-8 text-gold" />
              </div>
              <h2 className="font-display text-2xl mb-3">{t("airdropClaim.successTitle")}</h2>
              <p className="text-sm text-muted-foreground leading-relaxed mb-2">{t("airdropClaim.successMessage")}</p>
              <p className="text-sm text-gold/90 leading-relaxed mb-8">
                {t(`airdropClaim.status.${statusForSuccess}`)}
              </p>
              <Link
                to="/account"
                className="inline-flex w-full items-center justify-center py-4 rounded-xl bg-gold/90 text-sm font-medium text-primary-foreground hover:bg-gold transition-colors"
              >
                {t("airdropClaim.viewAccount")}
              </Link>
              <p className="text-xs text-muted-foreground mt-6 leading-relaxed">{t("airdropClaim.onChainNote")}</p>
            </motion.div>
          ) : null}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
