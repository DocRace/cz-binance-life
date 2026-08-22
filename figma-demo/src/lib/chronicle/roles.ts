import type { ChronicleAudience } from "./types";

/**
 * Cover / author archetypes from ops Sheet2
 * （角色名中 / 英）+ pack under public/assets/chronicle/roles/pack/.
 */
export type AvatarRoleId =
  | "black-hat"
  | "white-hat"
  | "fren"
  | "creator"
  | "buidler"
  | "farmer"
  | "founder"
  | "hodler"
  | "investor"
  | "whale"
  | "onchain-detective"
  | "diamond-hands"
  | "degen"
  | "miner"
  | "alpha-hunter";

/** Four visual style sheets (legacy placeholders). */
export type AvatarStyleId = "a" | "b" | "c" | "d";

export const AVATAR_ROLE_IDS: AvatarRoleId[] = [
  "founder",
  "buidler",
  "onchain-detective",
  "degen",
  "hodler",
  "diamond-hands",
  "investor",
  "whale",
  "miner",
  "creator",
  "fren",
  "farmer",
  "alpha-hunter",
  "black-hat",
  "white-hat",
];

export const AVATAR_STYLE_IDS: AvatarStyleId[] = ["a", "b", "c", "d"];

export const AVATAR_STYLE_SRC: Record<AvatarStyleId, string> = {
  a: "/assets/chronicle/avatar-style-a.jpeg",
  b: "/assets/chronicle/avatar-style-b.jpeg",
  c: "/assets/chronicle/avatar-style-c.jpeg",
  d: "/assets/chronicle/avatar-style-d.jpeg",
};

/** Roles that lean on the founder behavior-tag pool. */
const FOUNDER_POOL: AvatarRoleId[] = [
  "founder",
  "buidler",
  "onchain-detective",
  "investor",
  "whale",
  "miner",
  "creator",
  "fren",
  "black-hat",
  "white-hat",
];

export function audienceForRole(role: AvatarRoleId): ChronicleAudience {
  return FOUNDER_POOL.includes(role) ? "founder" : "retail";
}

export function isAvatarRoleId(value: string): value is AvatarRoleId {
  return (AVATAR_ROLE_IDS as string[]).includes(value);
}

export function isAvatarStyleId(value: string): value is AvatarStyleId {
  return (AVATAR_STYLE_IDS as string[]).includes(value);
}

/** Tag-id → role weights (actual catalog ids, not English guesswork). */
const TAG_ROLE_SCORES: Record<string, Partial<Record<AvatarRoleId, number>>> = {
  early_entry: { "alpha-hunter": 2, founder: 1 },
  late_entry: { hodler: 1, fren: 1 },
  bluechip_only: { hodler: 3, "diamond-hands": 1 },
  chase_new: { "alpha-hunter": 3, degen: 2 },
  onchain_degen: { degen: 3, farmer: 2, "alpha-hunter": 1 },
  buy_dip: { "diamond-hands": 2, investor: 1 },
  fomo_buy: { degen: 2 },
  all_in: { degen: 2, whale: 1 },
  diversified: { investor: 2, hodler: 1 },
  long_hold: { "diamond-hands": 3, hodler: 2 },
  cut_loss: { degen: 1, investor: 1 },
  swing_trade: { degen: 3 },
  cant_hold: { degen: 1, fren: 1 },
  emotion_driven: { degen: 1 },
  disciplined: { hodler: 2, investor: 1 },
  stoic: { "diamond-hands": 2, hodler: 1 },
  liquidated: { degen: 3 },
  rugged: { farmer: 1, degen: 1 },
  underwater: { "diamond-hands": 2 },
  survived_bear: { "diamond-hands": 3, hodler: 1 },
  missed_bull: { hodler: 1 },
  left_and_returned: { hodler: 1, fren: 1 },
  researcher: { "onchain-detective": 4 },
  social_follower: { fren: 2, creator: 2 },
  early_bet: { founder: 3, investor: 2 },
  fast_pivot: { founder: 2, buidler: 1 },
  long_termism: { investor: 2, founder: 2, "diamond-hands": 1 },
  chase_narrative: { "alpha-hunter": 3 },
  first_principles: { founder: 2, "onchain-detective": 1 },
  lead_by_example: { founder: 3 },
  delegate: { founder: 2 },
  rank_and_yank: { founder: 1 },
  output_first: { creator: 2, buidler: 2 },
  retention_fail: { founder: 1 },
  keep_simple: { buidler: 2, founder: 1 },
  exit_clause: { founder: 1 },
  no_exclusivity: { founder: 1 },
  passive_bd: { fren: 1 },
  partner_burned: { founder: 1 },
  user_first: { founder: 3 },
  scalable_only: { founder: 2, buidler: 1 },
  over_polish: { creator: 1, buidler: 1 },
  ship_fast: { buidler: 3, founder: 1 },
  make_whole: { founder: 2 },
  fast_response: { founder: 1, fren: 1 },
  silent_crisis: { founder: 1 },
  near_zero: { degen: 1, founder: 1 },
  regulatory_hit: { founder: 2 },
  calm: { hodler: 1, "diamond-hands": 1 },
  time_anxiety: { founder: 1 },
  peak_to_trough: { founder: 2, whale: 1 },
};

