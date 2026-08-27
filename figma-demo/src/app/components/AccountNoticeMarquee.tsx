import { useTranslation } from "react-i18next";

type AccountNoticeMarqueeProps = {
  className?: string;
};

/** Seamless anti-fraud ticker. Two identical halves so -50% loops without a gap. */
export default function AccountNoticeMarquee({ className = "mb-6" }: AccountNoticeMarqueeProps) {
  const { t } = useTranslation();
  const text = t("account.antiFraudMarquee");
  const units = [0, 1, 2, 3];

  return (
    <div
      className={`overflow-hidden rounded-full border border-gold/25 bg-[#1a1714]/55 py-1.5 ${className}`}
      role="note"
    >
      <div className="account-notice-marquee flex w-max whitespace-nowrap text-[11px] leading-relaxed tracking-wide text-gold/75">
        {units.map((i) => (
          <span key={i} className="shrink-0 px-8" aria-hidden={i > 0}>
            {text}
          </span>
        ))}
      </div>
    </div>
  );
}
