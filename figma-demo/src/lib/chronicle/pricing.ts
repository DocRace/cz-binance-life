import { CHRONICLE_NODE_IDS, CHRONICLE_NODE_YEAR } from "./nodes";
import type { AvatarRoleId } from "./roles";
import type { ChronicleNodeId, MatchedPrinciple, UserEntries } from "./types";

/**
 * Viral price ladder — wide range, leading digits are not stuck on 「1」
 * (ops: 0 · 888… · millions · billions, write every zero in the UI).
 */
const PRICE_LADDER_POS: readonly number[] = [
  0, 8, 28, 88, 288, 888, 2_888, 6_888, 8_888, 28_888, 68_888, 88_888, 288_888, 688_888, 888_888,
  2_888_888, 6_888_888, 8_888_888, 28_888_888, 68_888_888, 88_888_888, 288_888_888, 688_888_888,
  888_888_888, 2_888_888_888, 6_888_888_888, 8_888_888_888,
];

/** Roles that lean negative (meme loss / 归零 vibe) when score is non-trivial. */
const NEGATIVE_ROLES: ReadonlySet<AvatarRoleId> = new Set(["degen", "black-hat"]);

/** Soft role nudge on ladder index (not a fixed sticker price). */
const ROLE_LADDER_NUDGE: Partial<Record<AvatarRoleId, number>> = {
  "diamond-hands": 4,
  whale: 3,
  farmer: 2,
  founder: 3,
  investor: 2,
  "alpha-hunter": 1,
  fren: -2,
  hodler: 0,
  degen: 1,
  "black-hat": 1,
};

const WEIGHTS = {
  /** 币安元素密度 */
  binance: 0.5,
  /** 内容详实度（节点覆盖 + 字数深度） */
  substance: 0.5,
} as const;

const SUBSTANCE_WEIGHTS = {
  nodeCover: 0.35,
  cycleCover: 0.15,
  identity: 0.1,
  principles: 0.1,
  depth: 0.3,
} as const;

/** Bull/bear cycles (4). */
const CYCLE_BY_NODE: Record<ChronicleNodeId, 1 | 2 | 3 | 4> = {
  n2013: 1,
  n2017_06: 2,
  n2017_07: 2,
  n2017_09: 2,
  n2017_end: 2,
  n2019_safu: 3,
  n2019_eco: 3,
  n2021: 3,
  n2022: 3,
  n2022_11: 3,
  n2023: 4,
  n2023_11: 4,
  n2024_06: 4,
  n2024_09: 4,
  n2024_end: 4,
};

const ECO_IDENTITY_KEYWORDS: Array<{ id: string; needles: string[] }> = [
  { id: "founder", needles: ["founder", "创业", "創業", "创立", "創立", "创办", "創辦", "创始人", "創始人"] },
  { id: "buidler", needles: ["buidler", "builder", "码农", "碼農", "developer", "开发", "開發", "solidity", "dapp"] },
  {
    id: "onchain-detective",
    needles: ["on-chain", "onchain", "detective", "链上侦探", "鏈上偵探", "researcher", "研究", "tokenomics"],
  },
  { id: "degen", needles: ["degen", "p大将", "P大将", "trader", "交易", "合约", "合約", "金狗"] },
  { id: "hodler", needles: ["hodler", "hodl", "信仰者", "holder", "长期持有", "長期持有", "囤币", "囤幣"] },
  { id: "diamond-hands", needles: ["diamond hands", "钻石手", "鑽石手"] },
  { id: "investor", needles: ["investor", "投资", "投資", "早期项目", "早期項目", "尽调", "盡調"] },
  { id: "whale", needles: ["whale", "巨鲸", "巨鯨", "蓝鲸", "藍鯨"] },
  { id: "miner", needles: ["miner", "矿工", "礦工", "validator", "节点", "節點"] },
  { id: "creator", needles: ["creator", "内容创作者", "內容創作者", "内容", "內容", "kol", "直播"] },
  { id: "fren", needles: ["fren", "community", "社区", "社區", "angel", "meetup", "社群"] },
  { id: "farmer", needles: ["farmer", "撸毛", "擼毛", "airdrop", "空投", "打金"] },
  { id: "alpha-hunter", needles: ["alpha hunter", "alpha", "猎手", "獵手", "hunter", "launchpool", "megadrop", "quest"] },
  { id: "black-hat", needles: ["black hat", "科学家", "科學家", "黑帽"] },
  { id: "white-hat", needles: ["white hat", "漏洞猎人", "漏洞獵人", "白帽"] },
];

/** Binance / CZ lexicon — more hits → higher score. */
const BINANCE_KEYWORDS: string[] = [
  "币安",
  "幣安",
  "binance",
  "bnb",
  "币安链",
  "幣安鏈",
  "bnb chain",
  "bsc",
  "launchpad",
  "launchpool",
  "alpha",
  "megadrop",
  "safu",
  "hodler",
  "cz",
  "赵长鹏",
  "趙長鵬",
  "何一",
  "ftx",
  "sbf",
  "okx",
  "合约",
  "合約",
  "期货",
  "期貨",
  "杠杆",
  "槓桿",
  "现货",
  "現貨",
  "上币",
  "上幣",
  "c2c",
  "理财",
  "理財",
  "质押",
  "質押",
  "打新",
  "空投",
  "打金",
  "蓝鲸",
  "藍鯨",
  "钻石手",
  "鑽石手",
  "挂单",
  "掛單",
  "划转",
  "劃轉",
  "bnb",
  "vip",
  "futures",
  "spot",
];

export type PricingBreakdown = {
  nodeRatio: number;
  identityRatio: number;
  cycleRatio: number;
  principleRatio: number;
  keywordRatio: number;
  /** 0–1 overall score (binance elements × substance). */
  fillRatio: number;
  binanceRatio: number;
  substanceRatio: number;
  price: number;
};