const TEXT_ROLE_NEEDLES: Array<{ role: AvatarRoleId; needles: string[] }> = [
  { role: "founder", needles: ["founder", "创业", "創業", "创立", "創立", "创办", "創辦", "创始人", "創始人", "ceo"] },
  { role: "buidler", needles: ["buidler", "builder", "码农", "碼農", "developer", "开发", "開發", "solidity", "dapp"] },
  { role: "onchain-detective", needles: ["on-chain", "onchain", "detective", "链上侦探", "鏈上偵探", "researcher", "研究", "tokenomics"] },
  { role: "degen", needles: ["degen", "p大将", "P大将", "合约", "合約", "金狗", "梭哈", "爆仓", "爆倉"] },
  { role: "hodler", needles: ["hodler", "hodl", "信仰者", "holder", "长期持有", "長期持有", "囤币", "囤幣"] },
  { role: "diamond-hands", needles: ["diamond hands", "钻石手", "鑽石手"] },
  { role: "investor", needles: ["investor", "投资", "投資", "早期项目", "早期項目", "尽调", "盡調", "vc"] },
  { role: "whale", needles: ["whale", "巨鲸", "巨鯨", "蓝鲸", "藍鯨"] },
  { role: "miner", needles: ["miner", "矿工", "礦工", "validator", "节点", "節點"] },
  { role: "creator", needles: ["creator", "内容创作者", "內容創作者", "kol", "直播"] },
  { role: "fren", needles: ["fren", "community", "社区", "社區", "meetup", "社群"] },
  { role: "farmer", needles: ["farmer", "撸毛", "擼毛", "airdrop", "空投", "打金"] },
  { role: "alpha-hunter", needles: ["alpha hunter", "alpha", "猎手", "獵手", "launchpool", "megadrop"] },
  { role: "black-hat", needles: ["black hat", "科学家", "科學家", "黑帽"] },
  { role: "white-hat", needles: ["white hat", "漏洞猎人", "漏洞獵人", "白帽"] },
];

function foldRoleText(text: string): string {
  return `${text || ""}`.toLowerCase().replace(/[\s\u3000]+/g, "");
}

function addRoleScore(scores: Map<AvatarRoleId, number>, role: AvatarRoleId, weight: number) {
  scores.set(role, (scores.get(role) || 0) + weight);
}

/**
 * Soft match after writing — UI pre-highlights this role; user can still change it.
 */
export function suggestRoleFromTags(
  tagIds: string[],
  audience: ChronicleAudience,
  writing = "",
): AvatarRoleId {
  const scores = new Map<AvatarRoleId, number>();

  for (const id of tagIds) {
    const weights = TAG_ROLE_SCORES[id];
    if (!weights) continue;
    for (const [role, weight] of Object.entries(weights) as Array<[AvatarRoleId, number]>) {
      addRoleScore(scores, role, weight);
    }
  }

  const blob = foldRoleText(writing);
  if (blob) {
    for (const item of TEXT_ROLE_NEEDLES) {
      if (item.needles.some((n) => blob.includes(foldRoleText(n)))) {
        addRoleScore(scores, item.role, 4);
      }
    }
  }

  let best: AvatarRoleId | null = null;
  let bestScore = 0;
  for (const [role, score] of scores) {
    if (score > bestScore) {
      best = role;
      bestScore = score;
    }
  }
  if (best) return best;
  return audience === "founder" ? "founder" : "hodler";
}
