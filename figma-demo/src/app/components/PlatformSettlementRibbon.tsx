import { Layers } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "./ui/utils";
import {
  DATADANCE_CHAIN_ID,
  DATADANCE_CHAIN_NAME,
  getDatadanceExplorerUrl,
  IPDEX_PRODUCT_NAME,
} from "../../config/platform";

type Variant = "default" | "subtle";

export default function PlatformSettlementRibbon({
  className,
  variant = "default",
}: {
  className?: string;
  variant?: Variant;
}) {
  const { t } = useTranslation();
  const explorer = getDatadanceExplorerUrl();

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
      <p className="text-center text-[11px] sm:text-xs text-muted-foreground leading-snug tracking-wide flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
        <Layers className="h-3.5 w-3.5 shrink-0 text-gold" aria-hidden />
        <span>
          {t("platform.settlementStack", {
            dex: IPDEX_PRODUCT_NAME,
            chain: DATADANCE_CHAIN_NAME,
            chainId: DATADANCE_CHAIN_ID,
          })}
        </span>
        <span className="text-muted-foreground/50 hidden sm:inline" aria-hidden>
          ·
        </span>
        <a
          href={explorer}
          target="_blank"
          rel="noopener noreferrer"
          className="font-tech text-[11px] text-stone-400/85 hover:text-stone-400 hover:underline underline-offset-2 shrink-0"
        >
          {t("platform.chainExplorer")}
        </a>
      </p>
    </div>
  );
}
