import { Layers, SquareArrowOutUpRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "./ui/utils";
import { getDatadanceSiteUrl } from "../../config/platform";

type Variant = "default" | "subtle";

export default function PlatformSettlementRibbon({
  className,
  variant = "default",
}: {
  className?: string;
  variant?: Variant;
}) {
  const { t } = useTranslation();
  const datadanceHref = getDatadanceSiteUrl();

  return (
    <div
      className={cn(
        "relative overflow-hidden px-6 py-3",
        variant === "default"
          ? "border-b border-border/50 bg-gradient-to-r from-gold/[0.07] via-background/80 to-stone-400/[0.06]"
          : "rounded-xl border border-border/45 bg-muted/20",
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-y-0 left-0 w-px bg-gradient-to-b from-transparent via-gold/40 to-transparent" />
      <p className="mx-auto flex max-w-full flex-wrap items-center justify-center gap-x-2 gap-y-1 text-center text-[11px] leading-snug tracking-wide text-muted-foreground sm:text-xs">
        <Layers className="h-3.5 w-3.5 shrink-0 text-gold" aria-hidden />
        <a
          href={datadanceHref}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-w-0 max-w-full items-center gap-1 font-tech text-[11px] text-muted-foreground hover:text-gold/90 transition-colors"
        >
          <span className="text-balance">{t("platform.poweredByDataDanceChain")}</span>
          <SquareArrowOutUpRight className="h-3 w-3 shrink-0 opacity-90" aria-hidden />
        </a>
      </p>
    </div>
  );
}
