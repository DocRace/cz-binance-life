import { useState } from "react";
import { motion } from "motion/react";
import { AlertTriangle } from "lucide-react";
import { useTranslation } from "react-i18next";

interface RedeemStaffPanelProps {
  /** Staff verification code typed on the attendee’s device (validated server-side against IPDEX). */
  onConfirm: (staffCode: string) => Promise<void> | void;
  tokenId: string;
  /** Source series UUID submitted with redeem — should match an eligible rule collection in admin. */
  seriesId?: string;
  /** Explains redemption to the holder; omit for concise staff-phone copy (`redeemModalBodyStaff`). */
  description?: string;
  busy?: boolean;
  externalError?: string | null;
  /** When omitted, no Cancel button row is shown (full page relies on explicit back navigation). */
  onCancel?: () => void;
  /** Larger typography / buttons for `/account/redeem` on a phone. */
  dense?: boolean;
}

export default function RedeemStaffPanel({
  onConfirm,
  tokenId,
  seriesId,
  description,
  busy = false,
  externalError = null,
  onCancel,
  dense = false,
}: RedeemStaffPanelProps) {
  const { t } = useTranslation();
  const [staffCode, setStaffCode] = useState("");
  const [localErr, setLocalErr] = useState<string | null>(null);

  const displayErr = externalError || localErr;

  const submit = async () => {
    setLocalErr(null);
    const code = staffCode.trim();
    if (code.length < 4) {
      setLocalErr(t("account.redeemStaffCodeTooShort"));
      return;
    }
    await onConfirm(code);
  };

  const padding = dense ? "p-6 md:p-8" : "p-8";
  const mtForm = dense ? "mt-6" : "mt-8";
  const btnClass = dense ? "py-4 rounded-xl text-base" : "py-3 rounded-xl";

  return (
    <div className={`${padding} text-center`}>
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
        className="w-20 h-20 mx-auto mb-6 rounded-full bg-gold/20 flex items-center justify-center"
      >
        <AlertTriangle className="w-10 h-10 text-gold" />
      </motion.div>

      <h2 className="font-display text-2xl mb-4">{t("account.redeemModalTitle")}</h2>
      <p className="text-muted-foreground mb-4 text-sm leading-relaxed md:text-base">
        {description ?? t("account.redeemModalBodyStaff")}
      </p>
      <p className="font-mono text-[11px] text-muted-foreground/80 mb-2 break-all">{tokenId}</p>
      {seriesId ? (
        <p className="text-[10px] text-muted-foreground/70 mb-6 text-left leading-snug">
          <span className="block uppercase tracking-wide text-muted-foreground/90 mb-0.5">
            {t("account.redeemSeriesUuidLabel")}
          </span>
          <span className="font-mono break-all">{seriesId}</span>
        </p>
      ) : (
        <div className="mb-6" aria-hidden />
      )}

      <label className="block text-left text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
        {t("account.redeemStaffLabel")}
      </label>
      <input
        type="text"
        inputMode="text"
        autoComplete="off"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        value={staffCode}
        disabled={busy}
        onChange={(e) => setStaffCode(e.target.value)}
        placeholder={t("account.redeemStaffPlaceholder")}
        className="w-full rounded-xl border border-border bg-background px-4 py-4 text-lg outline-none focus-visible:ring-2 focus-visible:ring-gold/40 disabled:opacity-60 md:py-3 md:text-base"
      />

      {displayErr ? (
        <p
          className={`mt-4 text-sm ${dense ? "md:text-base" : ""} text-red-400/95 text-center leading-relaxed whitespace-pre-line`}
        >
          {displayErr}
        </p>
      ) : null}

      <div className={`flex flex-col-reverse gap-3 sm:flex-row ${mtForm}`}>
        {onCancel ? (
          <button
            type="button"
            disabled={busy}
            onClick={busy ? undefined : onCancel}
            className={`flex-1 border border-border hover:bg-accent transition-colors duration-300 disabled:opacity-50 ${btnClass}`}
          >
            <span className="text-muted-foreground">{t("common.cancel")}</span>
          </button>
        ) : null}
        <button
          type="button"
          disabled={busy}
          onClick={submit}
          className={`${onCancel ? "flex-1 sm:flex-1" : "w-full"} bg-gradient-to-r from-gold to-gold-dark hover:from-gold-light hover:to-gold transition-all duration-300 disabled:opacity-50 ${btnClass}`}
        >
          <span className="text-primary-foreground font-medium">
            {busy ? t("account.redeemSubmitting") : t("account.redeemSubmit")}
          </span>
        </button>
      </div>
      {!onCancel ? <p className="mt-4 text-xs text-muted-foreground leading-relaxed">{t("account.redeemStaffAssistHint")}</p> : null}
    </div>
  );
}
