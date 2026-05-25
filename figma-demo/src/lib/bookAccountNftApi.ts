/**
 * Helpers for merging IPDEX nft-balance paging + mapping rows for Account / on-site redeem UI.
 */
import { normalizeRedeemSourceTokenId } from "./bookRedeemClient";
import { bookBffJsonWithRefresh } from "./bookBffWithRefresh";
import { bookBffIsTransportIssue } from "./bookBffClient";
import { getAttendanceStubCollectionIdSet } from "../config/platform";

export const BOOK_NFT_COLLECTION_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Merge paging envelope `rows` with optional parallel `details` (IPDEX NFT balances). */
export function nftRowsMergedFromPageEnvelope(data: unknown): Record<string, unknown>[] {
  if (data == null || typeof data !== "object") return [];
  const o = data as Record<string, unknown>;
  const rows = o.rows;
  if (!Array.isArray(rows)) return asRecordList(data);
  const detRaw = o.details;
  const details = Array.isArray(detRaw) ? detRaw : [];
  const out: Record<string, unknown>[] = [];
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const d = details[i];
    if (typeof row === "object" && row !== null) {
      out.push({
        ...(row as Record<string, unknown>),
        ...(typeof d === "object" && d !== null ? (d as Record<string, unknown>) : {}),
      });
    }
  }
  return out.length ? out : asRecordList(data);
}

export function asRecordList(data: unknown): Record<string, unknown>[] {
  if (data == null) return [];
  if (Array.isArray(data)) return data as Record<string, unknown>[];
  if (typeof data === "object") {
    const o = data as Record<string, unknown>;
    for (const k of ["list", "items", "records", "balances", "nftList", "nfts", "rows"]) {
      const v = o[k];
      if (Array.isArray(v)) return v as Record<string, unknown>[];
    }
  }
  return [];
}

export function strField(row: Record<string, unknown>, keys: string[]): string {
  for (const k of keys) {
    const v = row[k];
    if (v !== undefined && v !== null && `${v}`.trim() !== "") return `${v}`;
  }
  return "";
}

/** NFT balance APIs sometimes nest the token payload or use DB-style column aliases. */
const NFT_SUBOBJECT_KEYS = ["nft", "nftInfo", "token", "nftToken", "detail", "nftDetail", "balance", "nftBalance"] as const;

function nftRowVariants(row: Record<string, unknown>): Record<string, unknown>[] {
  const out: Record<string, unknown>[] = [row];
  for (const k of NFT_SUBOBJECT_KEYS) {
    const v = row[k];
    if (typeof v === "object" && v !== null && !Array.isArray(v)) out.push(v as Record<string, unknown>);
  }
  return out;
}

/** First non-empty token id across the merged row / nested nft objects — required for `/club/redeem` `sourceTokenId`. */
export function pickNftBalanceTokenId(row: Record<string, unknown>): string {
  const keys = [
    "tokenId",
    "token_id",
    "tokenID",
    "nftTokenId",
    "nft_token_id",
    "erc721TokenId",
    "erc721_token_id",
    "c_token_id",
    "mintTokenId",
    "mint_token_id",
    "chainTokenId",
    "onChainTokenId",
    "nftId",
    "NFTId",
    "id",
  ];
  for (const sub of nftRowVariants(row)) {
    const s = strField(sub, keys);
    if (s) return s;
  }
  return "";
}

/** IPDEX NFT series UUID (or alias) across row / nested objects — required for `sourceCollectionId`. */
export function pickNftBalanceCollectionId(row: Record<string, unknown>): string {
  /** Prefer explicit IP series identifiers; generic `collectionId` may reference a wrapper row, not redeem rule IDs. */
  const keys = [
    "nftSeriesUuid",
    "nft_series_uuid",
    "nftSeriesId",
    "nft_series_id",
    "ipNftSeriesUuid",
    "ip_nft_series_uuid",
    "ipNftSeriesId",
    "ip_nft_series_id",
    "seriesUuid",
    "series_uuid",
    "seriesId",
    "series_id",
    "c_ip_nft_series_id",
    "collectionId",
    "collection_id",
    "c_collection_id",
  ];
  for (const sub of nftRowVariants(row)) {
    const s = strField(sub, keys);
    if (s) return s;
  }
  return "";
}

function earliestDateIsoPrefix(row: Record<string, unknown>): string {
  const keys = ["createdAt", "purchasedAt", "mintedAt", "updatedAt"];
  for (const sub of nftRowVariants(row)) {
    const s = strField(sub, keys).trim();
    if (s) return s.slice(0, 10);
  }
  return "";
}

