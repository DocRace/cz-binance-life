import { truncateAuthorName } from "./authorName";
import { isChronicleNodeId } from "./distill";
import { isAvatarGenderId, type AvatarGenderId } from "./roleArt";
import { isAvatarRoleId, isAvatarStyleId } from "./roles";
import type {
  ChronicleAudience,
  SharePayloadV2,
  SharePayloadV3,
  UserEntries,
} from "./types";

function toBase64Url(json: string): string {
  const bytes = new TextEncoder().encode(json);
  let bin = "";
  bytes.forEach((b) => {
    bin += String.fromCharCode(b);
  });
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(token: string): string {
  const b64 = token.replace(/-/g, "+").replace(/_/g, "/");
  const pad = b64.length % 4 === 0 ? "" : "=".repeat(4 - (b64.length % 4));
  const bin = atob(b64 + pad);
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function compactEntries(entries: UserEntries): UserEntries {
  const out: UserEntries = {};
  for (const [id, text] of Object.entries(entries)) {
    const t = `${text || ""}`.trim().slice(0, 280);
    if (!t || !isChronicleNodeId(id)) continue;
    out[id] = t;
  }
  return out;
}

export type ShareEncodeInput = {
  audience: ChronicleAudience;
  entries: UserEntries;
  confirmedTagIds: string[];
  authorName?: string;
  roleId?: string | null;
  styleId?: string;
  gender?: AvatarGenderId;
  selectedTagIds?: string[];
  selectedPrinciples?: string[];
  price?: number;
};

export function encodeSharePayload(input: ShareEncodeInput): string {
  const payload: SharePayloadV3 = {
    v: 3,
    audience: input.audience,
    // Public share URL must not carry raw writing (meeting: no BNB review dump).
    entries: {},
    confirmedTagIds: input.confirmedTagIds.slice(0, 12),
    authorName: truncateAuthorName(`${input.authorName || ""}`) || undefined,
    roleId: input.roleId && isAvatarRoleId(input.roleId) ? input.roleId : undefined,
    styleId: input.styleId && isAvatarStyleId(input.styleId) ? input.styleId : undefined,
    gender: input.gender && isAvatarGenderId(input.gender) ? input.gender : undefined,
    selectedTagIds: (input.selectedTagIds || []).slice(0, 3),
    selectedPrinciples: (input.selectedPrinciples || []).slice(0, 3),
    price:
      typeof input.price === "number" && Number.isFinite(input.price)
        ? Math.round(input.price * 100) / 100
        : undefined,
  };
  return toBase64Url(JSON.stringify(payload));
}

export function decodeSharePayload(token: string): SharePayloadV3 | null {
  try {
    const raw = JSON.parse(fromBase64Url(token));

    if (raw && raw.v === 3 && (raw.audience === "retail" || raw.audience === "founder")) {
      return {
        v: 3,
        audience: raw.audience,
        entries: compactEntries(raw.entries || {}),
        confirmedTagIds: Array.isArray(raw.confirmedTagIds)
          ? raw.confirmedTagIds.filter((x: unknown) => typeof x === "string").slice(0, 12)
          : [],
        authorName: typeof raw.authorName === "string" ? truncateAuthorName(raw.authorName) || undefined : undefined,
        roleId: typeof raw.roleId === "string" && isAvatarRoleId(raw.roleId) ? raw.roleId : undefined,
        styleId:
          typeof raw.styleId === "string" && isAvatarStyleId(raw.styleId) ? raw.styleId : undefined,
        gender:
          typeof raw.gender === "string" && isAvatarGenderId(raw.gender) ? raw.gender : undefined,
        selectedTagIds: Array.isArray(raw.selectedTagIds)
          ? raw.selectedTagIds.filter((x: unknown) => typeof x === "string").slice(0, 3)
          : [],
        selectedPrinciples: Array.isArray(raw.selectedPrinciples)
          ? raw.selectedPrinciples.filter((x: unknown) => typeof x === "string").slice(0, 3)
          : [],
        price: typeof raw.price === "number" ? raw.price : undefined,
      };
    }

    // v2
    if (raw && raw.v === 2 && (raw.audience === "retail" || raw.audience === "founder")) {
      const v2 = raw as SharePayloadV2;
      return {
        v: 3,
        audience: v2.audience,
        entries: compactEntries(v2.entries || {}),
        confirmedTagIds: Array.isArray(v2.confirmedTagIds)
          ? v2.confirmedTagIds.filter((x: unknown) => typeof x === "string").slice(0, 12)
          : [],
      };
    }

    // v1 legacy: array of [nodeId, text]
    if (Array.isArray(raw)) {
      const entries: UserEntries = {};
      for (const item of raw) {
        if (!Array.isArray(item) || item.length < 2) continue;
        const [id, text] = item;
        if (!isChronicleNodeId(id)) continue;
        const t = `${text || ""}`.trim().slice(0, 280);
        if (t) entries[id] = t;
      }
      return { v: 3, audience: "retail", entries, confirmedTagIds: [] };
    }

    return null;
  } catch {
    return null;
  }
}

export function buildShareUrl(input: ShareEncodeInput, opts?: { ref?: string }): string {
  const token = encodeSharePayload(input);
  const url = new URL("/club/chronicle", window.location.origin);
  url.searchParams.set("share", token);
  const ref = `${opts?.ref || ""}`.trim();
  if (ref) url.searchParams.set("ref", ref);
  return url.toString();
}
