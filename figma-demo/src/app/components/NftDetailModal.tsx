import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ExternalLink, Loader2, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import OverlayPortal from "./OverlayPortal";
import { overlayBackdropClass } from "../lib/overlayLayers";
import {
  DATADANCE_CHAIN_ID,
  DATADANCE_CHAIN_NAME,
  getDatadanceExplorerUrl,
} from "../../config/platform";
import {
  type DisplayNft,
  fetchNftDetailBundle,
  isPremiumAttendanceStub,
  isRedeemEligible,
  isStandardMembershipNft,
  pickNftImageUrl,
  strField,
} from "../../lib/bookAccountNftApi";

interface NftDetailModalProps {
  nft: DisplayNft;
  onClose: () => void;
  onRedeem?: (nft: DisplayNft) => void;
}

function parseMetadataAttributes(raw: unknown): Array<{ trait: string; value: string }> {
  if (raw == null) return [];
  let meta: Record<string, unknown> | null = null;
  if (typeof raw === "string") {
    try {
      meta = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return [];
    }
  } else if (typeof raw === "object" && !Array.isArray(raw)) {
    meta = raw as Record<string, unknown>;
  }
  if (!meta) return [];
  const attrs = meta.attributes;
  if (!Array.isArray(attrs)) return [];
  return attrs
    .map((a) => {
      if (typeof a !== "object" || a === null) return null;
      const o = a as Record<string, unknown>;
      const trait = `${o.trait_type ?? o.trait ?? ""}`.trim();
      const val = o.value;
      const value =
        typeof val === "object" && val !== null ? JSON.stringify(val) : `${val ?? ""}`.trim();
      if (!trait && !value) return null;
      return { trait: trait || "—", value: value || "—" };
    })
    .filter(Boolean) as Array<{ trait: string; value: string }>;
}

function formatHkdFromCents(cents: unknown): string {
  const n =
    typeof cents === "bigint"
      ? Number(cents)
      : typeof cents === "number"
        ? cents
        : Number(`${cents ?? ""}`);
  if (!Number.isFinite(n)) return "—";
  return (n / 100).toFixed(2);
}

function formatDateTime(raw: unknown): string {
  const s = `${raw ?? ""}`.trim();
  if (!s) return "—";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s.slice(0, 19).replace("T", " ");
  return d.toLocaleString();
}

function recordField(row: Record<string, unknown> | null | undefined, keys: string[]): string {
  if (!row) return "";
  return strField(row, keys);
}

