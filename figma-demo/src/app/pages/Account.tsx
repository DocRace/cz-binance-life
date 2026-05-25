import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  LogIn,
  Package,
  Award,
  Calendar,
  Sparkles,
  CheckCircle,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import NFTBadge from "../components/NFTBadge";
import PurchaseModal from "../components/PurchaseModal";
import RedeemBookModal from "../components/RedeemBookModal";
import { bookBffJson, bookBffIsTransportIssue } from "../../lib/bookBffClient";
import { bookBffJsonWithRefresh } from "../../lib/bookBffWithRefresh";
import { getBookNftRedemptionRuleId } from "../../config/platform";
import {
  asRecordList,
  BOOK_NFT_COLLECTION_UUID_RE,
  type DisplayNft,
  fetchNftBffPagesMerged,
  isRedeemEligible,
  mapNftRow,
  strField,
} from "../../lib/bookAccountNftApi";
import { buildClubRedeemPostJsonPayload, localizedBookRedeemFailureMessage, logClubRedeemResponseIfDebugging } from "../../lib/bookRedeemClient";
import { toast } from "sonner";

const UUID_RE = BOOK_NFT_COLLECTION_UUID_RE;

function parseOrder(row: Record<string, unknown>): { orderId: string; payUrl?: string } {
  const orderId = strField(row, ["orderId", "order_id", "id"]);
  const payUrl = strField(row, ["paymentUrl", "checkoutUrl", "payUrl", "stripeUrl", "url"]);
  return { orderId, payUrl: payUrl || undefined };
}

async function fetchBffPages(buildPath: (p: number) => string): Promise<Record<string, unknown>[]> {
  const merged: Record<string, unknown>[] = [];
  const maxPages = 25;
  for (let p = 1; p <= maxPages; p++) {
    const r = await bookBffJsonWithRefresh<unknown>(buildPath(p));
    if (r.code !== 0 || r.rawStatus >= 400 || bookBffIsTransportIssue(r)) break;
    const rows = asRecordList(r.data);
    if (!rows.length) break;
    merged.push(...rows);
    const d = r.data as Record<string, unknown> | null;
    const totalPage =
      typeof d?.totalPage === "number"
        ? d.totalPage
        : typeof d?.totalPages === "number"
          ? d.totalPages
          : null;
    const page = typeof d?.page === "number" ? d.page : p;
    if (totalPage != null && page >= totalPage) break;
    if (rows.length < 12) break;
  }
  return merged;
}

