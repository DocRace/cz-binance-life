import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "motion/react";
import { BookOpen, LogIn, LogOut, Package, Award, Loader2 } from "lucide-react";
import AccountPendingOrders from "../components/AccountPendingOrders";
import { useTranslation } from "react-i18next";
import { Link, useSearchParams } from "react-router";
import NFTBadge from "../components/NFTBadge";
import NftDetailModal from "../components/NftDetailModal";
import PurchaseModal from "../components/PurchaseModal";
import RedeemBookModal from "../components/RedeemBookModal";
import RedeemScanUnavailableModal from "../components/RedeemScanUnavailableModal";
import { isRedeemScanDeepLink } from "../../lib/redeemDeepLink";
import {
  bookBffClearSessionAndReload,
  bookBffIsTransportIssue,
  bookBffJson,
  bookBffProfileUnavailable,
} from "../../lib/bookBffClient";
import { bookBffJsonWithRefresh, bookBffVerifySessionAlive } from "../../lib/bookBffWithRefresh";
import {
  getBookNftRedemptionRuleId,
  getBookPrimarySaleId,
  getBookStandardAirdropPublicCode,
} from "../../config/platform";
import {
  type DisplayNft,
  fetchNftBffPagesMerged,
  filterCzLifeDisplayNfts,
  isPremiumAccountNft,
  isPremiumAttendanceStub,
  isMeaningfulNftDateLabel,
  isPremiumVoucherNft,
  isRedeemEligible,
  isStandardMembershipNft,
  isSyntheticNftBalanceToken,
  mapNftRow,
  strField,
} from "../../lib/bookAccountNftApi";
import { pollDashboardRefresh, takeAccountSyncAfterPurchase } from "../../lib/accountPurchaseSync";
import { buildClubRedeemPostJsonPayload, localizedBookRedeemFailureMessage, logClubRedeemResponseIfDebugging } from "../../lib/bookRedeemClient";
import { CARD_SURFACE, CONTENT_NARROW, PAGE_SHELL, SITE_CONTAINER_X } from "../layout/pageLayout";
import { toast } from "sonner";

const ACCOUNT_HEADER_BTN =
  "inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium tracking-wide transition-colors whitespace-nowrap";

function membershipCardArt(nfts: DisplayNft[], fallbackCover: string): string {
  const owned = nfts.find((n) => n.imageUrl)?.imageUrl;
  return owned || fallbackCover || "";
}

