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

/** Soft match after writing — user can still change on the author step. */
export function suggestRoleFromTags(
  tagIds: string[],
  audience: ChronicleAudience,
): AvatarRoleId {
  const blob = tagIds.join(" ").toLowerCase();
  if (/founder|ceo|startup|launch/.test(blob)) return "founder";
  if (/buidl|dev|code|solidity|contract/.test(blob)) return "buidler";
  if (/detect|research|onchain|dune/.test(blob)) return "onchain-detective";
  if (/degen|trade|perp|leverage/.test(blob)) return "degen";
  if (/diamond|hold/.test(blob)) return "diamond-hands";
  if (/invest|vc|thesis/.test(blob)) return "investor";
  if (/whale|otc/.test(blob)) return "whale";
  if (/creat|content|kol/.test(blob)) return "creator";
  if (/farm|quest|airdrop|point/.test(blob)) return "farmer";
  if (/alpha|launchpool|megadrop/.test(blob)) return "alpha-hunter";
  if (/white.?hat|bounty|audit/.test(blob)) return "white-hat";
  if (/black.?hat|exploit/.test(blob)) return "black-hat";
  if (audience === "founder") return "founder";
  return "hodler";
}
