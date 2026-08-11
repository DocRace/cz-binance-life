import { isChronicleNodeId } from "./distill";
import type { ChronicleAudience, SharePayloadV2, UserEntries } from "./types";

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

export function encodeSharePayload(
  audience: ChronicleAudience,
  entries: UserEntries,
  confirmedTagIds: string[],
): string {
  const payload: SharePayloadV2 = {
    v: 2,
    audience,
    entries: compactEntries(entries),
    confirmedTagIds: confirmedTagIds.slice(0, 12),
  };
  return toBase64Url(JSON.stringify(payload));
}

export function decodeSharePayload(token: string): SharePayloadV2 | null {
  try {
    const raw = JSON.parse(fromBase64Url(token));

    // v2
    if (raw && raw.v === 2 && (raw.audience === "retail" || raw.audience === "founder")) {
      const entries = compactEntries(raw.entries || {});
      const confirmedTagIds = Array.isArray(raw.confirmedTagIds)
        ? raw.confirmedTagIds.filter((x: unknown) => typeof x === "string").slice(0, 12)
        : [];
      return { v: 2, audience: raw.audience, entries, confirmedTagIds };
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
      return { v: 2, audience: "retail", entries, confirmedTagIds: [] };
    }

    return null;
  } catch {
    return null;
  }
}

export function buildShareUrl(
  audience: ChronicleAudience,
  entries: UserEntries,
  confirmedTagIds: string[],
): string {
  const token = encodeSharePayload(audience, entries, confirmedTagIds);
  const url = new URL("/club/chronicle", window.location.origin);
  url.searchParams.set("share", token);
  return url.toString();
}
