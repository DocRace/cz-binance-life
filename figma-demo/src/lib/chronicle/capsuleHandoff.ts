import { truncateAuthorName } from "./authorName";
import type { ChronicleAudience, ChronicleResult } from "./types";
import { CHRONICLE_NODE_YEAR } from "./nodes";

export type CapsuleHandoffPayload = {
  v: 1;
  source: "cz-chronicle";
  audience: ChronicleAudience;
  locale: "zh" | "en";
  authorName?: string;
  priceUsdt?: number;
  nodes: Array<{ year: string; title?: string; text: string; tags?: string[] }>;
  tags: Array<{ id: string; label: string }>;
  principles: Array<{ name: string; note?: string | null }>;
  shareUrl?: string;
};

function toBase64Url(json: string): string {
  const bytes = new TextEncoder().encode(json);
  let bin = "";
  bytes.forEach((b) => {
    bin += String.fromCharCode(b);
  });
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

const LIFE_CAPSULE_ORIGIN = `${import.meta.env.VITE_LIFE_CAPSULE_URL || "https://lifecapsules.ai"}`.replace(
  /\/$/,
  "",
);

export function buildCapsuleHandoffPayload(
  result: ChronicleResult,
  opts: {
    locale: "zh" | "en";
    tagLabels: Record<string, string>;
    nodeTitles?: Record<string, string>;
    shareUrl?: string;
    authorName?: string;
    priceUsdt?: number;
    selectedTagIds?: string[];
    selectedPrinciples?: string[];
  },
): CapsuleHandoffPayload {
  const tagIds = (opts.selectedTagIds?.length ? opts.selectedTagIds : result.confirmedTagIds).slice(
    0,
    3,
  );
  const principleNames = opts.selectedPrinciples?.length
    ? opts.selectedPrinciples
    : result.principles.map((p) => p.name);
  const principleSet = new Set(principleNames);
  return {
    v: 1,
    source: "cz-chronicle",
    audience: result.audience,
    locale: opts.locale,
    authorName: truncateAuthorName(opts.authorName || "") || undefined,
    priceUsdt: opts.priceUsdt,
    nodes: result.nodes.slice(0, 15).map((n) => ({
      year: CHRONICLE_NODE_YEAR[n.nodeId] || n.nodeId,
      title: opts.nodeTitles?.[n.nodeId],
      text: n.text.slice(0, 800),
      tags: n.keywords.slice(0, 8),
    })),
    tags: tagIds.map((id) => ({
      id,
      label: opts.tagLabels[id] || result.tags.find((t) => t.id === id)?.label || id,
    })),
    principles: result.principles
      .filter((p) => principleSet.has(p.name))
      .slice(0, 3)
      .map((p) => ({
        name: p.name,
        note: p.note,
      })),
    shareUrl: opts.shareUrl,
  };
}

export function encodeCapsuleHandoff(payload: CapsuleHandoffPayload): string {
  return toBase64Url(JSON.stringify(payload));
}

/**
 * Open Life Capsule import page; user logs in there (separate accounts), then auto-saves.
 * Payload goes in the hash so nginx never sees a giant query string (414 Request-URI Too Large).
 */
export function buildLifeCapsuleImportUrl(payload: CapsuleHandoffPayload): string {
  const token = encodeCapsuleHandoff(payload);
  return `${LIFE_CAPSULE_ORIGIN}/from/cz-chronicle#p=${token}`;
}

export function getLifeCapsuleOrigin(): string {
  return LIFE_CAPSULE_ORIGIN;
}
