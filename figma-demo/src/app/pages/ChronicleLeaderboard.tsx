import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { motion } from "motion/react";
import { BookOpen, ChevronLeft, Loader2, Trophy } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import LanguageSwitcher from "../components/LanguageSwitcher";
import RoleAvatar from "../components/RoleAvatar";
import { truncateAuthorName } from "../../lib/chronicle/authorName";
import type { AvatarRoleId } from "../../lib/chronicle/roles";
import {
  chronicleLeavePath,
  isChronicleSurfacePath,
  persistInviteRef,
  rememberChronicleArrival,
} from "../../lib/chronicle/wizardNav";
import {
  claimRankReward,
  fetchLeaderboard,
  fetchRankConfig,
  type RankConfig,
  type RankEntry,
} from "../../lib/chronicle/rankClient";

const H5_STAGE =
  "relative mx-auto flex min-h-dvh w-full max-w-[430px] flex-col px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-[max(0.75rem,env(safe-area-inset-top))]";
const H5_RADIUS = "rounded-[1.75rem]";
const H5_CARD =
  `${H5_RADIUS} border border-gold/20 bg-[#2c2824]/92 shadow-[0_18px_50px_rgba(0,0,0,0.35)]`;
const H5_CTA =
  "inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-gold to-gold-light px-6 py-3.5 text-sm font-semibold text-primary-foreground shadow-[0_10px_28px_rgba(240,185,11,0.28)] transition-transform active:scale-[0.98]";

