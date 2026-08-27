import { bookBffJson } from "../bookBffClient";
import { truncateAuthorName } from "./authorName";

export type RankPhase = "disabled" | "upcoming" | "active" | "ended";
export type RankMode = "sync" | "async";
export type RankRewardType = "ticket" | "merch";

export type RankConfig = {
  enabled: boolean;
  mode: RankMode;
  phase: RankPhase;
  startAt: string | null;
  endAt: string | null;
  popularityPerVote: number;
  maxVotesPerVoter: number;
  rewards: { top3?: string; top4to10?: string; top10?: string };
};

export type RankEntry = {
  entryId: string;
  authorName: string;
  roleId: string | null;
  styleId: string | null;
  tags: string[];
  price: number | null;
  voteCount: number;
  inviteCount?: number;
  popularity: number;
  shareToken: string;
  rank: number | null;
  rewardType: RankRewardType | null;
  claimStatus: "pending" | "claimed" | "unbound" | null;
  rankAtEnd: number | null;
};

export type VoterStatus = {
  votesUsed: number;
  votesRemaining: number;
  votedEntryIds: string[];
  maxVotes: number;
};

export type RankReward = {
  entryId: string;
  authorName: string;
  rank: number;
  rewardType: RankRewardType;
  status: "pending" | "claimed";
  claimedAt: string | null;
};

let cachedConfig: RankConfig | null = null;
let cachedAt = 0;

export function isRankCampaignLive(cfg: RankConfig | null | undefined): boolean {
  return Boolean(cfg?.enabled && (cfg.phase === "active" || cfg.phase === "ended"));
}

export function isRankVotingOpen(cfg: RankConfig | null | undefined): boolean {
  return Boolean(cfg?.enabled && cfg.phase === "active");
}

export async function fetchRankConfig(force = false): Promise<RankConfig | null> {
  const now = Date.now();
  if (!force && cachedConfig && now - cachedAt < 30_000) return cachedConfig;
  const out = await bookBffJson<RankConfig>("/api/bff/chronicle/rank/config");
  if (out.code !== 0 || !out.data) return cachedConfig;
  cachedConfig = out.data;
  cachedAt = now;
  return cachedConfig;
}

export async function enrollRankEntry(body: {
  shareToken: string;
  authorName: string;
  roleId?: string | null;
  styleId?: string;
  price?: number;
  tags?: string[];
  refEntryId?: string | null;
}): Promise<RankEntry | null> {
  const out = await bookBffJson<RankEntry>("/api/bff/chronicle/rank/enroll", {
    method: "POST",
    body: JSON.stringify({
      ...body,
      authorName: truncateAuthorName(body.authorName),
    }),
  });
  return out.code === 0 ? out.data : null;
}

export async function fetchLeaderboard(opts?: {
  limit?: number;
  entryId?: string;
}): Promise<{
  items: RankEntry[];
  me: RankEntry | null;
  phase: RankPhase;
  total: number;
  finalized: boolean;
} | null> {
  const qs = new URLSearchParams();
  if (opts?.limit) qs.set("limit", String(opts.limit));
  if (opts?.entryId) qs.set("entryId", opts.entryId);
  const path = `/api/bff/chronicle/rank/leaderboard${qs.toString() ? `?${qs}` : ""}`;
  const out = await bookBffJson<{
    items: RankEntry[];
    me: RankEntry | null;
    phase: RankPhase;
    total: number;
    finalized: boolean;
  }>(path);
  return out.code === 0 ? out.data : null;
}

export async function fetchRankEntry(entryId: string): Promise<RankEntry | null> {
  const out = await bookBffJson<RankEntry>(
    `/api/bff/chronicle/rank/entry/${encodeURIComponent(entryId)}`,
  );
  return out.code === 0 ? out.data : null;
}

export async function fetchVoterStatus(): Promise<VoterStatus | null> {
  const out = await bookBffJson<VoterStatus>("/api/bff/chronicle/rank/voter-status");
  return out.code === 0 ? out.data : null;
}

export async function attributeInvite(body: {
  refEntryId: string;
  completerEntryId?: string;
}): Promise<{ ok: boolean; already?: boolean; message: string }> {
  const out = await bookBffJson<{ already?: boolean }>(
    "/api/bff/chronicle/rank/attribute",
    { method: "POST", body: JSON.stringify(body) },
  );
  if (out.code === 0) {
    return { ok: true, already: Boolean(out.data?.already), message: "ok" };
  }
  return { ok: false, message: out.message || "ATTRIBUTE_FAILED" };
}

export async function claimRankReward(entryId: string): Promise<{
  ok: boolean;
  message: string;
  already?: boolean;
  reward?: RankReward | null;
}> {
  const out = await bookBffJson<{ already: boolean; reward: RankReward }>(
    "/api/bff/chronicle/rank/claim",
    { method: "POST", body: JSON.stringify({ entryId }) },
  );
  if (out.code === 0 && out.data) {
    return { ok: true, message: "ok", already: out.data.already, reward: out.data.reward };
  }
  return { ok: false, message: out.message || "CLAIM_FAILED" };
}

export async function fetchMyRankRewards(): Promise<RankReward[]> {
  const out = await bookBffJson<{ rewards: RankReward[] }>("/api/bff/chronicle/rank/my-rewards");
  return out.code === 0 && out.data?.rewards ? out.data.rewards : [];
}

export async function fetchMyBooks(): Promise<RankEntry[]> {
  const out = await bookBffJson<{ items: RankEntry[] }>("/api/bff/chronicle/rank/mine");
  return out.code === 0 && out.data?.items ? out.data.items : [];
}

export async function bindMyBook(body: {
  entryId?: string;
  shareToken?: string;
  authorName?: string;
}): Promise<RankEntry | null> {
  const out = await bookBffJson<RankEntry & { items?: RankEntry[] }>(
    "/api/bff/chronicle/rank/bind",
    { method: "POST", body: JSON.stringify(body) },
  );
  if (out.code !== 0) return null;
  return out.data?.entryId ? out.data : out.data?.items?.[0] || null;
}

export function shareTokenFromUrl(url: string): string {
  try {
    return new URL(url).searchParams.get("share") || "";
  } catch {
    return "";
  }
}
