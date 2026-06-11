import {
  bookBffIsTransportIssue,
  bookBffIsUnauthorized,
  bookBffJson,
  bookBffProfileUnavailable,
  type BookBffJsonResult,
} from "./bookBffClient";

/** Retries once after `POST /api/bff/auth/refresh` when the first response looks unauthorized. */
export async function bookBffJsonWithRefresh<T>(
  path: string,
  init: RequestInit = {},
): Promise<BookBffJsonResult<T>> {
  let r = await bookBffJson<T>(path, init);
  if (bookBffIsUnauthorized(r)) {
    const ref = await bookBffJson<{ ok?: boolean }>("/api/bff/auth/refresh", { method: "POST" });
    if (ref.code === 0) r = await bookBffJson<T>(path, init);
  }
  return r;
}

/** True when `/me` succeeds; false when session is dead. Transport errors return true (no forced logout). */
export async function bookBffVerifySessionAlive(): Promise<boolean> {
  const me = await bookBffJsonWithRefresh<Record<string, unknown>>("/api/bff/me");
  if (me.code === 0 && me.data != null) return true;
  if (bookBffIsTransportIssue(me)) return true;
  return !bookBffProfileUnavailable(me);
}
