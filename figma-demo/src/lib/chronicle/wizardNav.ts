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

const ARRIVED_FROM_KEY = "czlife.chronicle.arrivedFrom.v1";

function pathFromUrl(raw: string): string | null {
  try {
    const url = new URL(raw, window.location.origin);
    if (url.origin !== window.location.origin) return null;
    return `${url.pathname}${url.search}`;
  } catch {
    return null;
  }
}

export function isChronicleSurfacePath(path: string): boolean {
  const pathname = (path.split("?")[0] || path).trim();
  return (
    pathname === "/club/chronicle" ||
    pathname.startsWith("/club/chronicle/") ||
    pathname.startsWith("/s/")
  );
}

function readArrivedFrom(): string | null {
  try {
    return sessionStorage.getItem(ARRIVED_FROM_KEY);
  } catch {
    return null;
  }
}

/**
 * First landing into chronicle / rank this tab: remember the outside page.
 * Empty string means a copied / typed link with no referrer.
 */
export function rememberChronicleArrival(): string {
  const refPath = typeof document === "undefined" ? null : pathFromUrl(document.referrer);
  const fromOutside = !refPath || !isChronicleSurfacePath(refPath);
  if (fromOutside) {
    const dest = refPath && !isChronicleSurfacePath(refPath) ? refPath : "";
    try {
      sessionStorage.setItem(ARRIVED_FROM_KEY, dest);
    } catch {
      /* ignore */
    }
    return dest;
  }
  return readArrivedFrom() ?? "";
}

/** Leave the activity: the page that sent the user in, or the official home. */
export function chronicleLeavePath(): string {
  const stored = readArrivedFrom();
  if (stored === "") return CHRONICLE_HOME_PATH;
  if (stored && !isChronicleSurfacePath(stored)) return stored;
  const refPath = typeof document === "undefined" ? null : pathFromUrl(document.referrer);
  if (refPath && !isChronicleSurfacePath(refPath)) return refPath;
  return CHRONICLE_HOME_PATH;
}
