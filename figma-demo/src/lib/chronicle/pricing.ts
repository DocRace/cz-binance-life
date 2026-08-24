import tagMapJson from "./data/cz_behavior_tag_map.json";
import { CHRONICLE_NODE_IDS, CHRONICLE_NODE_YEAR } from "./nodes";
import { BNB_ECO_TERMS, CRYPTO_TERMS } from "./pricingLexicon";
import type { AvatarRoleId } from "./roles";
import type { ChronicleNodeId, MatchedPrinciple, UserEntries } from "./types";

const TAG_CIRCLE_TERMS: readonly string[] = (() => {
  const out: string[] = [];
  for (const tag of tagMapJson.tags || []) {
    if (tag.label) out.push(tag.label);
    for (const syn of tag.synonyms || []) {
      if (syn) out.push(syn);
    }
  }
  return out;
})();

const CRYPTO_CIRCLE_TERMS: readonly string[] = [...new Set([...CRYPTO_TERMS, ...TAG_CIRCLE_TERMS])];

/**
 * Viral price ladder — wide range, leading digits are not stuck on 「1」
 * (ops: 0 · 888… · millions · billions, write every zero in the UI).
 */
const PRICE_LADDER_POS: readonly number[] = [
  0, 8, 28, 88, 288, 888, 2_888, 6_888, 8_888, 28_888, 68_888, 88_888, 288_888, 688_888, 888_888,
  2_888_888, 6_888_888, 8_888_888, 28_888_888, 68_888_888, 88_888_888, 288_888_888, 688_888_888,
  888_888_888, 2_888_888_888, 6_888_888_888, 8_888_888_888,
];

const MIN_PRICE_NODES = 6;

/** Soft role nudge on ladder index (not a fixed sticker price). */
const ROLE_LADDER_NUDGE: Partial<Record<AvatarRoleId, number>> = {
  "diamond-hands": 3,
  whale: 2,
  farmer: 1,
  founder: 2,
  investor: 1,
  "alpha-hunter": 1,
  fren: -1,
  hodler: 0,
  degen: 0,
  "black-hat": 0,
};

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

export type PricingBreakdown = {
  nodeRatio: number;
  identityRatio: number;
  cycleRatio: number;
  principleRatio: number;
  keywordRatio: number;
  fillRatio: number;
  binanceRatio: number;
  substanceRatio: number;
  cryptoHits: number;
  bnbHits: number;
  price: number;
};