export default function ChronicleLeaderboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const focusEntryId = searchParams.get("entryId") || "";
  const from = searchParams.get("from") || "";

  const [cfg, setCfg] = useState<RankConfig | null>(null);
  const [items, setItems] = useState<RankEntry[]>([]);
  const [me, setMe] = useState<RankEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [claimOpen, setClaimOpen] = useState<RankEntry | null>(null);

  useEffect(() => {
    rememberChronicleArrival();
  }, []);

  const onBoardBack = () => {
    const refPath = (() => {
      try {
        const url = new URL(document.referrer, window.location.origin);
        if (url.origin !== window.location.origin) return "";
        return `${url.pathname}${url.search}`;
      } catch {
        return "";
      }
    })();
    const fromChronicle =
      from === "intro" ||
      Boolean(focusEntryId) ||
      (refPath && isChronicleSurfacePath(refPath) && !refPath.startsWith("/club/chronicle/rank"));
    if (fromChronicle) {
      if (window.history.length > 1) {
        navigate(-1);
        return;
      }
      navigate("/club/chronicle", { replace: true });
      return;
    }
    navigate(chronicleLeavePath());
  };

  const reload = useCallback(async () => {
    const [c, board] = await Promise.all([
      fetchRankConfig(true),
      fetchLeaderboard({ limit: 50, entryId: focusEntryId || undefined }),
    ]);
    setCfg(c);
    if (board) {
      setItems(board.items);
      setMe(board.me);
    }
    setLoading(false);
  }, [focusEntryId]);

  useEffect(() => {
    void reload();
    const timer = window.setInterval(() => void reload(), 30_000);
    return () => window.clearInterval(timer);
  }, [reload]);

  const onClaim = async (entry: RankEntry) => {
    setBusyId(entry.entryId);
    const out = await claimRankReward(entry.entryId);
    setBusyId(null);
    if (!out.ok) {
      if (out.message === "LOGIN_REQUIRED") {
        toast.error(t("chronicle.rank.loginToClaim"));
      } else if (out.message === "NOT_OWNER" || out.message === "OWNER_UNBOUND") {
        toast.error(t("chronicle.rank.claimNotOwner"));
      } else {
        toast.error(t("chronicle.rank.claimFailed"));
      }
      return;
    }
    setClaimOpen(entry);
    await reload();
  };

  const ended = cfg?.phase === "ended";

  return (
    <div className="relative min-h-dvh overflow-hidden bg-[#1a1714] text-foreground">
      <div
        className="pointer-events-none absolute inset-0 opacity-80"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(240,185,11,0.18), transparent 55%), radial-gradient(ellipse 60% 40% at 80% 100%, rgba(80,60,20,0.35), transparent)",
        }}
      />
      <div className={H5_STAGE}>
        <header className="mb-4 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={onBoardBack}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden />
            {t("chronicle.rank.backChronicle")}
          </button>
          <LanguageSwitcher />
        </header>

        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className={`${H5_CARD} flex flex-1 flex-col p-5`}
        >
          <div className={`mb-5 ${H5_RADIUS} border border-white/8 bg-black/25 p-3.5`}>
            <p className="text-xs font-medium text-gold-light">{t("chronicle.rank.rewardsTitle")}</p>
            <ul className="mt-2 space-y-1.5 text-[11px] text-muted-foreground">
              <li>{t("chronicle.rank.rewardSyncTop3")}</li>
              <li>{t("chronicle.rank.rewardSyncTop10")}</li>
              <li>{t("chronicle.rank.rewardSunshine")}</li>
            </ul>
          </div>

          <p className="text-center font-display text-2xl text-gold">
            {t("chronicle.rank.boardKicker")}
          </p>
          <h1 className="mt-2 text-center font-display text-2xl text-gold">
            {t("chronicle.rank.boardTitle")}
          </h1>
          <p className="mt-2 text-center text-xs text-muted-foreground">
            {ended ? t("chronicle.rank.boardEndedHint") : t("chronicle.rank.boardLiveHint")}
          </p>

          {loading ? (
            <div className="flex flex-1 items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-gold" aria-hidden />
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 py-16 text-center">
              <Trophy className="h-8 w-8 text-gold/50" aria-hidden />
              <p className="text-sm text-muted-foreground">{t("chronicle.rank.emptyBoard")}</p>
            </div>
          ) : (
            <ul className="mt-5 flex-1 space-y-2.5 overflow-y-auto">
              {items.map((row) => {
                const isMe = me?.entryId === row.entryId;
                return (
                  <li
                    key={row.entryId}
                    className={`flex items-center gap-3 ${H5_RADIUS} border px-3 py-2.5 ${
                      isMe || focusEntryId === row.entryId
                        ? "border-gold/50 bg-gold/10"
                        : "border-white/8 bg-black/20"
                    }`}
                  >
                    <span className="w-6 shrink-0 text-center font-tech text-sm text-gold">
                      {row.rank ?? "—"}
                    </span>
                    <RoleAvatar
                      roleId={(row.roleId as AvatarRoleId) || "creator"}
                      size="sm"
                      className="shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{truncateAuthorName(row.authorName)}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {t("chronicle.rank.togetherLine", {
                          name: truncateAuthorName(row.authorName),
                          count: row.inviteCount ?? row.popularity ?? 0,
                        })}
                      </p>
                    </div>
                    {ended && row.rewardType ? (
                      <button
                        type="button"
                        disabled={busyId === row.entryId || row.claimStatus === "claimed"}
                        onClick={() => void onClaim(row)}
                        className="shrink-0 rounded-full border border-gold/40 px-3 py-1.5 text-[11px] text-gold disabled:opacity-50"
                      >
                        {row.claimStatus === "claimed"
                          ? t("chronicle.rank.claimed")
                          : t("chronicle.rank.claimCta")}
                      </button>
                    ) : (
                      <Link
                        to={`/club/chronicle?ref=${encodeURIComponent(row.entryId)}`}
                        onClick={() => persistInviteRef(row.entryId)}
                        className="shrink-0 rounded-full bg-gold/15 px-3 py-1.5 text-[11px] text-gold"
                      >
                        {t("chronicle.rank.writeYours")}
                      </Link>
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          <div className="mt-5 border-t border-white/8 pt-4">
            <p className="mb-2 text-center text-xs text-muted-foreground">
              {t("chronicle.rank.joinHint")}
            </p>
            <Link to="/club/chronicle" className={`${H5_CTA} relative`}>
              <BookOpen className="pointer-events-none absolute left-5 top-1/2 h-4 w-4 -translate-y-1/2" aria-hidden />
              <span>{t("chronicle.rank.createCta")}</span>
            </Link>
          </div>
        </motion.section>

        {claimOpen ? (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center">
            <div className={`${H5_CARD} w-full max-w-[400px] p-5`}>
              <p className="text-center text-sm leading-relaxed">
                {claimOpen.rewardType === "ticket"
                  ? t("chronicle.rank.claimTicketMsg", { rank: claimOpen.rankAtEnd || claimOpen.rank })
                  : t("chronicle.rank.claimMerchMsg", { rank: claimOpen.rankAtEnd || claimOpen.rank })}
              </p>
              <Link to="/account" className={`${H5_CTA} mt-5`}>
                {t("chronicle.rank.goAccount")}
              </Link>
              <button
                type="button"
                className="mt-2 w-full py-2 text-xs text-muted-foreground"
                onClick={() => setClaimOpen(null)}
              >
                {t("common.close")}
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
