import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router";
import { ArrowLeft, ChevronRight, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import NFTBadge from "../components/NFTBadge";
import RedeemStaffPanel from "../components/RedeemStaffPanel";
import { bookBffIsTransportIssue, bookBffJson } from "../../lib/bookBffClient";
import { bookBffJsonWithRefresh } from "../../lib/bookBffWithRefresh";
import {
  BOOK_NFT_COLLECTION_UUID_RE,
  type DisplayNft,
  fetchNftBffPagesMerged,
  filterCzLifeDisplayNfts,
  isRedeemEligible,
  mapNftRow,
} from "../../lib/bookAccountNftApi";
import { buildClubRedeemPostJsonPayload, localizedBookRedeemFailureMessage, logClubRedeemResponseIfDebugging, normalizeRedeemSourceTokenId } from "../../lib/bookRedeemClient";
import { getBookNftRedemptionRuleId } from "../../config/platform";
import { toast } from "sonner";

const UUID_RE = BOOK_NFT_COLLECTION_UUID_RE;

export default function AccountRedeem() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const [sessionChecking, setSessionChecking] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [nftsLoading, setNftsLoading] = useState(false);
  const [displayNfts, setDisplayNfts] = useState<DisplayNft[]>([]);
  const [pick, setPick] = useState<DisplayNft | null>(null);
  const [redeemBusy, setRedeemBusy] = useState(false);
  const [redeemError, setRedeemError] = useState<string | null>(null);

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const s = await bookBffJson<{ authenticated: boolean }>("/api/bff/auth/session");
        if (cancel) return;
        if (bookBffIsTransportIssue(s)) {
          setLoadError(t("purchase.bffOffline"));
          setIsLoggedIn(false);
          return;
        }
        const ok = s.code === 0 && Boolean(s.data?.authenticated);
        setIsLoggedIn(ok);
      } catch {
        if (!cancel) {
          setLoadError(t("purchase.bffOffline"));
          setIsLoggedIn(false);
        }
      } finally {
        if (!cancel) setSessionChecking(false);
      }
    })();
    return () => {
      cancel = true;
    };
  }, [t]);

  const loadNfts = useCallback(async () => {
    setNftsLoading(true);
    setLoadError(null);
    try {
      const raw = await fetchNftBffPagesMerged((p) => `/api/bff/nfts/${p}`);
      setDisplayNfts(filterCzLifeDisplayNfts(raw.map(mapNftRow)));
    } catch {
      setLoadError(t("account.loadError"));
      setDisplayNfts([]);
    } finally {
      setNftsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (!isLoggedIn) return;
    void loadNfts();
  }, [isLoggedIn, loadNfts]);

  const eligible = useMemo(() => displayNfts.filter((n) => isRedeemEligible(n) && n.collectionId), [displayNfts]);

  /** Deep-link: `/account/redeem?collectionId=&tokenId=` */
  useEffect(() => {
    if (!isLoggedIn || nftsLoading) return;
    const tid = `${params.get("tokenId") ?? ""}`.trim();
    const cid = `${params.get("collectionId") ?? ""}`.trim();
    if (!tid || !cid || !UUID_RE.test(cid)) return;
    const match = eligible.find(
      (n) =>
        normalizeRedeemSourceTokenId(n.tokenId) === normalizeRedeemSourceTokenId(tid) &&
        (n.collectionId || "").trim().toLowerCase() === cid.trim().toLowerCase(),
    );
    if (match) setPick(match);
  }, [isLoggedIn, nftsLoading, params, eligible]);

  const confirmRedeem = async (staffCode: string) => {
    const target = pick;
    const code = staffCode.trim();
    if (!target?.collectionId || code.length < 4) return;
    setRedeemBusy(true);
    setRedeemError(null);
    const idempotencyKey =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    try {
      const out = await bookBffJsonWithRefresh<Record<string, unknown>>("/api/bff/club/redeem", {
        method: "POST",
        body: JSON.stringify(
          buildClubRedeemPostJsonPayload({
            staffCode: code,
            sourceCollectionId: target.collectionId,
            sourceTokenId: target.tokenId,
            idempotencyKey,
            redemptionRuleId: getBookNftRedemptionRuleId(),
          }),
        ),
      });

      if (out.code === 0) {
        toast.success(t("account.redeemSuccessToast"));
        await loadNfts();
        navigate("/account", { replace: false });
        return;
      }

      logClubRedeemResponseIfDebugging("[book-site] POST /api/bff/club/redeem ← response", out);
      setRedeemError(localizedBookRedeemFailureMessage(t, out));
    } finally {
      setRedeemBusy(false);
    }
  };

  if (sessionChecking) {
    return (
      <div className="container mx-auto px-6 py-20 flex flex-col items-center gap-4 text-muted-foreground">
        <Loader2 className="w-8 h-8 animate-spin text-gold" />
        <p>{t("account.sessionChecking")}</p>
      </div>
    );
  }

  if (!isLoggedIn) {
    return <Navigate to="/account" replace />;
  }

  return (
    <div className="container mx-auto px-6 py-10 md:py-16 max-w-5xl">
      <nav className="mb-8">
        <Link
          to="/account"
          className="inline-flex items-center gap-2 text-sm text-gold hover:text-gold-light font-medium transition-colors"
        >
          <ArrowLeft className="w-4 h-4 shrink-0" aria-hidden />
          {t("account.redeemBack")}
        </Link>
      </nav>

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-gold/90 mb-2">
          {t("account.redeemPageNavCta")}
        </p>
        <h1 className="font-display text-3xl md:text-4xl mb-3">{t("account.redeemPageTitle")}</h1>
        <p className="text-muted-foreground text-sm md:text-base leading-relaxed max-w-2xl">
          {t("account.redeemPageIntro")}
        </p>
      </motion.div>

      {loadError ? (
        <p className="text-sm text-amber-500 mb-6" role="alert">
          {loadError}
        </p>
      ) : null}

      {nftsLoading ? (
        <div className="flex items-center gap-2 text-muted-foreground mb-8">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>{t("common.loading")}</span>
        </div>
      ) : null}

      {!pick && eligible.length === 0 && !nftsLoading ? (
        <p className="text-center text-muted-foreground mb-10">{t("account.redeemNoEligibleNfts")}</p>
      ) : null}

      {!pick && eligible.length > 0 ? (
        <div className="mb-12">
          <div className="flex items-center justify-between gap-3 mb-6">
            <h2 className="font-display text-xl text-foreground">{t("account.redeemPickSectionTitle")}</h2>
            <span className="text-sm text-muted-foreground">
              {t("account.badgeCount", { count: eligible.length })}
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {eligible.map((nft, index) => (
              <motion.div
                key={nft.key}
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.05 + index * 0.05 }}
                className="flex flex-col items-center w-full max-w-[280px] mx-auto"
              >
                <button
                  type="button"
                  onClick={() => {
                    setRedeemError(null);
                    setPick(nft);
                  }}
                  className="group w-full flex flex-col items-center rounded-2xl border border-border/60 bg-card/30 p-4 hover:border-gold/45 hover:bg-card/50 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-gold/50"
                >
                  <div className="mb-4 flex justify-center w-full transition-transform group-hover:scale-[1.02]">
                    <NFTBadge
                      tokenId={nft.tokenId}
                      type="original"
                      imageUrl={nft.imageUrl}
                      displayName={nft.name}
                      size="md"
                      animated={false}
                    />
                  </div>
                  <div className="w-full space-y-2 text-left">
                    {nft.name ? (
                      <p className="text-sm font-medium text-foreground line-clamp-2">{nft.name}</p>
                    ) : null}
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{t("account.reservedDate")}</span>
                      <span className="font-tech">{nft.dateLabel}</span>
                    </div>
                    <div className="p-2 rounded-lg bg-gold/10 text-center">
                      <span className="text-xs text-gold">✓ {t("account.reservedOk")}</span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-snug">{t("account.premiumVoucherNote")}</p>
                    <div className="flex items-center justify-center gap-1 pt-1 text-sm text-gold font-medium">
                      {t("account.redeemChooseThisVoucher")}
                      <ChevronRight className="w-4 h-4 shrink-0" aria-hidden />
                    </div>
                  </div>
                </button>
              </motion.div>
            ))}
          </div>
        </div>
      ) : null}

      {pick ? (
        <motion.div
          layout
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-lg mx-auto rounded-2xl border border-border bg-card/40 shadow-lg overflow-hidden"
        >
          <div className="border-b border-border/60 px-4 py-3 flex items-center justify-between gap-3 bg-accent/25">
            <span className="text-xs uppercase tracking-wide text-muted-foreground">{t("account.redeemSelectedLabel")}</span>
            <button
              type="button"
              disabled={redeemBusy}
              onClick={() => {
                setPick(null);
                setRedeemError(null);
              }}
              className="inline-flex items-center gap-1 text-xs text-gold hover:underline disabled:opacity-40"
            >
              <ArrowLeft className="w-3.5 h-3.5" aria-hidden />
              {t("account.redeemPickAnother")}
            </button>
          </div>
          <div className="flex justify-center pt-6 px-4">
            <NFTBadge
              tokenId={pick.tokenId}
              type="original"
              imageUrl={pick.imageUrl}
              displayName={pick.name}
              size="md"
              animated={false}
            />
          </div>
          {pick.name ? (
            <p className="text-center text-sm font-medium px-6 pb-2">{pick.name}</p>
          ) : null}
          <RedeemStaffPanel
            dense
            tokenId={pick.tokenId}
            seriesId={pick.collectionId}
            imageUrl={pick.imageUrl}
            displayName={pick.name}
            busy={redeemBusy}
            externalError={redeemError}
            onConfirm={confirmRedeem}
          />
        </motion.div>
      ) : null}
    </div>
  );
}