function foldCompact(text: string): string {
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
  const blob = foldCompact(filledTexts(entries).join("\n"));
  const hit = new Set<string>();
  if (role) hit.add(role);
  for (const item of ECO_IDENTITY_KEYWORDS) {
    if (item.needles.some((n) => blob.includes(foldCompact(n)))) hit.add(item.id);
  }
  return Math.min(5, hit.size);
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** CJK: substring. Short Latin tickers: word-ish boundary so "eth" ≠ "ethereum" double-count is OK, "the" ≠ "eth". */
function textHasTerm(raw: string, term: string): boolean {
  const needle = `${term || ""}`.trim();
  if (!needle) return false;
  const hay = `${raw || ""}`;
  if (/[\u4e00-\u9fff]/.test(needle)) {
    return foldCompact(hay).includes(foldCompact(needle));
  }
  const compact = needle.toLowerCase().replace(/[\s\u3000]+/g, "");
  if (compact.length <= 2) {
    return new RegExp(`(?:^|[^a-z0-9])${escapeRegExp(compact)}(?:[^a-z0-9]|$)`, "i").test(hay);
  }
  return new RegExp(`(?:^|[^a-z0-9])${escapeRegExp(compact)}(?:[^a-z0-9]|$)`, "i").test(hay);
}

function countLexiconHits(raw: string, terms: readonly string[]): number {
  let n = 0;
  for (const term of terms) {
    if (textHasTerm(raw, term)) n += 1;
  }
  return n;
}

function totalCharCount(texts: string[]): number {
  return texts.reduce((s, t) => s + [...t].length, 0);
}

function contentDepthRatio(texts: string[]): number {
  if (texts.length === 0) return 0;
  const totalChars = totalCharCount(texts);
  const avg = totalChars / texts.length;
  const totalScore = Math.min(1, totalChars / 360);
  const avgScore = Math.min(1, avg / 60);
  return Math.min(1, totalScore * 0.7 + avgScore * 0.3);
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

/** Copy-paste / 划水: the same sentence pasted across nodes (numbers ignored). */
function isCopyPasteSlack(texts: string[]): boolean {
  if (texts.length < MIN_PRICE_NODES) return false;
  const normalized = texts.map((t) => foldCompact(t).replace(/[0-9０-９]+/g, ""));
  const unique = new Set(normalized.filter(Boolean));
  return unique.size <= 2;
}

type SlackKind = "none" | "tiny" | "thin" | "copypaste" | "nojargon";

/**
 * Negative = empty / pasted 划水 only.
 * Compact industry facts (tickers, job titles, one-liners) stay positive.
 * Keyword chips on the cover do not count as writing.
 */
function classifySlack(texts: string[], cryptoHits: number, bnbHits: number): SlackKind {
  if (texts.length < MIN_PRICE_NODES) return "none";
  const chars = totalCharCount(texts);
  const avg = chars / texts.length;
  const jargon = cryptoHits + bnbHits;
  if (isCopyPasteSlack(texts)) {
    if (jargon >= 2 && chars >= 80) return "none";
    return "copypaste";
  }
  if (jargon >= 1 && chars >= 36) return "none";
  if (chars < 24 || avg < 4) return "tiny";
  if (chars < 40 || avg < 6) return "thin";
  if (jargon === 0 && chars < 72) return "nojargon";
  return "none";
}

function consolationIdx(filledNodes: number, chars: number): number {
  if (filledNodes < MIN_PRICE_NODES) return 0;
  if (chars >= 280) return 5;
  if (chars >= 160) return 4;
  if (chars >= 90) return 3;
  return 2;
}

function rungAt(idx: number): number {
  const i = Math.max(0, Math.min(PRICE_LADDER_POS.length - 1, idx));
  return PRICE_LADDER_POS[i] ?? 0;
}

function slackPrice(kind: SlackKind, seed: string): number {
  const jitter = (hashSeed(`${seed}|slack`) % 3) - 1;
  const byKind: Record<Exclude<SlackKind, "none">, number> = {
    tiny: 2,
    thin: 3,
    copypaste: 2,
    nojargon: 3,
  };
  const idx = Math.max(1, (byKind[kind] || 2) + jitter);
  return -rungAt(idx);
}

function honestPrice(
  score: number,
  role: AvatarRoleId | null,
  seed: string,
  filledNodes: number,
  chars: number,
  cryptoHits: number,
  bnbHits: number,
): number {
  const s = clamp01(score);
  const max = PRICE_LADDER_POS.length - 1;
  let idx = Math.round(3 + s * 16);
  idx += ROLE_LADDER_NUDGE[role || "fren"] || 0;
  if (bnbHits >= 2) idx += 2;
  if (bnbHits >= 5) idx += 2;
  if (chars >= 220) idx += 2;
  if (chars >= 400) idx += 2;
  idx += (hashSeed(`${seed}|jitter`) % 5) - 2;
  idx = Math.max(consolationIdx(filledNodes, chars), Math.min(max, idx));
  if (cryptoHits + bnbHits === 0) idx = Math.min(idx, 7);
  const magnitude = rungAt(idx);
  return magnitude === 0 ? rungAt(consolationIdx(filledNodes, chars)) : magnitude;
}

/**
 * Score:
 * 1) crypto-circle terms (any hit counts)
 * 2) BNB / Binance ecosystem (extra)
 * 3) 苦劳 — nodes filled + how long they actually wrote
 */
export function computeChroniclePrice(input: {
  entries: UserEntries;
  role: AvatarRoleId | null;
  principles: MatchedPrinciple[];
  selectedPrincipleCount?: number;
  /** Node copy from distill — used if live entries were stripped / lost. */
  nodeTexts?: string[];
  /** Selected keyword labels, principles, role name. */
  extraTexts?: string[];
  /** Bound book: never price at 0. */
  finished?: boolean;
}): PricingBreakdown {
  const fromEntries = filledTexts(input.entries);
  const fromNodes = (input.nodeTexts || []).map((t) => `${t || ""}`.trim()).filter(Boolean);
  const texts = fromEntries.length >= fromNodes.length ? fromEntries : fromNodes;
  const extras = (input.extraTexts || []).map((t) => `${t || ""}`.trim()).filter(Boolean);
  const raw = [...texts, ...extras].join("\n");
  const filledNodes = texts.length;
  const chars = totalCharCount(texts) + totalCharCount(extras);
  const finished = Boolean(input.finished || filledNodes >= MIN_PRICE_NODES);

  const cryptoHits = countLexiconHits(raw, CRYPTO_CIRCLE_TERMS);
  const bnbHits = countLexiconHits(raw, BNB_ECO_TERMS);
  const writingBlob = texts.join("\n");
  const writingCryptoHits = countLexiconHits(writingBlob, CRYPTO_CIRCLE_TERMS);
  const writingBnbHits = countLexiconHits(writingBlob, BNB_ECO_TERMS);
  const cryptoRatio = clamp01(cryptoHits / 18);
  const binanceRatio = clamp01(bnbHits / 6);

  const nodeRatio = filledNodes / CHRONICLE_NODE_IDS.length;
  const identityRatio = countIdentities(input.entries, input.role) / 5;
  const cycleRatio = countCycles(input.entries) / 4;
  const principleCount =
    typeof input.selectedPrincipleCount === "number"
      ? input.selectedPrincipleCount
      : input.principles.length;
  const principleRatio = Math.min(1, principleCount / 3);
  const depthRatio = contentDepthRatio(texts);
  const effortRatio = clamp01(nodeRatio * 0.35 + cycleRatio * 0.15 + depthRatio * 0.4 + principleRatio * 0.1);

  const fillRatio = clamp01(cryptoRatio * 0.32 + binanceRatio * 0.28 + effortRatio * 0.4);
  const keywordRatio = clamp01((cryptoHits + bnbHits * 1.5) / 24);

  const seed = `${input.role || ""}|${texts.map((t) => t.slice(0, 24)).join("~")}`;
  const slack = classifySlack(texts, writingCryptoHits, writingBnbHits);
  const scoredNodes = finished ? Math.max(filledNodes, MIN_PRICE_NODES) : filledNodes;
  let price = 0;
  if (scoredNodes < MIN_PRICE_NODES) {
    price = 0;
  } else if (slack !== "none" && filledNodes >= MIN_PRICE_NODES) {
    price = slackPrice(slack, seed);
  } else {
    price = honestPrice(fillRatio, input.role, seed, scoredNodes, chars, cryptoHits, bnbHits);
  }
  if (finished && price === 0) {
    price = rungAt(Math.max(2, consolationIdx(scoredNodes, chars)));
  }

  return {
    nodeRatio,
    identityRatio,
    cycleRatio,
    principleRatio,
    keywordRatio,
    fillRatio,
    binanceRatio,
    substanceRatio: effortRatio,
    cryptoHits,
    bnbHits,
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

/** Share copy includes the `$` so negatives read `-$88`, not `$-88`. */
export function formatShareUsd(price: number): string {
  const body = formatUsdt(Math.abs(price));
  return price < 0 ? `-$${body}` : `$${body}`;
}

/** Share copy: flashy positive prices use the “high” template. Slack / negative stays “low”. */
export function isChroniclePriceHigh(price: number): boolean {
  if (!Number.isFinite(price) || price <= 0) return false;
  return price >= 100_000;
}

export function yearForNode(id: ChronicleNodeId): string {
  return CHRONICLE_NODE_YEAR[id];
}
