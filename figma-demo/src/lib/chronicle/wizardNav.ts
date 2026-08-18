import type { ChronicleStep } from "./types";

/** Forward order after the meeting rework: write first, portrait after keywords. */
export const WIZARD_STEPS: ChronicleStep[] = ["intro", "fill", "result", "author", "book"];

export const WIZARD_PREV: Record<ChronicleStep, ChronicleStep | null> = {
  intro: null,
  fill: "intro",
  result: "fill",
  author: "result",
  book: "author",
};

export const MIN_FILLED_NODES = 6;

export const INVITE_REF_KEY = "czlife.chronicle.inviteRef.v1";

export function isWizardStep(value: unknown): value is ChronicleStep {
  return typeof value === "string" && (WIZARD_STEPS as string[]).includes(value);
}

export function persistInviteRef(ref: string) {
  const id = `${ref || ""}`.trim();
  if (!id) return;
  try {
    sessionStorage.setItem(INVITE_REF_KEY, id);
  } catch {
    /* ignore */
  }
}

export function loadInviteRef(fromSearch?: string | null): string {
  const q = `${fromSearch || ""}`.trim();
  if (q) {
    persistInviteRef(q);
    return q;
  }
  try {
    return `${sessionStorage.getItem(INVITE_REF_KEY) || ""}`.trim();
  } catch {
    return "";
  }
}

export function clearInviteRef() {
  try {
    sessionStorage.removeItem(INVITE_REF_KEY);
  } catch {
    /* ignore */
  }
}

export function chroniclePath(search: string): string {
  const q = search.startsWith("?") ? search.slice(1) : search;
  return q ? `/club/chronicle?${q}` : "/club/chronicle";
}