export default function Account() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();

  const [sessionChecking, setSessionChecking] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const [loginSubStep, setLoginSubStep] = useState<"email" | "otp">("email");
  const [emailInput, setEmailInput] = useState("");
  const [otpInput, setOtpInput] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [profileEmail, setProfileEmail] = useState("");
  const [displayNfts, setDisplayNfts] = useState<DisplayNft[]>([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [dashboardReady, setDashboardReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [showRedeemModal, setShowRedeemModal] = useState(false);
  const [redeemTarget, setRedeemTarget] = useState<{ tokenId: string; collectionId: string } | null>(null);
  const [redeemBusy, setRedeemBusy] = useState(false);
  const [redeemError, setRedeemError] = useState<string | null>(null);
  const [purchaseOpen, setPurchaseOpen] = useState(false);
  const [detailNft, setDetailNft] = useState<DisplayNft | null>(null);
  const [tierFallbackCovers, setTierFallbackCovers] = useState({ premium: "", standard: "" });
  const [ordersRefreshKey, setOrdersRefreshKey] = useState(0);
  const [postPurchaseSyncing, setPostPurchaseSyncing] = useState(false);
  const [redeemScanPending, setRedeemScanPending] = useState(() => isRedeemScanDeepLink(searchParams));
  const [showRedeemScanUnavailable, setShowRedeemScanUnavailable] = useState(false);
  const redeemScanHandledRef = useRef(false);

  const grouped = useMemo(() => {
    const premiumUnredeemed: DisplayNft[] = [];
    const premiumStubs: DisplayNft[] = [];
    const standardNfts: DisplayNft[] = [];
    for (const n of displayNfts) {
      if (n.badge === "principle") continue;
      if (isStandardMembershipNft(n)) {
        if (n.badge === "original") standardNfts.push(n);
        continue;
      }
      if (!isPremiumAccountNft(n)) continue;
      if (isPremiumAttendanceStub(n)) premiumStubs.push(n);
      else premiumUnredeemed.push(n);
    }
    return {
      premiumUnredeemed,
      premiumStubs,
      premiumVouchers: [...premiumUnredeemed, ...premiumStubs],
      standardNfts,
    };
  }, [displayNfts]);

  const hasRedeemEligible = useMemo(
    () => grouped.premiumUnredeemed.some((n) => isRedeemEligible(n)),
    [grouped.premiumUnredeemed],
  );

  const suppressPendingCollectionIds = useMemo(() => {
    if (!postPurchaseSyncing) return undefined;
    const ids = new Set<string>();
    for (const nft of displayNfts) {
      if (nft.badge !== "original" || !isPremiumVoucherNft(nft) || !nft.collectionId) continue;
      ids.add(nft.collectionId.trim().toLowerCase());
    }
    return ids.size > 0 ? ids : undefined;
  }, [displayNfts, postPurchaseSyncing]);

  const loadDashboard = useCallback(async (options?: { background?: boolean }) => {
    const background = options?.background ?? false;
    if (!background) {
      setDataLoading(true);
      setDashboardReady(false);
    }
    setLoadError(null);
    let sessionExpired = false;
    try {
      const [me, nftRows] = await Promise.all([
        bookBffJsonWithRefresh<Record<string, unknown>>("/api/bff/me"),
        fetchNftBffPagesMerged((p) => `/api/bff/nfts/${p}`),
      ]);

      if (me.code === 0 && me.data && typeof me.data === "object") {
        const d = me.data as Record<string, unknown>;
        setProfileEmail(
          strField(d, ["email", "userEmail", "mail"]) || t("account.profileEmailFallback"),
        );
      } else {
        setProfileEmail(t("account.profileEmailFallback"));
        if (bookBffProfileUnavailable(me)) {
          sessionExpired = true;
          void bookBffClearSessionAndReload();
          return;
        }
        setLoadError(t("purchase.bffOffline"));
      }

      setDisplayNfts(filterCzLifeDisplayNfts(nftRows.map(mapNftRow)));
    } catch {
      setLoadError(t("purchase.bffOffline"));
    } finally {
      if (!sessionExpired) {
        if (!background) setDataLoading(false);
        setDashboardReady(true);
      }
    }
  }, [t]);

  const syncDashboardAfterPurchase = useCallback(async () => {
    setPostPurchaseSyncing(true);
    setDataLoading(true);
    setDashboardReady(false);
    try {
      await pollDashboardRefresh(
        () => loadDashboard({ background: true }),
        () => setOrdersRefreshKey((k) => k + 1),
      );
    } finally {
      setPostPurchaseSyncing(false);
      setDataLoading(false);
      setDashboardReady(true);
      setOrdersRefreshKey((k) => k + 1);
    }
  }, [loadDashboard]);

  const accountContentLoading = dataLoading || postPurchaseSyncing;

  useEffect(() => {
    let cancel = false;
    (async () => {
      setSessionChecking(true);
      try {
        const s = await bookBffJson<{ authenticated: boolean }>("/api/bff/auth/session");
        if (cancel) return;
        if (bookBffIsTransportIssue(s)) {
          setAuthError(t("purchase.bffOffline"));
          return;
        }
        if (s.code === 0 && s.data?.authenticated) {
          setIsLoggedIn(true);
        }
      } catch {
        if (!cancel) setAuthError(t("purchase.bffOffline"));
      } finally {
        if (!cancel) setSessionChecking(false);
      }
    })();
    return () => {
      cancel = true;
    };
  }, [t]);

  useEffect(() => {
    if (!isLoggedIn) return;
    if (takeAccountSyncAfterPurchase()) {
      void syncDashboardAfterPurchase();
      return;
    }
    void loadDashboard();
  }, [isLoggedIn, loadDashboard, syncDashboardAfterPurchase]);

  useEffect(() => {
    if (!isLoggedIn) return;
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      if (takeAccountSyncAfterPurchase()) {
        void syncDashboardAfterPurchase();
        return;
      }
      void (async () => {
        const alive = await bookBffVerifySessionAlive();
        if (!alive) await bookBffClearSessionAndReload();
      })();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [isLoggedIn, syncDashboardAfterPurchase]);

  useEffect(() => {
    if (isRedeemScanDeepLink(searchParams)) {
      setRedeemScanPending(true);
      redeemScanHandledRef.current = false;
    }
  }, [searchParams]);

  const clearRedeemScanQuery = useCallback(() => {
    if (!isRedeemScanDeepLink(searchParams)) return;
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete("redeem");
        return next;
      },
      { replace: true },
    );
  }, [searchParams, setSearchParams]);

  const handleSendCode = async () => {
    const email = emailInput.trim();
    if (!email.includes("@")) return;
    setAuthBusy(true);
    setAuthError(null);
    try {
      const out = await bookBffJson<null>("/api/bff/auth/send-code", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      if (out.code === 0) setLoginSubStep("otp");
      else
        setAuthError(
          bookBffIsTransportIssue(out)
            ? t("purchase.bffOffline")
            : out.message || t("purchase.bffAuthError"),
        );
    } catch {
      setAuthError(t("purchase.bffOffline"));
    } finally {
      setAuthBusy(false);
    }
  };

  const handleVerifyOtp = async () => {
    const email = emailInput.trim();
    const code = otpInput.trim();
    if (!email || !code) return;
    setAuthBusy(true);
    setAuthError(null);
    try {
      const out = await bookBffJson<{ ok?: boolean }>("/api/bff/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, code }),
      });
      if (out.code === 0) {
        setIsLoggedIn(true);
        setLoginSubStep("email");
        setOtpInput("");
      } else {
        setAuthError(
          bookBffIsTransportIssue(out)
            ? t("purchase.bffOffline")
            : out.message || t("purchase.bffAuthError"),
        );
      }
    } catch {
      setAuthError(t("purchase.bffOffline"));
    } finally {
      setAuthBusy(false);
    }
  };

  const handleLogout = async () => {
    await bookBffJson("/api/bff/auth/logout", { method: "POST" });
    setIsLoggedIn(false);
    setProfileEmail("");
    setDisplayNfts([]);
    setDashboardReady(false);
  };

  const handleOpenNftDetail = (nft: DisplayNft) => {
    if (!nft.collectionId || isSyntheticNftBalanceToken(nft.tokenId)) return;
    setDetailNft(nft);
  };

  const handleRedeemClick = (nft: DisplayNft) => {
    setRedeemError(null);
    if (!isRedeemEligible(nft) || !nft.collectionId) return;
    setRedeemTarget({ tokenId: nft.tokenId, collectionId: nft.collectionId });
    setShowRedeemModal(true);
  };

  useEffect(() => {
    if (!redeemScanPending || !isLoggedIn || sessionChecking || dataLoading || !dashboardReady) return;
    if (redeemScanHandledRef.current) return;

    const firstEligible = displayNfts.find((n) => isRedeemEligible(n) && n.collectionId);
    redeemScanHandledRef.current = true;
    clearRedeemScanQuery();

    if (firstEligible) {
      handleRedeemClick(firstEligible);
      setRedeemScanPending(false);
      return;
    }

    setShowRedeemScanUnavailable(true);
    setRedeemScanPending(false);
  }, [
    redeemScanPending,
    isLoggedIn,
    sessionChecking,
    dataLoading,
    dashboardReady,
    displayNfts,
    clearRedeemScanQuery,
  ]);

  const handleConfirmRedeem = async (staffCode: string) => {
    const target = redeemTarget;
    const code = staffCode.trim();
    if (!target || code.length < 4) return;
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
        setShowRedeemModal(false);
        setRedeemTarget(null);
        toast.success(t("account.redeemSuccessToast"));
        await loadDashboard();
        return;
      }

      logClubRedeemResponseIfDebugging("[book-site] POST /api/bff/club/redeem ← response", out);
      setRedeemError(localizedBookRedeemFailureMessage(t, out));
    } finally {
      setRedeemBusy(false);
    }
  };

  const handleCloseRedeem = () => {
    if (!redeemBusy) {
      setShowRedeemModal(false);
      setRedeemTarget(null);
      setRedeemError(null);
    }
  };

  const renderNftGrid = (
    nfts: DisplayNft[],
    opts: {
      showRedeem?: boolean;
      variant?: "premium" | "standard";
      delayBase?: number;
      indexOffset?: number;
      gridClass?: string;
    },
  ) => {
    const delayBase = opts.delayBase ?? 0.9;
    const indexOffset = opts.indexOffset ?? 0;
    const gridClass =
      opts.gridClass ?? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4";
    return (
      <div className={`grid ${gridClass} gap-6`}>
          {nfts.map((nft, index) => (
            <motion.div
              key={nft.key}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: delayBase + 0.05 + (indexOffset + index) * 0.05 }}
              className="group flex flex-col items-center w-full max-w-[260px]"
            >
              <button
                type="button"
                onClick={() => handleOpenNftDetail(nft)}
                disabled={!nft.collectionId || isSyntheticNftBalanceToken(nft.tokenId)}
                className="mb-4 flex justify-center w-full rounded-2xl transition-transform hover:scale-[1.02] focus:outline-none focus-visible:ring-2 focus-visible:ring-gold/50 disabled:cursor-default disabled:hover:scale-100"
                aria-label={t("nftDetailModal.openDetail")}
              >
                <NFTBadge
                  tokenId={nft.tokenId}
                  type={nft.badge}
                  imageUrl={nft.imageUrl}
                  displayName={nft.name}
                  standardMember={opts.variant === "standard" || isStandardMembershipNft(nft)}
                  stubTicket={isPremiumAttendanceStub(nft)}
                  size="md"
                  animated={false}
                  principleName={nft.principleName}
                  principleColor={nft.principleColor}
                />
              </button>
              <div className="space-y-2 w-full max-w-[240px]">
                {nft.badge === "original" && opts.variant === "standard" && (
                  <>
                    {isMeaningfulNftDateLabel(nft.dateLabel) ? (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{t("account.standardAcquiredDate")}</span>
                        <span className="font-tech">{nft.dateLabel}</span>
                      </div>
                    ) : null}
                    <div className="flex justify-center">
                      <span className="inline-flex items-center rounded-full bg-stone-500/15 px-3 py-1.5 text-xs text-stone-300">
                        ✓ {t("account.standardMemberOk")}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground text-center leading-snug">
                      {t("account.standardMemberNote")}
                    </p>
                  </>
                )}
                {nft.badge === "original" && opts.variant !== "standard" && (
                  <>
                    {isMeaningfulNftDateLabel(nft.dateLabel) ? (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{t("account.reservedDate")}</span>
                        <span className="font-tech">{nft.dateLabel}</span>
                      </div>
                    ) : null}
                    <div className="flex flex-wrap items-center justify-center gap-2">
                      <span className="inline-flex items-center rounded-full bg-gold/10 px-3 py-1.5 text-xs text-gold">
                        ✓ {t("account.reservedOk")}
                      </span>
                      {opts.showRedeem && isRedeemEligible(nft) ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRedeemClick(nft);
                          }}
                          className="inline-flex items-center rounded-full border border-gold/50 px-3 py-1.5 text-xs text-gold transition-colors hover:bg-gold/10"
                        >
                          {t("account.redeemDemoCta")}
                        </button>
                      ) : null}
                    </div>
                    <p className="text-xs text-muted-foreground text-center leading-snug">
                      {t("account.premiumVoucherNote")}
                    </p>
                  </>
                )}
                {isPremiumAttendanceStub(nft) && (
                  <>
                    {isMeaningfulNftDateLabel(nft.dateLabel) ? (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{t("account.redeemDate")}</span>
                        <span className="font-tech">{nft.dateLabel}</span>
                      </div>
                    ) : null}
                    <div className="flex justify-center">
                      <span className="inline-flex items-center rounded-full bg-muted/50 px-3 py-1.5 text-xs text-muted-foreground">
                        ✓ {t("account.stubRedeemedOk")}
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground text-center leading-snug">
                      {t("account.stubAttendanceExplanation")}
                    </p>
                    {nft.originalTokenId ? (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{t("account.linkOriginalBadge", { id: nft.originalTokenId })}</span>
                      </div>
                    ) : null}
                  </>
                )}
                {nft.badge === "principle" && (
                  <>
                    {isMeaningfulNftDateLabel(nft.dateLabel) ? (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{t("account.earnedDate")}</span>
                        <span className="font-tech">{nft.dateLabel}</span>
                      </div>
                    ) : null}
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{t("account.principleMeta")}</span>
                      <span className="font-tech">{nft.principleName}</span>
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          ))}
      </div>
    );
  };

  const renderNftSection = (
    title: string,
    nfts: DisplayNft[],
    opts: { showRedeem?: boolean; variant?: "premium" | "standard"; delayBase?: number },
  ) => {
    const delayBase = opts.delayBase ?? 0.9;
    if (nfts.length === 0) return null;
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: delayBase }}
        className="mb-16"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display text-2xl">{title}</h2>
          <span className="text-sm text-muted-foreground">
            {t("account.badgeCount", { count: nfts.length })}
          </span>
        </div>
        {renderNftGrid(nfts, opts)}
      </motion.div>
    );
  };

  const renderPremiumSection = () => {
    const { premiumUnredeemed, premiumStubs, premiumVouchers } = grouped;
    if (premiumVouchers.length === 0) return null;
    const delayBase = 0.3;
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: delayBase }}
        className="mb-16"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display text-2xl">{t("account.nftPremiumVouchers")}</h2>
          <span className="text-sm text-muted-foreground">
            {t("account.badgeCount", { count: premiumVouchers.length })}
          </span>
        </div>

        <div
          className={
            premiumUnredeemed.length > 0 && premiumStubs.length > 0
              ? "grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-10 lg:items-start"
              : "grid grid-cols-1 gap-8"
          }
        >
          {premiumUnredeemed.length > 0 ? (
            <div className="min-w-0">
              <div className="flex items-center justify-between gap-3 mb-4">
                <h3 className="text-sm font-medium uppercase tracking-[0.14em] text-gold/90">
                  {t("account.premiumUnredeemedSection")}
                </h3>
                <span className="text-xs text-muted-foreground shrink-0">
                  {t("account.badgeCount", { count: premiumUnredeemed.length })}
                </span>
              </div>
              {renderNftGrid(premiumUnredeemed, {
                showRedeem: true,
                variant: "premium",
                delayBase,
                indexOffset: 0,
                gridClass: "grid-cols-1 sm:grid-cols-2 xl:grid-cols-2",
              })}
            </div>
          ) : null}

          {premiumStubs.length > 0 ? (
            <div className="min-w-0">
              <div className="flex items-center justify-between gap-3 mb-4">
                <h3 className="text-sm font-medium uppercase tracking-[0.14em] text-muted-foreground">
                  {t("account.premiumStubSection")}
                </h3>
                <span className="text-xs text-muted-foreground shrink-0">
                  {t("account.badgeCount", { count: premiumStubs.length })}
                </span>
              </div>
              {renderNftGrid(premiumStubs, {
                variant: "premium",
                delayBase,
                indexOffset: premiumUnredeemed.length,
                gridClass: "grid-cols-1 sm:grid-cols-2 xl:grid-cols-2",
              })}
            </div>
          ) : null}
        </div>
      </motion.div>
    );
  };

  if (sessionChecking) {
    return (
      <div className={`${SITE_CONTAINER_X} flex flex-col items-center gap-4 py-20 text-muted-foreground`}>
        <Loader2 className="w-8 h-8 animate-spin text-gold" />
        <p>{t("account.sessionChecking")}</p>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className={PAGE_SHELL}>
        <div className={`${CONTENT_NARROW} max-w-md`}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-gold to-gold-dark flex items-center justify-center">
              <LogIn className="w-10 h-10 text-primary-foreground" />
            </div>
            <h1 className="font-display text-3xl mb-3">{t("account.loginTitle")}</h1>
            <p className="text-muted-foreground">{t("account.loginSubtitle")}</p>
            {redeemScanPending ? (
              <p className="mt-4 rounded-xl border border-gold/35 bg-gold/10 px-4 py-3 text-sm leading-relaxed text-gold/95">
                {t("account.redeemScanLoginHint")}
              </p>
            ) : null}
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="space-y-4"
          >
            {authError && (
              <p className="text-sm text-destructive text-center" role="alert">
                {authError}
              </p>
            )}
            {loginSubStep === "email" ? (
              <>
                <label className="text-xs text-muted-foreground block">{t("purchase.emailLabel")}</label>
                <input
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  className="w-full rounded-full border border-border bg-card px-5 py-3 outline-none transition-colors focus:border-gold/50"
                  autoComplete="email"
                  disabled={authBusy}
                />
                <button
                  type="button"
                  onClick={handleSendCode}
                  disabled={authBusy || !emailInput.includes("@")}
                  className="w-full rounded-full bg-gradient-to-r from-gold to-gold-dark py-3 font-medium text-primary-foreground disabled:opacity-40"
                >
                  {authBusy ? t("common.loading") : t("purchase.sendCode")}
                </button>
              </>
            ) : (
              <>
                <label className="text-xs text-muted-foreground block">{t("purchase.otpLabel")}</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={otpInput}
                  onChange={(e) => setOtpInput(e.target.value)}
                  className="w-full rounded-full border border-border bg-card px-5 py-3 font-tech tracking-wider outline-none transition-colors focus:border-gold/50"
                  disabled={authBusy}
                />
                <button
                  type="button"
                  onClick={handleVerifyOtp}
                  disabled={authBusy || !otpInput.trim()}
                  className="w-full rounded-full bg-gradient-to-r from-gold to-gold-dark py-3 font-medium text-primary-foreground disabled:opacity-40"
                >
                  {authBusy ? t("common.loading") : t("purchase.verifyAndContinue")}
                </button>
                <button
                  type="button"
                  className="w-full py-2 text-sm text-muted-foreground hover:text-foreground"
                  onClick={() => {
                    setLoginSubStep("email");
                    setOtpInput("");
                  }}
                >
                  {t("purchase.changeEmail")}
                </button>
              </>
            )}
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-xs text-muted-foreground text-center mt-6"
          >
            {t("purchase.termsNote")}
          </motion.p>
        </div>
      </div>
    );
  }

  return (
    <div className={PAGE_SHELL}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-12"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-4xl mb-2">{t("account.title")}</h1>
            <p className="text-muted-foreground">{profileEmail}</p>
            {loadError && (
              <p className="text-sm text-amber-500 mt-2" role="status">
                {loadError}
              </p>
            )}
          </div>
          <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2 self-start sm:self-auto">
            {hasRedeemEligible ? (
              <Link
                to="/account/redeem"
                className={`${ACCOUNT_HEADER_BTN} border border-gold/60 text-gold hover:bg-gold/10`}
              >
                <BookOpen className="w-4 h-4 shrink-0" aria-hidden />
                {t("account.redeemPageNavCta")}
              </Link>
            ) : null}
            <button
              type="button"
              onClick={() => setPurchaseOpen(true)}
              className={`${ACCOUNT_HEADER_BTN} bg-gold/90 text-primary-foreground shadow-sm hover:bg-gold`}
            >
              {t("account.buyBadgeNft")}
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className={`${ACCOUNT_HEADER_BTN} border border-border/60 text-muted-foreground hover:border-gold/50 hover:bg-accent/50 hover:text-foreground`}
            >
              <LogOut className="w-4 h-4 shrink-0" aria-hidden />
              {t("account.logout")}
            </button>
          </div>
        </div>
      </motion.div>

      {accountContentLoading ? (
        <div
          className="flex flex-col items-center justify-center gap-4 py-20 text-muted-foreground"
          role="status"
          aria-live="polite"
        >
          <Loader2 className="w-9 h-9 animate-spin text-gold" aria-hidden />
          <p className="text-sm text-center max-w-sm leading-relaxed">
            {postPurchaseSyncing ? t("account.syncingAfterPurchase") : t("common.loading")}
          </p>
        </div>
      ) : (
        <>
          {/* Membership summary */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15 }}
            className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-12"
          >
            {[
              {
                icon: Package,
                label: t("account.nftPremiumVouchers"),
                value: grouped.premiumVouchers.length,
                nfts: grouped.premiumVouchers,
                fallbackCover: tierFallbackCovers.premium,
                color: "from-gold to-gold-dark",
              },
              {
                icon: Award,
                label: t("account.nftStandardMembership"),
                value: grouped.standardNfts.length,
                nfts: grouped.standardNfts,
                fallbackCover: tierFallbackCovers.standard,
                color: "from-stone-500 to-stone-700",
              },
            ].map((stat, index) => {
              const Icon = stat.icon;
              const artUrl = membershipCardArt(stat.nfts, stat.fallbackCover);
              return (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + index * 0.05 }}
                  className={`p-6 ${CARD_SURFACE}`}
                >
                  <div className="flex items-center gap-4">
                    <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-border/50 bg-muted/20">
                      {artUrl ? (
                        <img
                          src={artUrl}
                          alt=""
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div
                          className={`w-full h-full bg-gradient-to-br ${stat.color} flex items-center justify-center`}
                        >
                          <Icon className="w-8 h-8 text-white/90" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-3xl font-tech text-foreground">{stat.value}</div>
                      <div className="text-sm text-muted-foreground leading-snug">{stat.label}</div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>

          <AccountPendingOrders
            active={isLoggedIn}
            refreshKey={ordersRefreshKey}
            suppressCollectionIds={suppressPendingCollectionIds}
            onChanged={() => void loadDashboard()}
          />

          {grouped.premiumVouchers.length === 0 && grouped.standardNfts.length === 0 && (
            <p className="text-center text-muted-foreground mb-12">{t("account.noNfts")}</p>
          )}

          {renderPremiumSection()}
          {renderNftSection(t("account.nftStandardMembership"), grouped.standardNfts, {
            variant: "standard",
            delayBase: 0.35,
          })}
        </>
      )}

      {showRedeemModal && redeemTarget && (
        <RedeemBookModal
          onClose={handleCloseRedeem}
          onConfirm={handleConfirmRedeem}
          busy={redeemBusy}
          externalError={redeemError}
          tokenId={redeemTarget.tokenId}
          seriesId={redeemTarget.collectionId}
        />
      )}
      {purchaseOpen ? <PurchaseModal onClose={() => setPurchaseOpen(false)} /> : null}
      {showRedeemScanUnavailable ? (
        <RedeemScanUnavailableModal
          onClose={() => setShowRedeemScanUnavailable(false)}
          onPurchase={() => setPurchaseOpen(true)}
        />
      ) : null}
      {detailNft ? (
        <NftDetailModal
          nft={detailNft}
          onClose={() => setDetailNft(null)}
          onRedeem={(n) => {
            setDetailNft(null);
            handleRedeemClick(n);
          }}
        />
      ) : null}
    </div>
  );
}
