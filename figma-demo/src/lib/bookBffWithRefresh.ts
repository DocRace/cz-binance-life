import { bookBffJson, type BookBffJsonResult } from "./bookBffClient";

/** Retries once after `POST /api/bff/auth/refresh` when the first response is 401. */
export async function bookBffJsonWithRefresh<T>(
  path: string,
  init: RequestInit = {},
): Promise<BookBffJsonResult<T>> {
  let r = await bookBffJson<T>(path, init);
  if (r.rawStatus === 401 && !r.transportError) {
    const ref = await bookBffJson<{ ok?: boolean }>("/api/bff/auth/refresh", { method: "POST" });
    if (ref.code === 0) r = await bookBffJson<T>(path, init);
  }
  return r;
}
