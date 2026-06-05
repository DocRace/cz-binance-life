import { Link } from "react-router";
import { motion } from "motion/react";
import { Check, Crown, Gift, Sparkles, ShoppingBag, Users } from "lucide-react";
import { useTranslation } from "react-i18next";

const STANDARD_BENEFIT_KEYS = ["benefit1", "benefit2", "benefit3", "benefit4", "benefit5"] as const;
const PREMIUM_BENEFIT_KEYS = ["benefit1", "benefit2", "benefit3", "benefit4", "benefit5"] as const;

type MembershipTiersProps = {
  onPremiumClick: () => void;
  onStandardClick?: () => void;
  standardHref?: string;
  standardExternal?: boolean;
  className?: string;
};

export default function MembershipTiers({
  onPremiumClick,
  onStandardClick,
  standardHref = "/club",
  standardExternal = false,
  className = "",
}: MembershipTiersProps) {
  const { t } = useTranslation();

  const standardCtaClass =
    "inline-flex w-full items-center justify-center gap-2 rounded-full border border-border px-6 py-3.5 text-sm font-body font-medium tracking-wide text-foreground transition-colors hover:border-gold/40 hover:bg-accent/40";

  const StandardCtaIcon = onStandardClick ? Gift : Users;

  const standardCtaContent = (
    <>
      <StandardCtaIcon className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
      {t("membershipTiers.standard.cta")}
    </>
  );

  return (
    <section className={className} aria-labelledby="membership-tiers-heading">
      <div className="mb-10 text-center md:mb-12">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/5 px-4 py-1.5 text-xs font-medium uppercase tracking-[0.16em] text-gold/90">
          <Sparkles className="size-3.5" aria-hidden />
          {t("membershipTiers.kicker")}
        </div>
        <h2 id="membership-tiers-heading" className="font-display text-3xl md:text-4xl font-medium tracking-tight text-foreground mb-3">
          {t("membershipTiers.title")}
        </h2>
        <p className="mx-auto max-w-2xl text-sm md:text-base text-muted-foreground leading-relaxed">
          {t("membershipTiers.subtitle")}
        </p>
      </div>

      <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-8 lg:items-stretch">
        {/* Premium — left on desktop */}
        <motion.article
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.5 }}
          className="relative flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-gold/45 bg-gradient-to-br from-gold/[0.08] via-card/40 to-card/20 p-6 md:p-8 shadow-[0_0_40px_-12px_rgba(212,175,55,0.25)]"
        >
          <div className="absolute top-4 right-4">
            <span className="inline-flex items-center gap-1 rounded-full border border-gold/50 bg-gold/15 px-3 py-1 text-[10px] font-medium uppercase tracking-wider text-gold">
              <Crown className="h-3 w-3" aria-hidden />
              {t("membershipTiers.premium.badge")}
            </span>
          </div>

          <div className="mb-6 pr-24">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-gold/80 mb-1">
              {t("membershipTiers.premium.tierLabel")}
            </p>
            <h3 className="font-display text-2xl text-foreground mb-2">
              {t("membershipTiers.premium.accessLabel")}
            </h3>
            <p className="font-tech text-3xl text-gold">{t("membershipTiers.premium.price")}</p>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              {t("membershipTiers.premium.tagline")}
            </p>
          </div>

          <ul className="mb-8 flex-1 space-y-3">
            {PREMIUM_BENEFIT_KEYS.map((key) => (
              <li key={key} className="flex items-start gap-3 text-sm leading-relaxed text-foreground/90">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-gold" aria-hidden />
                <span>{t(`membershipTiers.premium.${key}`)}</span>
              </li>
            ))}
          </ul>

          <button
            type="button"
            onClick={onPremiumClick}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-gold to-gold-dark px-6 py-3.5 text-sm font-body font-medium tracking-wide text-primary-foreground transition-all hover:from-gold-light hover:to-gold"
          >
            <ShoppingBag className="h-4 w-4 shrink-0" aria-hidden />
            {t("membershipTiers.premium.cta")}
          </button>
        </motion.article>

        {/* Standard — right on desktop */}
        <motion.article
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.5, delay: 0.08 }}
          className="flex h-full min-h-0 flex-col rounded-2xl border border-border/70 bg-card/25 p-6 md:p-8"
        >
          <div className="mb-6">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground mb-1">
              {t("membershipTiers.standard.tierLabel")}
            </p>
            <h3 className="font-display text-2xl text-foreground mb-2">
              {t("membershipTiers.standard.accessLabel")}
            </h3>
            <p className="font-tech text-3xl text-foreground/90">{t("membershipTiers.standard.price")}</p>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              {t("membershipTiers.standard.tagline")}
            </p>
          </div>

          <ul className="mb-8 flex-1 space-y-3">
            {STANDARD_BENEFIT_KEYS.map((key) => (
              <li key={key} className="flex items-start gap-3 text-sm leading-relaxed text-muted-foreground">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-gold/70" aria-hidden />
                <span>{t(`membershipTiers.standard.${key}`)}</span>
              </li>
            ))}
          </ul>

          {onStandardClick ? (
            <button type="button" onClick={onStandardClick} className={standardCtaClass}>
              {standardCtaContent}
            </button>
          ) : standardExternal ? (
            <a
              href={standardHref}
              target="_blank"
              rel="noopener noreferrer"
              className={standardCtaClass}
            >
              {standardCtaContent}
            </a>
          ) : (
            <Link to={standardHref} className={standardCtaClass}>
              {standardCtaContent}
            </Link>
          )}
        </motion.article>
      </div>
    </section>
  );
}
