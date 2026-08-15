import { useCallback, useEffect, useMemo, useState } from "react";
import { Award, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { getBookChronicleAirdropPublicCode } from "../../config/platform";
import { bookBffIsTransportIssue, bookBffJson } from "../../lib/bookBffClient";
import ChronicleSignedNftClaimModal from "./ChronicleSignedNftClaimModal";
import { CARD_SURFACE } from "../layout/pageLayout";

type ClaimRow = { c_status?: string };

/**
 * Account CTA for My Binance Life (chronicle) activity FD proof.
 * Separate free series — does not replace standard/premium membership badges.
 * Once claimed, the NFT appears in the chronicle FD gallery — hide this CTA.
 */
export default function CzSignedNftPanel() {
  const { t } = useTranslation();
  const publicCode = useMemo(() => getBookChronicleAirdropPublicCode(), []);
  const [loading, setLoading] = useState(true);
  const [claimed, setClaimed] = useState(false);
  const [claimOpen, setClaimOpen] = useState(false);

  const refresh = useCallback(async () => {
    if (!publicCode) {
      setLoading(false);
      setClaimed(false);
      return;
    }
    setLoading(true);
    try {
      const out = await bookBffJson<{ claim?: ClaimRow | null }>(
        `/api/bff/airdrop/my-claim?publicCode=${encodeURIComponent(publicCode)}`,
      );
      if (out.code === 0) {
        const status = `${out.data?.claim?.c_status || ""}`.toLowerCase();
        setClaimed(status === "distributed" || status === "pending");
      } else if (!bookBffIsTransportIssue(out)) {
        setClaimed(false);
      }
    } finally {
      setLoading(false);
    }
  }, [publicCode]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  if (!publicCode) return null;
  if (!loading && claimed) return null;

  return (
    <>
      <section className={`${CARD_SURFACE} mb-10 p-5 sm:p-6`}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gold/15 ring-1 ring-gold/35">
              <Award className="h-6 w-6 text-gold" aria-hidden />
            </span>
            <div>
              <h2 className="font-display text-xl text-foreground">{t("account.czSignedNft.title")}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{t("account.czSignedNft.subtitle")}</p>
            </div>
          </div>
          {loading ? (
            <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              {t("common.loading")}
            </span>
          ) : (
            <button
              type="button"
              onClick={() => setClaimOpen(true)}
              className="inline-flex items-center justify-center rounded-full bg-gold/90 px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-gold"
            >
              {t("account.czSignedNft.claimCta")}
            </button>
          )}
        </div>
      </section>

      <ChronicleSignedNftClaimModal
        open={claimOpen}
        onClose={() => {
          setClaimOpen(false);
          void refresh();
        }}
      />
    </>
  );
}
