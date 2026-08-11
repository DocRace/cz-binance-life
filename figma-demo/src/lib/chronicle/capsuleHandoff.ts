import type { ChronicleAudience, ChronicleResult } from "./types";
import { CHRONICLE_NODE_YEAR } from "./nodes";

export type CapsuleHandoffPayload = {
  v: 1;
  source: "cz-chronicle";
  audience: ChronicleAudience;
  locale: "zh" | "en";
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
  },
): CapsuleHandoffPayload {
  return {
    v: 1,
    source: "cz-chronicle",
    audience: result.audience,
    locale: opts.locale,
    nodes: result.nodes.slice(0, 15).map((n) => ({
      year: CHRONICLE_NODE_YEAR[n.nodeId] || n.nodeId,
      title: opts.nodeTitles?.[n.nodeId],
      text: n.text.slice(0, 800),
      tags: n.keywords.slice(0, 8),
    })),
    tags: result.confirmedTagIds.slice(0, 16).map((id) => ({
      id,
      label: opts.tagLabels[id] || result.tags.find((t) => t.id === id)?.label || id,
    })),
    principles: result.principles.slice(0, 6).map((p) => ({
      name: p.name,
      note: p.note,
    })),
    shareUrl: opts.shareUrl,
  };
}

export function encodeCapsuleHandoff(payload: CapsuleHandoffPayload): string {
  return toBase64Url(JSON.stringify(payload));
}

/** Open Life Capsule import page; user logs in there (separate accounts), then auto-saves. */
export function buildLifeCapsuleImportUrl(payload: CapsuleHandoffPayload): string {
  const token = encodeCapsuleHandoff(payload);
  const url = new URL("/from/cz-chronicle", LIFE_CAPSULE_ORIGIN);
  url.searchParams.set("p", token);
  return url.toString();
}

export function getLifeCapsuleOrigin(): string {
  return LIFE_CAPSULE_ORIGIN;
}
