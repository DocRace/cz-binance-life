const KEY = "czlife.chronicle.published.v1";
const MAX_BOOKS = 20;

export type PublishedBook = {
  entryId: string;
  shareToken: string;
  authorName: string;
  roleId: string | null;
  styleId?: string | null;
  tags: string[];
  price: number | null;
  savedAt: string;
};

export function loadPublishedBooks(): PublishedBook[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((row) => row && typeof row.entryId === "string" && typeof row.shareToken === "string")
      .map((row) => ({
        entryId: row.entryId,
        shareToken: row.shareToken,
        authorName: typeof row.authorName === "string" ? row.authorName : "",
        roleId: typeof row.roleId === "string" ? row.roleId : null,
        styleId: typeof row.styleId === "string" ? row.styleId : null,
        tags: Array.isArray(row.tags) ? row.tags.filter((x: unknown) => typeof x === "string") : [],
        price: typeof row.price === "number" && Number.isFinite(row.price) ? row.price : null,
        savedAt: typeof row.savedAt === "string" ? row.savedAt : new Date().toISOString(),
      }));
  } catch {
    return [];
  }
}

export function rememberPublishedBook(book: PublishedBook) {
  const entryId = `${book.entryId || ""}`.trim();
  const shareToken = `${book.shareToken || ""}`.trim();
  if (!entryId || !shareToken) return;
  const next: PublishedBook = {
    ...book,
    entryId,
    shareToken,
    savedAt: book.savedAt || new Date().toISOString(),
  };
  const list = loadPublishedBooks().filter(
    (row) => row.entryId !== entryId && row.shareToken !== shareToken,
  );
  try {
    localStorage.setItem(KEY, JSON.stringify([next, ...list].slice(0, MAX_BOOKS)));
  } catch {
    /* ignore quota */
  }
}

export function chronicleMinePath(shareToken: string): string {
  const q = new URLSearchParams();
  q.set("share", shareToken);
  q.set("view", "mine");
  return `/club/chronicle?${q.toString()}`;
}
