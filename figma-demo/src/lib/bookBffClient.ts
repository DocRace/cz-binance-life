/**
 * Book-site BFF client. In dev, Vite proxies /api/bff -> BFF (leave VITE_BOOK_BFF_URL empty).
 * Production: set VITE_BOOK_BFF_URL to the BFF origin when it differs from the SPA origin.
 */

export function getBookBffBaseUrl(): string {
  return (import.meta.env.VITE_BOOK_BFF_URL || "").trim().replace(/\/+$/, "");
}

export async function bookBffFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const base = getBookBffBaseUrl();
  const url = `${base}${path.startsWith("/") ? path : `/${path}`}`;
  const headers = new Headers(init.headers);
  const hasBody = init.body !== undefined && init.body !== null;
  if (hasBody && !(init.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  return fetch(url, { ...init, credentials: "include", headers });
}

export type IpdexEnvelope<T> = { code: number; message: string; data: T | null };

export type BookBffJsonResult<T> = IpdexEnvelope<T> & {
  rawStatus: number;
  /** Missing body or not JSON/HTML from proxy — usually BFF not running / wrong proxy. */
  transportError?: boolean;
};

export async function bookBffJson<T>(
  path: string,
  init: RequestInit = {},
): Promise<BookBffJsonResult<T>> {
  let res;
  try {
    res = await bookBffFetch(path, init);
  } catch {
    return {
      code: -1,
      message: "fetch_failed",
      data: null,
      rawStatus: 0,
      transportError: true,
    };
  }

  const rawStatus = res.status;
  const text = await res.text().catch(() => "");
  const trimmed = text.trim();

  if (!trimmed) {
    return {
      code: -1,
      message: "empty",
      data: null,
      rawStatus,
      transportError: true,
    };
  }

  let parsedUnknown: unknown;
  try {
    parsedUnknown = JSON.parse(trimmed) as unknown;
  } catch {
    return {
      code: -1,
      message: "invalid_json",
      data: null,
      rawStatus,
      transportError: true,
    };
  }

  if (
    typeof parsedUnknown !== "object" ||
    parsedUnknown === null ||
    typeof (parsedUnknown as Record<string, unknown>).code !== "number"
  ) {
    return {
      code: -1,
      message: "invalid_envelope",
      data: null,
      rawStatus,
      transportError: true,
    };
  }

  const body = parsedUnknown as IpdexEnvelope<T>;
  return { ...body, rawStatus };
}

/** HTTP/proxy/network shape issue — callers should prefer `bffOffline` copy over raw `message`. */
export function bookBffIsTransportIssue(out: {
  transportError?: boolean;
  rawStatus?: number;
}): boolean {
  const s = typeof out.rawStatus === "number" ? out.rawStatus : 0;
  return Boolean(out.transportError || (s >= 502 && s <= 504));
}

/** Stale cookie, rotated refresh token, or invalid access token — not a transport glitch. */
export function bookBffIsUnauthorized(out: {
  code?: number;
  message?: string;
  rawStatus?: number;
  transportError?: boolean;
}): boolean {
  if (out.transportError) return false;
  const status = typeof out.rawStatus === "number" ? out.rawStatus : 0;
  if (status === 401 || status === 403) return true;
  if (out.code === -10005) return true;
  const msg = `${out.message ?? ""}`.toLowerCase();
  return (
    msg.includes("unauthorized") ||
    msg.includes("jwt") ||
    msg.includes("token") ||
    msg.includes("expired") ||
    msg.includes("login") ||
    msg === "no_refresh" ||
    msg === "refresh_failed"
  );
}

/**
 * `/me` (or equivalent profile) did not return user data and this is not a transient outage.
 * Covers IPDEX 400 responses that are not tagged Unauthorized but still mean the session is dead.
 */
export function bookBffProfileUnavailable(out: {
  code?: number;
  data?: unknown;
  rawStatus?: number;
  transportError?: boolean;
}): boolean {
  if (bookBffIsTransportIssue(out)) return false;
  if (out.code === 0 && out.data != null && typeof out.data === "object") return false;
  return true;
}

/** Clear BFF cookies and reload so Account shows the login screen with a clean session. */
export async function bookBffClearSessionAndReload(): Promise<void> {
  try {
    await bookBffJson("/api/bff/auth/logout", { method: "POST" });
  } catch {
    /* ignore */
  }
  if (typeof window !== "undefined") window.location.reload();
}
