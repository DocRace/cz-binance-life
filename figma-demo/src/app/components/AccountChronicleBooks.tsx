import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { BookOpen } from "lucide-react";
import { useTranslation } from "react-i18next";
import ChronicleBookCover from "./ChronicleBookCover";
import { CARD_SURFACE } from "../layout/pageLayout";
import { bindMyBook, fetchMyBooks, type RankEntry } from "../../lib/chronicle/rankClient";
import {
  chronicleMinePath,
  loadPublishedBooks,
  type PublishedBook,
} from "../../lib/chronicle/publishedBooks";
import { loadDraft } from "../../lib/chronicle/storage";
import { decodeSharePayload } from "../../lib/chronicle/shareCodec";
import { isAvatarRoleId, type AvatarRoleId } from "../../lib/chronicle/roles";
import { DEFAULT_AVATAR_GENDER, type AvatarGenderId } from "../../lib/chronicle/roleArt";
import { formatShareUsd } from "../../lib/chronicle/pricing";
import { truncateAuthorName } from "../../lib/chronicle/authorName";

type BookCard = {
  key: string;
  entryId: string;
  shareToken: string;
  authorName: string;
  roleId: AvatarRoleId | null;
  gender: AvatarGenderId;
  tags: string[];
  price: number | null;
};

function roleFrom(value: string | null | undefined): AvatarRoleId | null {
  return value && isAvatarRoleId(value) ? value : null;
}

function cardFromEntry(entry: RankEntry): BookCard | null {
  const shareToken = `${entry.shareToken || ""}`.trim();
  if (!shareToken) return null;
  const decoded = decodeSharePayload(shareToken);
  return {
    key: entry.entryId,
    entryId: entry.entryId,
    shareToken,
    authorName: entry.authorName || decoded?.authorName || "",
    roleId: roleFrom(entry.roleId) || decoded?.roleId || null,
    gender: decoded?.gender || DEFAULT_AVATAR_GENDER,
    tags: entry.tags?.length ? entry.tags : decoded?.selectedTagIds || [],
    price: typeof entry.price === "number" ? entry.price : decoded?.price ?? null,
  };
}

function cardFromLocal(book: PublishedBook): BookCard | null {
  const shareToken = `${book.shareToken || ""}`.trim();
  if (!shareToken) return null;
  const decoded = decodeSharePayload(shareToken);
  return {
    key: book.entryId || shareToken.slice(0, 16),
    entryId: book.entryId,
    shareToken,
    authorName: book.authorName || decoded?.authorName || "",
    roleId: roleFrom(book.roleId) || decoded?.roleId || null,
    gender: decoded?.gender || DEFAULT_AVATAR_GENDER,
    tags: book.tags?.length ? book.tags : decoded?.selectedTagIds || [],
    price: typeof book.price === "number" ? book.price : decoded?.price ?? null,
  };
}

function mergeCards(server: BookCard[], local: BookCard[]): BookCard[] {
  const seen = new Set<string>();
  const out: BookCard[] = [];
  for (const card of [...server, ...local]) {
    const id = card.entryId || card.shareToken;
    if (!id || seen.has(id) || seen.has(card.shareToken)) continue;
    seen.add(card.entryId);
    seen.add(card.shareToken);
    out.push(card);
  }
  return out;
}

export default function AccountChronicleBooks() {
  const { t } = useTranslation();
  const [books, setBooks] = useState<BookCard[]>([]);

  useEffect(() => {
    let cancelled = false;
    const local = loadPublishedBooks().map(cardFromLocal).filter((x): x is BookCard => Boolean(x));

    void (async () => {
      await Promise.all(
        loadPublishedBooks().map((book) =>
          bindMyBook({ entryId: book.entryId, shareToken: book.shareToken }),
        ),
      );
      const draftName = `${loadDraft().authorName || ""}`.trim();
      if (draftName) {
        await bindMyBook({ authorName: draftName });
      }
      const mine = await fetchMyBooks();
      const server = mine.map(cardFromEntry).filter((x): x is BookCard => Boolean(x));
      if (!cancelled) setBooks(mergeCards(server, local));
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const empty = books.length === 0;
  const subtitle = useMemo(
    () => (empty ? t("account.myBooks.empty") : t("account.myBooks.count", { count: books.length })),
    [empty, books.length, t],
  );

  return (
    <section className={`${CARD_SURFACE} mb-10 p-5 sm:p-6`}>
      <div className="mb-4 flex items-start gap-3">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gold/15 ring-1 ring-gold/35">
          <BookOpen className="h-6 w-6 text-gold" aria-hidden />
        </span>
        <div className="min-w-0">
          <h2 className="font-display text-xl text-foreground">{t("account.myBooks.title")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
        </div>
      </div>

      {empty ? (
        <Link
          to="/club/chronicle"
          className="inline-flex items-center justify-center rounded-full bg-gold/90 px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-gold"
        >
          {t("account.myBooks.writeCta")}
        </Link>
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {books.map((book) => (
            <li key={book.key}>
              <Link
                to={chronicleMinePath(book.shareToken)}
                className="flex items-center gap-4 rounded-2xl border border-white/8 bg-black/20 p-3 transition-colors hover:border-gold/40"
              >
                <ChronicleBookCover
                  authorName={truncateAuthorName(book.authorName)}
                  roleId={book.roleId}
                  gender={book.gender}
                  keywords={book.tags}
                  className="w-[88px] shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">
                    {truncateAuthorName(book.authorName) || t("chronicle.anonymousAuthor")}
                  </p>
                  {book.price != null ? (
                    <p className="mt-1 font-tech text-sm text-gold">
                      {t("chronicle.posterPrice", { price: formatShareUsd(book.price) })}
                    </p>
                  ) : null}
                  <p className="mt-2 text-xs text-gold">{t("account.myBooks.openCta")}</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