export default function NftDetailModal({ nft, onClose, onRedeem }: NftDetailModalProps) {
  const { t, i18n } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [bundle, setBundle] = useState<Awaited<ReturnType<typeof fetchNftDetailBundle>>>(null);

  useEffect(() => {
    let cancel = false;
    void (async () => {
      setLoading(true);
      const cid = nft.collectionId?.trim();
      if (!cid) {
        setBundle(null);
        setLoading(false);
        return;
      }
      const data = await fetchNftDetailBundle(cid, nft.tokenId);
      if (!cancel) {
        setBundle(data);
        setLoading(false);
      }
    })();
    return () => {
      cancel = true;
    };
  }, [nft.collectionId, nft.tokenId]);

  const info = bundle?.info ?? null;
  const balance = bundle?.balance ?? null;
  const infoRec = info && typeof info === "object" ? info : null;
  const balanceRec = balance && typeof balance === "object" ? balance : null;
  const collection =
    infoRec && typeof infoRec.collection === "object" && infoRec.collection !== null
      ? (infoRec.collection as Record<string, unknown>)
      : null;

  const imageUrl = useMemo(() => {
    if (infoRec) {
      const fromInfo = pickNftImageUrl(infoRec);
      if (fromInfo) return fromInfo;
    }
    if (balanceRec) {
      const fromBal = pickNftImageUrl(balanceRec);
      if (fromBal) return fromBal;
    }
    return nft.imageUrl ?? "";
  }, [infoRec, balanceRec, nft.imageUrl]);

  const title =
    recordField(infoRec, ["c_name", "name"]) ||
    recordField(balanceRec, ["c_name", "name"]) ||
    nft.name ||
    `#${nft.tokenId}`;

  const collectionName =
    recordField(collection, ["c_name", "name"]) || nft.collectionName || "—";

  const partnerName = recordField(collection, ["c_partner_name", "partnerName"]) || "—";
  const ercType = recordField(collection, ["c_erc_type", "ercType"]) || recordField(balanceRec, ["c_erc_type"]);
  const contractAddress = recordField(collection, ["c_contract_address", "contractAddress"]);
  const chainId = recordField(collection, ["c_chain_id", "chainId"]) || DATADANCE_CHAIN_ID;
  const explorer = getDatadanceExplorerUrl();

  const royaltyBps = collection?.c_royalty_bps ?? collection?.royalty_bps;
  const royaltyLabel = (() => {
    const n = typeof royaltyBps === "bigint" ? Number(royaltyBps) : Number(`${royaltyBps ?? ""}`);
    return Number.isFinite(n) ? `${n / 100}%` : "—";
  })();

  const description = recordField(infoRec, ["c_description", "description"]) || "—";
  const benefitsRaw = collection?.c_extra_description;
  let benefits = "—";
  if (benefitsRaw && typeof benefitsRaw === "object" && !Array.isArray(benefitsRaw)) {
    const lang = i18n.resolvedLanguage || "en";
    const o = benefitsRaw as Record<string, unknown>;
    benefits = `${o[lang] ?? o.en ?? o.zh ?? ""}`.trim() || "—";
  }

  const metadataSource = infoRec?.c_metadata ?? infoRec?.metadata ?? balanceRec?.c_metadata;
  const attributes = parseMetadataAttributes(metadataSource);

  const buyPriceHkd = formatHkdFromCents(balanceRec?.c_last_buy_price_hkd);
  const buyTime = formatDateTime(balanceRec?.c_last_buy_time);
  const holdQty = recordField(balanceRec, ["c_balance", "balance"]) || "1";
  const listedQty = recordField(balanceRec, ["c_locked_balance", "lockedBalance"]);

  const tokenIdDisplay = recordField(infoRec, ["c_token_id", "token_id"]) || nft.tokenId;
  const collectionIdDisplay = nft.collectionId || recordField(balanceRec, ["c_collection_id"]);

  const stub = isPremiumAttendanceStub(nft);
  const standard = isStandardMembershipNft(nft);
  const canRedeem = onRedeem && isRedeemEligible(nft);

  return (
    <OverlayPortal>
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className={overlayBackdropClass}
          onClick={onClose}
        >
        <motion.div
          initial={{ scale: 0.94, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.94, opacity: 0 }}
          transition={{ type: "spring", duration: 0.45 }}
          className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl border border-border bg-card shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={onClose}
            className="absolute top-3 right-3 z-10 rounded-full bg-card/95 p-2 ring-1 ring-border hover:bg-accent"
            aria-label={t("common.close")}
          >
            <X className="w-5 h-5" />
          </button>

          {loading ? (
            <div className="flex flex-col items-center justify-center gap-3 py-24 text-muted-foreground">
              <Loader2 className="w-8 h-8 animate-spin text-gold" />
              <p>{t("nftDetailModal.loading")}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
              <div className="p-6 md:p-8 flex items-center justify-center bg-muted/20 border-b md:border-b-0 md:border-r border-border min-h-[280px]">
                {imageUrl ? (
                  <img
                    src={imageUrl}
                    alt={title}
                    className="max-h-[min(420px,50vh)] w-full object-contain rounded-xl"
                  />
                ) : (
                  <div className="w-full aspect-square max-w-sm rounded-xl bg-gradient-to-br from-gold/30 to-muted flex items-center justify-center text-muted-foreground text-sm">
                    {t("nftDetailModal.noImage")}
                  </div>
                )}
              </div>

              <div className="p-6 md:p-8 space-y-6">
                <div>
                  <p className="text-xs uppercase tracking-[0.14em] text-gold/80 mb-1">
                    {stub
                      ? t("nftDetailModal.tierStub")
                      : standard
                        ? t("nftDetailModal.tierStandard")
                        : t("nftDetailModal.tierPremium")}
                  </p>
                  <h2 className="font-display text-2xl md:text-3xl leading-tight">{title}</h2>
                  <p className="text-sm text-muted-foreground mt-2">{collectionName}</p>
                </div>

                <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
                  <span>
                    <span className="text-muted-foreground">{t("nftDetailModal.ipParty")}: </span>
                    {partnerName}
                  </span>
                  <span className="text-border">|</span>
                  <span>
                    <span className="text-muted-foreground">{t("nftDetailModal.category")}: </span>
                    {collectionName}
                  </span>
                  <span className="text-border">|</span>
                  <span>
                    <span className="text-muted-foreground">{t("nftDetailModal.royalties")}: </span>
                    {royaltyLabel}
                  </span>
                </div>

                <div className="rounded-xl border border-border bg-accent/20 p-4 grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground text-xs mb-1">{t("nftDetailModal.purchasePrice")}</p>
                    <p className="font-tech">HK$ {buyPriceHkd}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs mb-1">{t("nftDetailModal.purchaseTime")}</p>
                    <p className="font-tech text-xs leading-relaxed">{buyTime}</p>
                  </div>
                  {ercType === "1155" ? (
                    <>
                      <div>
                        <p className="text-muted-foreground text-xs mb-1">{t("nftDetailModal.holdQuantity")}</p>
                        <p className="font-tech">{holdQty}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs mb-1">{t("nftDetailModal.listedQuantity")}</p>
                        <p className="font-tech">{listedQty || "0"}</p>
                      </div>
                    </>
                  ) : null}
                </div>

                {canRedeem ? (
                  <button
                    type="button"
                    onClick={() => onRedeem(nft)}
                    className="w-full py-3 rounded-xl border border-gold/50 text-gold hover:bg-gold/10 text-sm font-medium"
                  >
                    {t("account.redeemDemoCta")}
                  </button>
                ) : null}

                <section className="space-y-3">
                  <h3 className="text-sm font-medium uppercase tracking-wide text-foreground/90">
                    {t("nftDetailModal.nftDetails")}
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div>
                      <p className="text-muted-foreground text-xs">{t("nftDetailModal.description")}</p>
                      <p className="leading-relaxed mt-1">{description}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">{t("nftDetailModal.benefitsDescription")}</p>
                      <p className="leading-relaxed mt-1">{benefits}</p>
                    </div>
                  </div>
                </section>

                <section className="space-y-3">
                  <h3 className="text-sm font-medium uppercase tracking-wide text-foreground/90">
                    {t("nftDetailModal.blockchainDetails")}
                  </h3>
                  <dl className="space-y-2 text-sm">
                    <div className="flex justify-between gap-3">
                      <dt className="text-muted-foreground shrink-0">{t("nftDetailModal.contractAddress")}</dt>
                      <dd className="font-mono text-xs text-right break-all">
                        {contractAddress ? (
                          <a
                            href={`${explorer}/address/${contractAddress}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-gold hover:underline inline-flex items-center gap-1"
                          >
                            {contractAddress.slice(0, 10)}…{contractAddress.slice(-8)}
                            <ExternalLink className="w-3 h-3 shrink-0" />
                          </a>
                        ) : (
                          "—"
                        )}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="text-muted-foreground">{t("nftDetailModal.tokenId")}</dt>
                      <dd className="font-tech">{tokenIdDisplay}</dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="text-muted-foreground">{t("nftDetailModal.chain")}</dt>
                      <dd>
                        {DATADANCE_CHAIN_NAME} ({chainId})
                      </dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="text-muted-foreground">{t("nftDetailModal.tokenStandard")}</dt>
                      <dd>{ercType ? `ERC-${ercType}` : "—"}</dd>
                    </div>
                    {collectionIdDisplay ? (
                      <div className="flex justify-between gap-3">
                        <dt className="text-muted-foreground">{t("nftDetailModal.collectionId")}</dt>
                        <dd className="font-mono text-[10px] text-right break-all">{collectionIdDisplay}</dd>
                      </div>
                    ) : null}
                  </dl>
                </section>

                <section className="space-y-3">
                  <h3 className="text-sm font-medium uppercase tracking-wide text-foreground/90">
                    {t("nftDetailModal.attributes")}
                  </h3>
                  {attributes.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{t("nftDetailModal.noAttributes")}</p>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      {attributes.map((a) => (
                        <div
                          key={`${a.trait}-${a.value}`}
                          className="rounded-lg border border-border bg-muted/30 px-3 py-2"
                        >
                          <p className="text-[10px] uppercase text-muted-foreground truncate">{a.trait}</p>
                          <p className="text-sm font-medium truncate">{a.value}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
      </AnimatePresence>
    </OverlayPortal>
  );
}
