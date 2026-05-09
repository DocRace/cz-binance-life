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

export async function bookBffJson<T>(
  path: string,
  init: RequestInit = {},
): Promise<IpdexEnvelope<T> & { rawStatus: number }> {
  const res = await bookBffFetch(path, init);
  let body: IpdexEnvelope<T> = { code: -1, message: "empty", data: null };
  try {
    body = (await res.json()) as IpdexEnvelope<T>;
  } catch {
    body = { code: -1, message: "invalid_json", data: null };
  }
  return { ...body, rawStatus: res.status };
}
