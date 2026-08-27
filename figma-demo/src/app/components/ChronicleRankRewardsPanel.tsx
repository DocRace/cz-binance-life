import { useEffect, useState } from "react";
import { Link } from "react-router";
import { Gift, Ticket, Trophy } from "lucide-react";
import { useTranslation } from "react-i18next";
import { truncateAuthorName } from "../../lib/chronicle/authorName";
import { fetchMyRankRewards, type RankReward } from "../../lib/chronicle/rankClient";

export default function ChronicleRankRewardsPanel() {
  const { t } = useTranslation();
  const [rewards, setRewards] = useState<RankReward[]>([]);

  useEffect(() => {
    let cancelled = false;
    void fetchMyRankRewards().then((list) => {
      if (!cancelled) setRewards(list);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (rewards.length === 0) return null;

  return (
    <section className="mb-10 rounded-2xl border border-gold/25 bg-card/40 p-5">
      <div className="mb-3 flex items-center gap-2">
        <Trophy className="h-5 w-5 text-gold" aria-hidden />
        <h2 className="font-display text-lg text-gold">{t("chronicle.rank.accountTitle")}</h2>
      </div>
      <ul className="space-y-3">
        {rewards.map((r) => (
          <li
            key={r.entryId}
            className="flex items-start gap-3 rounded-xl border border-border/60 bg-background/40 px-3 py-3"
          >
            {r.rewardType === "ticket" ? (
              <Ticket className="mt-0.5 h-5 w-5 shrink-0 text-gold" aria-hidden />
            ) : (
              <Gift className="mt-0.5 h-5 w-5 shrink-0 text-gold" aria-hidden />
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">
                {t("chronicle.rank.accountRankLine", {
                  rank: r.rank,
                  name: truncateAuthorName(r.authorName),
                })}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {r.rewardType === "ticket"
                  ? t("chronicle.rank.accountTicketHint")
                  : t("chronicle.rank.accountMerchHint")}
              </p>
              <p className="mt-1 text-[11px] text-gold/80">
                {r.status === "claimed"
                  ? t("chronicle.rank.claimed")
                  : t("chronicle.rank.pendingClaim")}
              </p>
            </div>
          </li>
        ))}
      </ul>
      <Link
        to="/club/chronicle/rank"
        className="mt-4 inline-flex text-xs text-gold underline-offset-2 hover:underline"
      >
        {t("chronicle.rank.viewBoard")}
      </Link>
    </section>
  );
}