export function classifyNft(row: Record<string, unknown>): {
  badge: "original" | "redeemed" | "principle";
  principleName?: string;
} {
  const hay = nftRowVariants(row)
    .map(
      (sub) =>
        `${strField(sub, ["name", "nftName", "title"])} ${strField(sub, ["collectionName", "collection", "seriesName"])} ${strField(
          sub,
          ["type", "nftType", "category"],
        )}`,
    )
    .join(" ")
    .toLowerCase();
  if (hay.includes("principle") || hay.includes("原則")) {
    const name =
      nftRowVariants(row).map((sub) => strField(sub, ["name", "nftName", "title"]).trim()).find(Boolean) || "Principle";
    return { badge: "principle", principleName: name };
  }
  if (
    hay.includes("redeem") ||
    hay.includes("attendance") ||
    hay.includes("memorial") ||
    hay.includes("到場") ||
    hay.includes("commemorative") ||
    hay.includes("票根") ||
    hay.includes("stub")
  ) {
    return { badge: "redeemed" };
  }
  return { badge: "original" };
}

const principleColors = ["gold", "cyan", "purple"] as const;

export type DisplayNft = {
  key: string;
  tokenId: string;
  /** IPDEX collection UUID (required for `/club/redeem`). */
  collectionId?: string;
  badge: "original" | "redeemed" | "principle";
  /** When true, NFT is payout/stub series from env — commemorative attendance, never a redeemable voucher. */
  attendanceStub?: boolean;
  dateLabel: string;
  principleName?: string;
  principleColor?: "gold" | "cyan" | "purple";
  originalTokenId?: string;
};

/** Placeholder when the nft-balance row did not expose a chain token id (must not POST to `/club/redeem`). */
export function isSyntheticNftBalanceToken(tokenId: string): boolean {
  return /^item-\d+$/i.test(`${tokenId}`.trim());
}

export function isRedeemEligible(nft: DisplayNft): boolean {
  const cid = (nft.collectionId || "").trim();
  if (isSyntheticNftBalanceToken(nft.tokenId)) return false;
  return nft.badge === "original" && cid.length > 0 && BOOK_NFT_COLLECTION_UUID_RE.test(cid);
}

export function mapNftRow(row: Record<string, unknown>, index: number): DisplayNft {
  const rawPick = pickNftBalanceTokenId(row);
  const tokenId =
    rawPick.trim() !== "" ? normalizeRedeemSourceTokenId(rawPick) : `item-${index}`;
  const classified = classifyNft(row);
  const cidNorm = pickNftBalanceCollectionId(row).trim().toLowerCase();
  const stubSet = getAttendanceStubCollectionIdSet();
  const attendanceStub =
    cidNorm.length > 0 && BOOK_NFT_COLLECTION_UUID_RE.test(cidNorm) ? stubSet.has(cidNorm) : false;
  const badge =
    classified.badge === "principle"
      ? classified.badge
      : attendanceStub
        ? "redeemed"
        : classified.badge;
  const dateRaw = earliestDateIsoPrefix(row);
  const principleColor =
    badge === "principle" ? principleColors[index % principleColors.length] : undefined;
  return {
    key: `${tokenId}-${index}`,
    tokenId,
    collectionId: (() => {
      const c = pickNftBalanceCollectionId(row).trim();
      return c !== "" ? c : undefined;
    })(),
    badge,
    attendanceStub,
    dateLabel: dateRaw || "—",
    principleName: classified.principleName,
    principleColor,
    originalTokenId: pickFirstAcrossVariants(row, ["originalTokenId", "parentTokenId"]),
  };
}

function pickFirstAcrossVariants(row: Record<string, unknown>, keys: string[]): string | undefined {
  for (const sub of nftRowVariants(row)) {
    const s = strField(sub, keys);
    if (s) return s;
  }
  return undefined;
}

export async function fetchNftBffPagesMerged(buildPath: (p: number) => string): Promise<Record<string, unknown>[]> {
  const merged: Record<string, unknown>[] = [];
  const maxPages = 25;
  for (let p = 1; p <= maxPages; p++) {
    const r = await bookBffJsonWithRefresh<unknown>(buildPath(p));
    if (r.code !== 0 || r.rawStatus >= 400 || bookBffIsTransportIssue(r)) break;
    const rows = nftRowsMergedFromPageEnvelope(r.data);
    if (!rows.length) break;
    merged.push(...rows);
    const d = r.data as Record<string, unknown> | null;
    const totalPage =
      typeof d?.totalPage === "number"
        ? d.totalPage
        : typeof d?.totalPages === "number"
          ? d.totalPages
          : null;
    const page = typeof d?.page === "number" ? d.page : p;
    if (totalPage != null && page >= totalPage) break;
    if (rows.length < 12) break;
  }
  return merged;
}
