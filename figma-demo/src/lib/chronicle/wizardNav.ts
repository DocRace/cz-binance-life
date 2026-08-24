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

/** Official book-club home when this tab has nowhere to go back to. */
export const CHRONICLE_HOME_PATH = "/";

/**
 * True when this tab can leave the activity via the browser history
 * (same-tab arrival). False for a fresh tab / typed URL / emptied stack.
 */
export function canLeaveChronicleViaHistory(): boolean {
  try {
    const nav = "navigation" in window
      ? (window as Window & { navigation?: { canGoBack?: boolean } }).navigation
      : undefined;
    if (nav && typeof nav.canGoBack === "boolean") return nav.canGoBack;
  } catch {
    /* ignore */
  }
  return window.history.length > 1 && Boolean(document.referrer);
}
