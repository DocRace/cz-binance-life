import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router";
import { Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import NFTBadge from "../components/NFTBadge";
import RedeemStaffPanel from "../components/RedeemStaffPanel";
import { bookBffIsTransportIssue, bookBffJson } from "../../lib/bookBffClient";
import { bookBffJsonWithRefresh } from "../../lib/bookBffWithRefresh";
import {
  BOOK_NFT_COLLECTION_UUID_RE,
  type DisplayNft,
  fetchNftBffPagesMerged,
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
      setDisplayNfts(raw.map(mapNftRow));
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
    <div className="container mx-auto px-6 py-10 md:py-16 max-w-lg">
      <nav className="mb-8">
        <Link to="/account" className="text-sm text-gold hover:underline font-medium">
          ← {t("account.redeemBack")}
        </Link>
      </nav>

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="font-display text-3xl mb-3">{t("account.redeemPageTitle")}</h1>
        <p className="text-muted-foreground text-sm leading-relaxed">{t("account.redeemPageIntro")}</p>
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
        <div className="space-y-4 mb-12">
          <h2 className="font-display text-xl text-foreground">{t("account.redeemPickSectionTitle")}</h2>
          <ul className="space-y-3">
            {eligible.map((nft) => (
              <li key={nft.key}>
                <button
                  type="button"
                  onClick={() => {
                    setRedeemError(null);
                    setPick(nft);
                  }}
                  className="w-full flex items-center gap-4 p-4 rounded-xl border border-border/60 bg-card/40 hover:border-gold/40 hover:bg-card/70 transition-colors text-left"
                >
                  <NFTBadge tokenId={nft.tokenId} type="original" size="sm" animated={false} />
                  <div className="flex-1 min-w-0">
                    <div className="font-tech text-xs text-muted-foreground wrap-anywhere">{nft.tokenId}</div>
                    <div className="text-sm">{t("account.redeemChooseThisVoucher")}</div>
                  </div>
                  <span className="text-gold text-xs shrink-0">›</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {pick ? (
        <motion.div
          layout
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="rounded-2xl border border-border bg-card shadow-lg overflow-hidden"
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
              className="text-xs text-gold hover:underline disabled:opacity-40"
            >
              {t("account.redeemPickAnother")}
            </button>
          </div>
          <RedeemStaffPanel
            dense
            tokenId={pick.tokenId}
            seriesId={pick.collectionId}
            busy={redeemBusy}
            externalError={redeemError}
            onConfirm={confirmRedeem}
          />
        </motion.div>
      ) : null}
    </div>
  );
}
