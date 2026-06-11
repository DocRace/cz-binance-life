/**
 * Helpers for merging IPDEX nft-balance paging + mapping rows for Account / on-site redeem UI.
 */
import { normalizeRedeemSourceTokenId } from "./bookRedeemClient";
import { bookBffJsonWithRefresh } from "./bookBffWithRefresh";
import { bookBffIsTransportIssue } from "./bookBffClient";
import {
  getAttendanceStubCollectionIdSet,
  isCzLifeBookCollectionId,
  isPremiumVoucherCollectionId,
  isStandardMembershipCollectionId,
} from "../config/platform";

export const BOOK_NFT_COLLECTION_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function balanceDetailKey(row: Record<string, unknown>): string {
  const tid = strField(row, ["c_token_id", "tokenId", "token_id"]);
  const cid = strField(row, ["c_collection_id", "collectionId", "collection_id"]);
  return tid && cid ? `${tid}_${cid}` : "";
}

/** Merge paging envelope `rows` with `details` keyed by token+collection (IPDEX profile pattern). */
export function nftRowsMergedFromPageEnvelope(data: unknown): Record<string, unknown>[] {
  if (data == null || typeof data !== "object") return [];
  const o = data as Record<string, unknown>;
  const rows = o.rows;
  if (!Array.isArray(rows)) return asRecordList(data);
  const detRaw = o.details;
  const details = Array.isArray(detRaw) ? detRaw : [];

  const detailMap = new Map<string, Record<string, unknown>>();
  for (const d of details) {
    if (typeof d !== "object" || d === null) continue;
    const rec = d as Record<string, unknown>;
    const key = balanceDetailKey(rec);
    if (key) detailMap.set(key, rec);
  }

  const out: Record<string, unknown>[] = [];
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (typeof row !== "object" || row === null) continue;
    const r = row as Record<string, unknown>;
    const key = balanceDetailKey(r);
    const byKey = key ? detailMap.get(key) : undefined;
    const byIndex =
      !byKey && typeof details[i] === "object" && details[i] !== null
        ? (details[i] as Record<string, unknown>)
        : undefined;
    const detail = byKey ?? byIndex;
    out.push({
      ...r,
      ...(detail ?? {}),
      ...(detail ? { detail } : {}),
    });
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

function metadataImageUrl(meta: unknown): string {
  if (meta == null) return "";
  if (typeof meta === "string") {
    try {
      return metadataImageUrl(JSON.parse(meta));
    } catch {
      return "";
    }
  }
  if (typeof meta === "object" && !Array.isArray(meta)) {
    const img = (meta as Record<string, unknown>).image;
    return typeof img === "string" && img.trim() ? img.trim() : "";
  }
  return "";
}

function nestedRecord(row: Record<string, unknown>, keys: string[]): Record<string, unknown> | null {
  for (const k of keys) {
    const v = row[k];
    if (typeof v === "object" && v !== null && !Array.isArray(v)) return v as Record<string, unknown>;
  }
  return null;
}

/** Token or collection artwork URL from merged nft-balance row + details. */
export function pickNftImageUrl(row: Record<string, unknown>): string {
  const keys = [
    "c_image",
    "image",
    "imageUrl",
    "image_url",
    "tokenImage",
    "nftImage",
    "cover",
    "c_cover",
    "salesCover",
    "c_sales_cover",
  ];
  for (const sub of nftRowVariants(row)) {
    const s = strField(sub, keys);
    if (s) return s;
    const fromMeta = metadataImageUrl(sub.c_metadata ?? sub.metadata);
    if (fromMeta) return fromMeta;
  }
  const collection = nestedRecord(row, ["c_collection", "collection", "collectionInfo"]);
  if (collection) {
    const cover = strField(collection, ["c_cover", "c_image", "cover", "image"]);
    if (cover) return cover;
  }
  return "";
}

export function pickNftDisplayName(row: Record<string, unknown>): string {
  for (const sub of nftRowVariants(row)) {
    const s = strField(sub, ["c_name", "name", "nftName", "title"]);
    if (s) return s;
  }
  return "";
}

export function pickNftCollectionName(row: Record<string, unknown>): string {
  const collection = nestedRecord(row, ["c_collection", "collection", "collectionInfo"]);
  if (collection) {
    const s = strField(collection, ["c_name", "name", "collectionName"]);
    if (s) return s;
  }
  for (const sub of nftRowVariants(row)) {
    const s = strField(sub, ["collectionName", "seriesName", "c_collection_name"]);
    if (s) return s;
  }
  return "";
}

/** True when `dateLabel` came from NFT balance timestamps (not the "—" placeholder). */
export function isMeaningfulNftDateLabel(label: string | undefined): boolean {
  const s = `${label ?? ""}`.trim();
  if (!s || s === "—" || s === "-") return false;
  return /^\d{4}-\d{2}-\d{2}/.test(s);
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

export type MembershipTier = "premium" | "standard";

export type DisplayNft = {
  key: string;
  tokenId: string;
  /** IPDEX collection UUID (required for `/club/redeem`). */
  collectionId?: string;
  badge: "original" | "redeemed" | "principle";
  /** Paid voucher vs free standard commemorative — drives Account redeem UI. */
  membershipTier?: MembershipTier;
  /** When true, NFT is payout/stub series from env — commemorative attendance, never a redeemable voucher. */
  attendanceStub?: boolean;
  dateLabel: string;
  imageUrl?: string;
  name?: string;
  collectionName?: string;
  principleName?: string;
  principleColor?: "gold" | "cyan" | "purple";
  originalTokenId?: string;
};

/** Premium account section: paid vouchers + post-redeem attendance stubs (not free standard). */
export function isPremiumAccountNft(nft: DisplayNft): boolean {
  if (nft.badge === "principle") return false;
  if (isStandardMembershipNft(nft)) return false;
  if (nft.attendanceStub) return true;
  if (nft.badge === "redeemed") return true;
  return nft.badge === "original";
}

export function isPremiumAttendanceStub(nft: DisplayNft): boolean {
  return Boolean(nft.attendanceStub) || (nft.badge === "redeemed" && !isPremiumVoucherNft(nft));
}

export function isStandardMembershipNft(nft: DisplayNft): boolean {
  return nft.membershipTier === "standard" || isStandardMembershipCollectionId(nft.collectionId);
}

export function isPremiumVoucherNft(nft: DisplayNft): boolean {
  return nft.membershipTier === "premium" || isPremiumVoucherCollectionId(nft.collectionId);
}

/** Placeholder when the nft-balance row did not expose a chain token id (must not POST to `/club/redeem`). */
export function isSyntheticNftBalanceToken(tokenId: string): boolean {
  return /^item-\d+$/i.test(`${tokenId}`.trim());
}

/** Account / redeem UI: only NFTs from configured CZ Life collections (not the user's full IPDEX wallet). */
export function isCzLifeBookNft(nft: DisplayNft): boolean {
  return isCzLifeBookCollectionId(nft.collectionId);
}

export function filterCzLifeDisplayNfts(nfts: DisplayNft[]): DisplayNft[] {
  return nfts.filter(isCzLifeBookNft);
}

export function isRedeemEligible(nft: DisplayNft): boolean {
  const cid = (nft.collectionId || "").trim();
  if (isSyntheticNftBalanceToken(nft.tokenId)) return false;
  if (isStandardMembershipNft(nft)) return false;
  return (
    nft.badge === "original" &&
    isPremiumVoucherNft(nft) &&
    cid.length > 0 &&
    BOOK_NFT_COLLECTION_UUID_RE.test(cid)
  );
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
  const collectionId = (() => {
    const c = pickNftBalanceCollectionId(row).trim();
    return c !== "" ? c : undefined;
  })();
  const membershipTier: MembershipTier | undefined = (() => {
    if (!collectionId) return attendanceStub ? "premium" : undefined;
    if (isStandardMembershipCollectionId(collectionId)) return badge === "original" ? "standard" : undefined;
    if (isPremiumVoucherCollectionId(collectionId)) return "premium";
    if (attendanceStub) return "premium";
    return undefined;
  })();
  return {
    key: `${tokenId}-${index}`,
    tokenId,
    collectionId,
    membershipTier,
    badge,
    attendanceStub,
    dateLabel: dateRaw || "—",
    imageUrl: (() => {
      const img = pickNftImageUrl(row).trim();
      return img !== "" ? img : undefined;
    })(),
    name: (() => {
      const n = pickNftDisplayName(row).trim();
      return n !== "" ? n : undefined;
    })(),
    collectionName: (() => {
      const n = pickNftCollectionName(row).trim();
      return n !== "" ? n : undefined;
    })(),
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

export type NftDetailBundle = {
  balance: Record<string, unknown> | null;
  info: Record<string, unknown> | null;
};

export async function fetchNftDetailBundle(
  collectionId: string,
  tokenId: string,
): Promise<NftDetailBundle | null> {
  const cid = collectionId.trim();
  const tid = tokenId.trim();
  if (!cid || !tid || isSyntheticNftBalanceToken(tid)) return null;

  const r = await bookBffJsonWithRefresh<NftDetailBundle>(
    `/api/bff/nft/${encodeURIComponent(cid)}/${encodeURIComponent(tid)}`,
  );
  if (r.code !== 0 || bookBffIsTransportIssue(r) || !r.data) return null;
  return r.data;
}
