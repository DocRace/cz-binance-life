import type { AvatarRoleId } from "./roles";

export type AvatarGenderId = "male" | "female";

export const AVATAR_GENDER_IDS: AvatarGenderId[] = ["male", "female"];

export const DEFAULT_AVATAR_GENDER: AvatarGenderId = "male";

/** Ops pack under `public/assets/chronicle/roles/pack/`. */
const PACK_BASE = "/assets/chronicle/roles/pack";

/** Roles that only shipped one unisex cutout in the pack. */
const UNISEX_ROLES: AvatarRoleId[] = ["black-hat", "white-hat", "fren", "whale"];

export function isAvatarGenderId(value: string): value is AvatarGenderId {
  return value === "male" || value === "female";
}

/**
 * Half-body role art from the book-club avatar pack.
 * Prefer gendered file; fall back to unisex / opposite / legacy style-c path.
 */
export function rolePackSrc(role: AvatarRoleId, gender: AvatarGenderId = DEFAULT_AVATAR_GENDER): string {
  if (UNISEX_ROLES.includes(role)) {
    return `${PACK_BASE}/${role}.png`;
  }
  return `${PACK_BASE}/${role}-${gender}.png`;
}

/** Warm browser cache for showcase cycling so art + label can swap in lockstep. */
export function preloadRolePack(roles: AvatarRoleId[]): void {
  if (typeof window === "undefined") return;
  const urls = new Set<string>();
  for (const role of roles) {
    if (UNISEX_ROLES.includes(role)) {
      urls.add(rolePackSrc(role));
    } else {
      urls.add(rolePackSrc(role, "male"));
      urls.add(rolePackSrc(role, "female"));
    }
  }
  for (const src of urls) {
    const img = new Image();
    img.decoding = "async";
    img.src = src;
  }
}

export function rolePackFallbacks(
  role: AvatarRoleId,
  gender: AvatarGenderId = DEFAULT_AVATAR_GENDER,
): string[] {
  const primary = rolePackSrc(role, gender);
  const other = gender === "male" ? "female" : "male";
  const list = [
    primary,
    `${PACK_BASE}/${role}-${other}.png`,
    `${PACK_BASE}/${role}.png`,
    `/assets/chronicle/roles/c/${role}.png`,
  ];
  return [...new Set(list)];
}

/**
 * Cover art whose bottom-right zone is light/airy — dark byline is fine.
 * Dark / busy art (hoodie, etc.) should skip plates and use a white byline.
 */
const TITLE_ZONE_LIGHT: ReadonlySet<string> = new Set([
  "founder:female",
  "creator:female",
  "investor:female",
]);

/** True when cover art under the byline is dark — use white role label, no gradient. */
export function coverHasDarkBylineZone(
  role: AvatarRoleId | null | undefined,
  gender: AvatarGenderId = DEFAULT_AVATAR_GENDER,
): boolean {
  if (!role) return false;
  if (UNISEX_ROLES.includes(role)) return true;
  return !TITLE_ZONE_LIGHT.has(`${role}:${gender}`);
}
