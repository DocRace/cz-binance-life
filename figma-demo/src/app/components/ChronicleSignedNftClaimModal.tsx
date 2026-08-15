import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { Award, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import OverlayPortal from "./OverlayPortal";
import { overlayBackdropClassLight } from "../lib/overlayLayers";
import { bookBffIsTransportIssue, bookBffJson } from "../../lib/bookBffClient";
import { getBookChronicleAirdropPublicCode } from "../../config/platform";

type Props = {
  open: boolean;
  onClose: () => void;
  /** Called after a successful login so the parent can refresh session state. */
  onAuthed?: () => void;
};

type Step = "login" | "claim" | "success";

type AirdropClaimRow = {
  c_status?: string;
  c_id?: number;
};

/**
 * Free My Binance Life activity FD claim on the chronicle result page.
 * Uses a dedicated airdrop campaign — not the standard/premium membership series.
 */
export default function ChronicleSignedNftClaimModal({ open, onClose, onAuthed }: Props) {
  const { t } = useTranslation();
  const publicCode = useMemo(() => getBookChronicleAirdropPublicCode(), []);
  const [step, setStep] = useState<Step>("login");
  const [loginSubStep, setLoginSubStep] = useState<"email" | "otp">("email");
  const [emailInput, setEmailInput] = useState("");
  const [otpInput, setOtpInput] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [claimBusy, setClaimBusy] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [claimStatus, setClaimStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancel = false;
    setApiError(null);
    setLoginSubStep("email");
    setClaimStatus(null);
    (async () => {
      try {
        const s = await bookBffJson<{ authenticated?: boolean }>("/api/bff/auth/session");
        if (cancel) return;
        if (s.code === 0 && s.data?.authenticated) {
          setStep("claim");
          onAuthed?.();
        } else {
          setStep("login");
        }
      } catch {
        if (!cancel) setStep("login");
      }
    })();
    return () => {
      cancel = true;
    };
  }, [open, onAuthed]);

  if (!open) return null;

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
        onAuthed?.();
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
    if (!publicCode) {
      setApiError(t("airdropClaim.configMissing"));
      return;
    }
    setClaimBusy(true);
    setApiError(null);
    try {
      const out = await bookBffJson<{
        claim?: AirdropClaimRow;
        fulfillment?: { distributed?: boolean; tokenId?: string };
      }>("/api/bff/airdrop/claim", {
        method: "POST",
        body: JSON.stringify({ publicCode }),
      });
      if (out.code === 0) {
        setClaimStatus(out.data?.claim?.c_status ?? "pending");
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

  return (
    <OverlayPortal>
      <div
        className={overlayBackdropClassLight}
        role="presentation"
        onClick={onClose}
        onKeyDown={(e) => {
          if (e.key === "Escape") onClose();
        }}
      >
        <div
          role="dialog"
          aria-modal="true"
          className="relative z-[1] max-h-[85vh] w-full max-w-[400px] overflow-y-auto rounded-[1.75rem] border border-gold/20 bg-[#2c2824] p-5 shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={onClose}
            className="absolute right-3 top-3 rounded-full p-1.5 text-muted-foreground hover:bg-white/5 hover:text-foreground"
            aria-label={t("common.close")}
          >
            <X className="h-5 w-5" />
          </button>

          <div className="mb-4 flex items-center gap-3 pr-8">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gold/15 ring-1 ring-gold/35">
              <Award className="h-5 w-5 text-gold" aria-hidden />
            </span>
            <div>
              <p className="text-xs text-gold/80">{t("account.czSignedNft.title")}</p>
              <h2 className="font-display text-xl text-foreground">
                {step === "login"
                  ? t("chronicle.nftLoginTitle")
                  : step === "claim"
                    ? t("chronicle.nftClaimTitle")
                    : t("chronicle.nftClaimSuccessTitle")}
              </h2>
            </div>
          </div>

          {apiError ? (
            <p className="mb-3 text-sm text-destructive" role="alert">
              {apiError}
            </p>
          ) : null}

          {step === "login" ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">{t("chronicle.nftLoginIntro")}</p>
              {loginSubStep === "email" ? (
                <>
                  <label className="block text-xs text-muted-foreground" htmlFor="chronicle-nft-email">
                    {t("purchase.emailLabel")}
                  </label>
                  <input
                    id="chronicle-nft-email"
                    type="email"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    className="w-full rounded-full border border-border bg-input-background px-5 py-3 text-sm outline-none focus:border-gold/50"
                    autoComplete="email"
                    disabled={authBusy}
                  />
                  <button
                    type="button"
                    onClick={() => void handleSendCode()}
                    disabled={authBusy || !emailInput.includes("@")}
                    className="inline-flex w-full items-center justify-center rounded-full bg-gradient-to-r from-gold to-gold-light px-6 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-40"
                  >
                    {authBusy ? t("common.loading") : t("purchase.sendCode")}
                  </button>
                </>
              ) : (
                <>
                  <label className="block text-xs text-muted-foreground" htmlFor="chronicle-nft-otp">
                    {t("purchase.otpLabel")}
                  </label>
                  <input
                    id="chronicle-nft-otp"
                    type="text"
                    inputMode="numeric"
                    value={otpInput}
                    onChange={(e) => setOtpInput(e.target.value)}
                    className="w-full rounded-full border border-border bg-input-background px-5 py-3 font-tech text-sm outline-none focus:border-gold/50"
                    disabled={authBusy}
                  />
                  <button
                    type="button"
                    onClick={() => void handleVerifyOtp()}
                    disabled={authBusy || !otpInput.trim()}
                    className="inline-flex w-full items-center justify-center rounded-full bg-gradient-to-r from-gold to-gold-light px-6 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-40"
                  >
                    {authBusy ? t("common.loading") : t("purchase.verifyAndContinue")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setLoginSubStep("email")}
                    className="w-full text-center text-xs text-muted-foreground"
                  >
                    {t("chronicle.nftLoginBackEmail")}
                  </button>
                </>
              )}
            </div>
          ) : null}

          {step === "claim" ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">{t("chronicle.nftClaimIntro")}</p>
              <p className="text-xs text-muted-foreground/80">{t("chronicle.nftClaimDdcHint")}</p>
              <button
                type="button"
                onClick={() => void handleClaim()}
                disabled={claimBusy || !publicCode}
                className="inline-flex w-full items-center justify-center rounded-full bg-gradient-to-r from-gold to-gold-light px-6 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-40"
              >
                {claimBusy ? t("common.loading") : t("chronicle.nftClaimCta")}
              </button>
            </div>
          ) : null}

          {step === "success" ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                {claimStatus === "distributed"
                  ? t("chronicle.nftClaimSuccessDistributed")
                  : t("chronicle.nftClaimSuccessPending")}
              </p>
              <Link
                to="/account"
                onClick={onClose}
                className="inline-flex w-full items-center justify-center rounded-full border border-gold/40 bg-gold/5 px-6 py-3 text-sm text-gold"
              >
                {t("airdropClaim.viewAccount")}
              </Link>
              <button
                type="button"
                onClick={onClose}
                className="inline-flex w-full items-center justify-center rounded-full border border-border px-6 py-3 text-sm"
              >
                {t("common.close")}
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </OverlayPortal>
  );
}