export default function Account() {
  const { t } = useTranslation();

  const [sessionChecking, setSessionChecking] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const [loginSubStep, setLoginSubStep] = useState<"email" | "otp">("email");
  const [emailInput, setEmailInput] = useState("");
  const [otpInput, setOtpInput] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [profileEmail, setProfileEmail] = useState("");
  const [displayNfts, setDisplayNfts] = useState<DisplayNft[]>([]);
  const [pendingOrders, setPendingOrders] = useState<{ orderId: string; payUrl?: string }[]>([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [secondaryListingId, setSecondaryListingId] = useState("");
  const [secondaryBusy, setSecondaryBusy] = useState(false);
  const [secondaryFlash, setSecondaryFlash] = useState<string | null>(null);

  const [showEventConfirm, setShowEventConfirm] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<number | null>(null);
  const [showRedeemModal, setShowRedeemModal] = useState(false);
  const [redeemTarget, setRedeemTarget] = useState<{ tokenId: string; collectionId: string } | null>(null);
  const [redeemBusy, setRedeemBusy] = useState(false);
  const [redeemError, setRedeemError] = useState<string | null>(null);
  const [purchaseOpen, setPurchaseOpen] = useState(false);

  const [orderBusyId, setOrderBusyId] = useState<string | null>(null);

  const upcomingEvents = useMemo(
    () => [
      {
        id: 1,
        titleKey: "account.demoEvent1Title",
        timeKey: "account.demoEvent1Time",
        typeKey: "account.demoEvent1Type",
      },
      {
        id: 2,
        titleKey: "account.demoEvent2Title",
        timeKey: "account.demoEvent2Time",
        typeKey: "account.demoEvent2Type",
      },
    ],
    [],
  );

  const grouped = useMemo(() => {
    const original: DisplayNft[] = [];
    const redeemed: DisplayNft[] = [];
    const principle: DisplayNft[] = [];
    for (const n of displayNfts) {
      if (n.badge === "redeemed") redeemed.push(n);
      else if (n.badge === "principle") principle.push(n);
      else original.push(n);
    }
    return { original, redeemed, principle };
  }, [displayNfts]);

  const loadDashboard = useCallback(async () => {
    setDataLoading(true);
    setLoadError(null);
    try {
      const [me, nftRows, ordRows] = await Promise.all([
        bookBffJsonWithRefresh<Record<string, unknown>>("/api/bff/me"),
        fetchNftBffPagesMerged((p) => `/api/bff/nfts/${p}`),
        fetchBffPages((p) => `/api/bff/orders/pending/${p}`),
      ]);

      if (me.code === 0 && me.data && typeof me.data === "object") {
        const d = me.data as Record<string, unknown>;
        setProfileEmail(
          strField(d, ["email", "userEmail", "mail"]) || t("account.profileEmailFallback"),
        );
      } else {
        setProfileEmail(t("account.profileEmailFallback"));
        if (me.rawStatus === 401) {
          setIsLoggedIn(false);
          return;
        }
        if (bookBffIsTransportIssue(me)) {
          setLoadError(t("purchase.bffOffline"));
        } else {
          setLoadError(t("account.loadError"));
        }
      }

      setDisplayNfts(nftRows.map(mapNftRow));
      setPendingOrders(ordRows.map(parseOrder).filter((o) => Boolean(o.orderId)));
    } catch {
      setLoadError(t("purchase.bffOffline"));
    } finally {
      setDataLoading(false);
    }
  }, [t]);

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
    loadDashboard();
  }, [isLoggedIn, loadDashboard]);

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
    setPendingOrders([]);
    setSecondaryListingId("");
    setSecondaryFlash(null);
  };

  const handleJoinEvent = (eventId: number) => {
    setSelectedEvent(eventId);
    setShowEventConfirm(true);
    setTimeout(() => {
      setShowEventConfirm(false);
      setSelectedEvent(null);
    }, 3000);
  };

  const handleRedeemClick = (nft: DisplayNft) => {
    setRedeemError(null);
    if (!isRedeemEligible(nft) || !nft.collectionId) return;
    setRedeemTarget({ tokenId: nft.tokenId, collectionId: nft.collectionId });
    setShowRedeemModal(true);
  };

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

  const handleCancelPayment = async (orderId: string) => {
    if (!orderId.trim()) return;
    setOrderBusyId(orderId);
    try {
      await bookBffJsonWithRefresh("/api/bff/orders/cancel-payment", {
        method: "POST",
        body: JSON.stringify({ orderId }),
      });
      await loadDashboard();
    } finally {
      setOrderBusyId(null);
    }
  };

  const handleSecondaryPurchase = async () => {
    const id = secondaryListingId.trim();
    if (!UUID_RE.test(id)) {
      setSecondaryFlash(t("account.secondaryError"));
      return;
    }
    setSecondaryBusy(true);
    setSecondaryFlash(null);
    try {
      const out = await bookBffJsonWithRefresh<{ paymentUrl?: string; payUrl?: string }>(
        "/api/bff/orders/secondary",
        {
          method: "POST",
          body: JSON.stringify({ listingId: id }),
        },
      );
      if (out.code === 0) {
        setSecondaryFlash(t("account.secondarySuccess"));
        const d = out.data as Record<string, unknown> | null;
        const url = d ? strField(d, ["paymentUrl", "checkoutUrl", "payUrl", "stripeUrl", "url"]) : "";
        if (url) window.open(url, "_blank", "noopener,noreferrer");
        await loadDashboard();
      } else {
        setSecondaryFlash(
          bookBffIsTransportIssue(out)
            ? t("purchase.bffOffline")
            : out.message || t("account.secondaryError"),
        );
      }
    } catch {
      setSecondaryFlash(t("purchase.bffOffline"));
    } finally {
      setSecondaryBusy(false);
    }
  };

  const renderNftSection = (
    title: string,
    nfts: DisplayNft[],
    opts: { showRedeem?: boolean; delayBase?: number },
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

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {nfts.map((nft, index) => (
            <motion.div
              key={nft.key}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: delayBase + 0.05 + index * 0.05 }}
              className="group flex flex-col items-center"
            >
              <div className="mb-4 flex justify-center">
                <NFTBadge
                  tokenId={nft.tokenId}
                  type={nft.badge}
                  stubTicket={Boolean(nft.attendanceStub)}
                  size="md"
                  animated={true}
                  principleName={nft.principleName}
                  principleColor={nft.principleColor}
                />
              </div>
              <div className="space-y-2 w-full max-w-[240px]">
                {nft.badge === "original" && (
                  <>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{t("account.reservedDate")}</span>
                      <span className="font-tech">{nft.dateLabel}</span>
                    </div>
                    <div className="p-2 rounded-lg bg-gold/10 text-center">
                      <span className="text-xs text-gold">✓ {t("account.reservedOk")}</span>
                    </div>
                    {opts.showRedeem && isRedeemEligible(nft) && (
                      <button
                        type="button"
                        onClick={() => handleRedeemClick(nft)}
                        className="w-full mt-2 py-2 rounded-lg border border-gold/50 text-gold hover:bg-gold/10 transition-colors text-sm"
                      >
                        {t("account.redeemDemoCta")}
                      </button>
                    )}
                  </>
                )}
                {nft.badge === "redeemed" && (
                  <>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{t("account.redeemDate")}</span>
                      <span className="font-tech">{nft.dateLabel}</span>
                    </div>
                    {nft.attendanceStub ? (
                      <p className="mt-2 text-xs text-muted-foreground text-center leading-snug">
                        {t("account.stubAttendanceExplanation")}
                      </p>
                    ) : null}
                    {nft.originalTokenId ? (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{t("account.linkOriginalBadge", { id: nft.originalTokenId })}</span>
                      </div>
                    ) : null}
                  </>
                )}
                {nft.badge === "principle" && (
                  <>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{t("account.earnedDate")}</span>
                      <span className="font-tech">{nft.dateLabel}</span>
                    </div>
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
      </motion.div>
    );
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
    return (
      <div className="container mx-auto px-6 py-20">
        <div className="max-w-md mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-gold to-gold-dark flex items-center justify-center">
              <LogIn className="w-10 h-10 text-primary-foreground" />
            </div>
            <h1 className="font-display text-3xl mb-3">{t("account.loginTitle")}</h1>
            <p className="text-muted-foreground">{t("account.loginSubtitle")}</p>
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
                  className="w-full px-4 py-3 rounded-xl bg-card border border-border focus:border-gold/50 outline-none transition-colors"
                  autoComplete="email"
                  disabled={authBusy}
                />
                <button
                  type="button"
                  onClick={handleSendCode}
                  disabled={authBusy || !emailInput.includes("@")}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-gold to-gold-dark text-primary-foreground font-medium disabled:opacity-40"
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
                  className="w-full px-4 py-3 rounded-xl bg-card border border-border focus:border-gold/50 outline-none transition-colors font-tech tracking-wider"
                  disabled={authBusy}
                />
                <button
                  type="button"
                  onClick={handleVerifyOtp}
                  disabled={authBusy || !otpInput.trim()}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-gold to-gold-dark text-primary-foreground font-medium disabled:opacity-40"
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

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.25 }}
          >
            <button
              type="button"
              onClick={() => setPurchaseOpen(true)}
              className="w-full py-3 rounded-xl border border-gold/50 text-gold hover:bg-gold/10 transition-colors text-sm font-medium"
            >
              {t("account.buyBadgeNft")}
            </button>
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
    <div className="container mx-auto px-6 py-20">
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
            <Link
              to="/account/redeem"
              className="inline-flex px-4 py-2 rounded-lg border border-gold/50 text-gold text-sm font-medium hover:bg-gold/10 transition-colors text-center justify-center"
            >
              {t("account.redeemPageNavCta")}
            </Link>
            <button
              type="button"
              onClick={() => setPurchaseOpen(true)}
              className="px-4 py-2 rounded-lg bg-gold/90 text-primary-foreground text-sm font-medium hover:bg-gold transition-colors"
            >
              {t("account.buyBadgeNft")}
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="px-4 py-2 rounded-lg border border-border hover:border-gold/50 hover:bg-accent/50 transition-all duration-300"
            >
              {t("account.logout")}
            </button>
          </div>
        </div>
      </motion.div>

      {dataLoading && (
        <div className="flex items-center gap-2 text-muted-foreground mb-8">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>{t("common.loading")}</span>
        </div>
      )}

      {/* Pending orders + secondary */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.15 }}
        className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-12"
      >
        <div className="p-6 rounded-xl border border-border/50 bg-card/30 backdrop-blur-sm">
          <h2 className="font-display text-xl mb-4">{t("account.pendingOrders")}</h2>
          {pendingOrders.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("account.noPendingOrders")}</p>
          ) : (
            <ul className="space-y-3">
              {pendingOrders.map((o) => (
                <li
                  key={o.orderId}
                  className="flex flex-col sm:flex-row sm:items-center gap-2 sm:justify-between border border-border/40 rounded-lg p-3"
                >
                  <span className="font-tech text-sm break-all">
                    {t("account.orderId")}: {o.orderId}
                  </span>
                  <div className="flex items-center gap-2">
                    {o.payUrl ? (
                      <a
                        href={o.payUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-sm text-gold hover:underline"
                      >
                        {t("account.pay")}
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    ) : null}
                    <button
                      type="button"
                      disabled={orderBusyId === o.orderId}
                      onClick={() => handleCancelPayment(o.orderId)}
                      className="text-xs px-2 py-1 rounded border border-border hover:border-destructive/50 text-muted-foreground"
                    >
                      {orderBusyId === o.orderId ? t("common.loading") : t("account.cancelPayment")}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="p-6 rounded-xl border border-border/50 bg-card/30 backdrop-blur-sm">
          <h2 className="font-display text-xl mb-2">{t("account.secondaryTitle")}</h2>
          <p className="text-sm text-muted-foreground mb-4">{t("account.secondaryHint")}</p>
          <input
            type="text"
            placeholder={t("account.listingIdPlaceholder")}
            value={secondaryListingId}
            onChange={(e) => setSecondaryListingId(e.target.value)}
            className="w-full px-4 py-2 rounded-lg bg-background border border-border font-tech text-sm mb-3"
            disabled={secondaryBusy}
          />
          {secondaryFlash && (
            <p className="text-xs text-muted-foreground mb-2" role="status">
              {secondaryFlash}
            </p>
          )}
          <button
            type="button"
            disabled={secondaryBusy || !secondaryListingId.trim()}
            onClick={handleSecondaryPurchase}
            className="w-full py-2 rounded-lg bg-gold/90 text-primary-foreground text-sm font-medium disabled:opacity-40"
          >
            {secondaryBusy ? t("common.loading") : t("account.secondarySubmit")}
          </button>
        </div>
      </motion.div>

      {/* Events */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="mb-12"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display text-2xl">{t("account.eventsTitle")}</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {upcomingEvents.map((event, index) => (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.25 + index * 0.1 }}
              className="p-6 rounded-xl border border-border/50 bg-card/30 backdrop-blur-sm hover:border-gold/30 transition-all duration-300"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="w-4 h-4 text-gold" />
                    <span className="text-sm text-muted-foreground font-tech">{t(event.timeKey)}</span>
                  </div>
                  <h3 className="font-display text-lg mb-2">{t(event.titleKey)}</h3>
                  <span className="inline-block px-3 py-1 rounded-full bg-gold/20 text-gold text-xs">{t(event.typeKey)}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleJoinEvent(event.id)}
                className="w-full mt-4 py-2 rounded-lg border border-gold/50 text-gold hover:bg-gold/10 transition-colors duration-300"
              >
                {t("account.joinEvent")}
              </button>
            </motion.div>
          ))}
        </div>

        <AnimatePresence>
          {showEventConfirm && (
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.9 }}
              className="fixed top-24 left-1/2 -translate-x-1/2 z-50 px-6 py-4 rounded-xl bg-card border border-gold/50 shadow-2xl backdrop-blur-xl"
            >
              <div className="flex items-center gap-3">
                <CheckCircle className="w-6 h-6 text-[#4ade80]" />
                <div>
                  <p className="font-medium">{t("account.eventConfirmTitle")}</p>
                  <p className="text-sm text-muted-foreground">{t("account.eventConfirmBody")}</p>
                  {selectedEvent != null ? (
                    <p className="text-xs text-muted-foreground mt-1 font-tech">#{selectedEvent}</p>
                  ) : null}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12"
      >
        {[
          {
            icon: Package,
            label: t("account.nftReservation"),
            value: grouped.original.length,
            color: "from-gold to-gold-dark",
          },
          {
            icon: Award,
            label: t("account.nftAttendance"),
            value: grouped.redeemed.length,
            color: "from-stone-400 to-stone-600",
          },
          {
            icon: Sparkles,
            label: t("account.nftPrinciple"),
            value: grouped.principle.length,
            color: "from-stone-600 to-[#a855f7]",
          },
        ].map((stat, index) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.55 + index * 0.1 }}
              className="p-6 rounded-xl border border-border/50 bg-card/30 backdrop-blur-sm"
            >
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center flex-shrink-0`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <div className="text-3xl font-tech text-foreground">{stat.value}</div>
                  <div className="text-sm text-muted-foreground">{stat.label}</div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </motion.div>

      {displayNfts.length === 0 && !dataLoading && (
        <p className="text-center text-muted-foreground mb-12">{t("account.noNfts")}</p>
      )}

      {renderNftSection(t("account.nftReservation"), grouped.original, { showRedeem: true, delayBase: 0.65 })}
      {renderNftSection(t("account.nftAttendance"), grouped.redeemed, { delayBase: 0.75 })}
      {renderNftSection(t("account.nftPrinciple"), grouped.principle, { delayBase: 0.85 })}

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
    </div>
  );
}
