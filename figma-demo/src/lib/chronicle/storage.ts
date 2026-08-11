import type { ChronicleAudience, UserEntries } from "./types";

const DRAFT_KEY = "czlife.chronicle.draft.v2";
const DONE_KEY = "czlife.chronicle.completions.v1";
const BASE_PARTICIPANTS = 1286;

export type ChronicleDraft = {
  audience: ChronicleAudience;
  entries: UserEntries;
  confirmedTagIds: string[];
};

export function loadDraft(): ChronicleDraft {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return { audience: "retail", entries: {}, confirmedTagIds: [] };
    const parsed = JSON.parse(raw) as Partial<ChronicleDraft>;
    return {
      audience: parsed.audience === "founder" ? "founder" : "retail",
      entries: parsed.entries && typeof parsed.entries === "object" ? parsed.entries : {},
      confirmedTagIds: Array.isArray(parsed.confirmedTagIds) ? parsed.confirmedTagIds : [],
    };
  } catch {
    return { audience: "retail", entries: {}, confirmedTagIds: [] };
  }
}

export function saveDraft(draft: ChronicleDraft) {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch {
    /* ignore quota */
  }
}

export function clearDraft() {
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {
    /* ignore */
  }
}

export function bumpCompletionCount(): number {
  try {
    const next = getLocalCompletions() + 1;
    localStorage.setItem(DONE_KEY, String(next));
    return BASE_PARTICIPANTS + next;
  } catch {
    return BASE_PARTICIPANTS + 1;
  }
}

export function getParticipantCount(): number {
  return BASE_PARTICIPANTS + getLocalCompletions();
}

function getLocalCompletions(): number {
  try {
    const n = parseInt(localStorage.getItem(DONE_KEY) || "0", 10);
    return Number.isFinite(n) && n > 0 ? n : 0;
  } catch {
    return 0;
  }
}
