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