function fold(text: string): string {
  return `${text || ""}`.toLowerCase().replace(/[\s\u3000]+/g, "");
}

function filledTexts(entries: UserEntries): string[] {
  return CHRONICLE_NODE_IDS.map((id) => `${entries[id] || ""}`.trim()).filter(Boolean);
}

function countFilledNodes(entries: UserEntries): number {
  return filledTexts(entries).length;
}

function countCycles(entries: UserEntries): number {
  const hit = new Set<number>();
  for (const id of CHRONICLE_NODE_IDS) {
    if (!`${entries[id] || ""}`.trim()) continue;
    hit.add(CYCLE_BY_NODE[id]);
  }
  return hit.size;
}

function countIdentities(entries: UserEntries, role: AvatarRoleId | null): number {
  const blob = fold(filledTexts(entries).join("\n"));
  const hit = new Set<string>();
  if (role) hit.add(role);
  for (const item of ECO_IDENTITY_KEYWORDS) {
    if (item.needles.some((n) => blob.includes(fold(n)))) hit.add(item.id);
  }
  return Math.min(5, hit.size);
}

function countKeywords(entries: UserEntries): number {
  const blob = fold(filledTexts(entries).join("\n"));
  let n = 0;
  for (const kw of BINANCE_KEYWORDS) {
    if (blob.includes(fold(kw))) n += 1;
    if (n >= 25) break;
  }
  return n;
}

/**
 * Writing depth 0–1: total chars + average length of filled nodes.
 * Short one-liners stay low; multi-node detailed copy climbs.
 */
function contentDepthRatio(entries: UserEntries): number {
  const texts = filledTexts(entries);
  if (texts.length === 0) return 0;
  const totalChars = texts.reduce((s, t) => s + [...t].length, 0);
  const avg = totalChars / texts.length;
  // ~120 CJK/latin chars across book → mid; ~480+ → full depth
  const totalScore = Math.min(1, totalChars / 480);
  const avgScore = Math.min(1, avg / 80);
  return Math.min(1, totalScore * 0.65 + avgScore * 0.35);
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

/**
 * Map score → ladder index, then pick a nearby rung so siblings aren't all 「1…」.
 */
function priceFromScore(score: number, role: AvatarRoleId | null, seed: string): number {
  const s = clamp01(score);
  if (s < 0.02) return 0;

  const max = PRICE_LADDER_POS.length - 1;
  let idx = Math.round(s * max);
  idx += ROLE_LADDER_NUDGE[role || "fren"] || 0;
  // Stable ±1 jitter from content seed so two similar books aren't identical.
  idx += (hashSeed(seed) % 3) - 1;
  idx = Math.max(0, Math.min(max, idx));

  const magnitude = PRICE_LADDER_POS[idx] ?? 0;
  if (magnitude === 0) return 0;

  const negative = role != null && NEGATIVE_ROLES.has(role) && s >= 0.12;
  return negative ? -magnitude : magnitude;
}

/**
 * Score from 少→多:
 * 1) 币安元素多少（关键词命中）
 * 2) 内容详实度（填了多少节点 + 写了多长）
 */
export function computeChroniclePrice(input: {
  entries: UserEntries;
  role: AvatarRoleId | null;
  principles: MatchedPrinciple[];
  selectedPrincipleCount?: number;
}): PricingBreakdown {
  const nodeRatio = countFilledNodes(input.entries) / CHRONICLE_NODE_IDS.length;
  const identityRatio = countIdentities(input.entries, input.role) / 5;
  const cycleRatio = countCycles(input.entries) / 4;
  const principleCount =
    typeof input.selectedPrincipleCount === "number"
      ? input.selectedPrincipleCount
      : input.principles.length;
  const principleRatio = Math.min(1, principleCount / 72);
  const keywordHits = countKeywords(input.entries);
  const keywordRatio = keywordHits / 25;
  const depthRatio = contentDepthRatio(input.entries);

  const binanceRatio = clamp01(keywordRatio);
  const substanceRatio = clamp01(
    nodeRatio * SUBSTANCE_WEIGHTS.nodeCover +
      cycleRatio * SUBSTANCE_WEIGHTS.cycleCover +
      identityRatio * SUBSTANCE_WEIGHTS.identity +
      principleRatio * SUBSTANCE_WEIGHTS.principles +
      depthRatio * SUBSTANCE_WEIGHTS.depth,
  );

  const fillRatio = clamp01(binanceRatio * WEIGHTS.binance + substanceRatio * WEIGHTS.substance);

  const seed = `${input.role || ""}|${filledTexts(input.entries)
    .map((t) => t.slice(0, 24))
    .join("~")}`;
  const price = priceFromScore(fillRatio, input.role, seed);

  return {
    nodeRatio,
    identityRatio,
    cycleRatio,
    principleRatio,
    keywordRatio,
    fillRatio,
    binanceRatio,
    substanceRatio,
    price,
  };
}

/** Display USD with every zero written out (8,888,888,888 — not 8.8B). Prefix `$` in UI. */
export function formatUsdt(price: number): string {
  if (!Number.isFinite(price)) return "0";
  if (price === 0) return "0";
  if (Number.isInteger(price) || Math.abs(price) >= 1000) {
    return Math.trunc(price).toLocaleString("en-US");
  }
  return price.toFixed(2);
}

/** Share copy: flashy prices use the “high” template. */
export function isChroniclePriceHigh(price: number): boolean {
  if (!Number.isFinite(price)) return false;
  if (price < 0) return true;
  return Math.abs(price) >= 100_000;
}

export function yearForNode(id: ChronicleNodeId): string {
  return CHRONICLE_NODE_YEAR[id];
}
