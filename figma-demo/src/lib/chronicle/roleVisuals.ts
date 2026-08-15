import { DEFAULT_AVATAR_GENDER, rolePackSrc, type AvatarGenderId } from "./roleArt";
import type { AvatarRoleId, AvatarStyleId } from "./roles";

/** Product default until ops picks another board / ships cutouts. */
export const DEFAULT_AVATAR_STYLE: AvatarStyleId = "c";

export type RoleVisual = {
  /** Tailwind-friendly hex for placeholder disc */
  bg: string;
  accent: string;
  /** Short mark shown until real art lands */
  mark: string;
};

export const ROLE_VISUALS: Record<AvatarRoleId, RoleVisual> = {
  founder: { bg: "#F0B90B", accent: "#1E2026", mark: "Fd" },
  buidler: { bg: "#8B5CF6", accent: "#F5F5F5", mark: "</>" },
  "onchain-detective": { bg: "#14B8A6", accent: "#042F2E", mark: "Od" },
  degen: { bg: "#F97316", accent: "#1C1917", mark: "Dg" },
  hodler: { bg: "#EAB308", accent: "#1C1917", mark: "Hd" },
  "diamond-hands": { bg: "#FBBF24", accent: "#1C1917", mark: "◆" },
  investor: { bg: "#3B82F6", accent: "#F8FAFC", mark: "Iv" },
  whale: { bg: "#0EA5E9", accent: "#F0F9FF", mark: "Wh" },
  miner: { bg: "#7C3AED", accent: "#F5F3FF", mark: "Mn" },
  creator: { bg: "#84CC16", accent: "#14532D", mark: "Cr" },
  fren: { bg: "#0D9488", accent: "#F0FDFA", mark: "Fr" },
  farmer: { bg: "#65A30D", accent: "#F7FEE7", mark: "Fm" },
  "alpha-hunter": { bg: "#EA580C", accent: "#FFF7ED", mark: "α" },
  "black-hat": { bg: "#111827", accent: "#F9FAFB", mark: "BH" },
  "white-hat": { bg: "#E5E7EB", accent: "#111827", mark: "WH" },
};

/** Prefer book-club avatar pack; legacy style folders remain as RoleAvatar fallbacks. */
export function roleArtSrc(
  role: AvatarRoleId,
  _style: AvatarStyleId = DEFAULT_AVATAR_STYLE,
  gender: AvatarGenderId = DEFAULT_AVATAR_GENDER,
): string {
  return rolePackSrc(role, gender);
}
