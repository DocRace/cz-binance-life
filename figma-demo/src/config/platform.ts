/**
 * Integration with IPDEX (see sibling repo `data-dance/ipdex`).
 * NFT primary market UI: ipdex-market-frontend, route `/collection/sales/:primarySaleId`.
 * On-chain settlement for DDCNFT uses DataDance chain id **44508** (see ipdex `ddcSettlementUi.ts`).
 */

export const IPDEX_PRODUCT_NAME = "IPDEX" as const;

/** Product/network display name aligned with Data Dance chain branding. */
export const DATADANCE_CHAIN_NAME = "DatadanceChain" as const;

/** Chain id used by IPDEX for DDCNFT mint/settlement (DataDance). */
export const DATADANCE_CHAIN_ID = "44508" as const;

export const IPDEX_PRIMARY_SALE_PATH_PREFIX = "/collection/sales/" as const;

function envString(key: keyof ImportMetaEnv): string {
  const v = import.meta.env[key];
  return typeof v === "string" ? v.trim() : "";
}

/** Trailing slashes removed — safe for origin joins. */
export function normalizeOrigin(origin: string): string {
  return origin.replace(/\/+$/, "");
}

/**
 * Prefer `VITE_IPDEX_MARKET_URL` (ipdex-market-frontend origin, no trailing slash).
 * Falls back to legacy `VITE_IPDEX_URL` if set.
 */
export function getIpdexMarketOrigin(): string {
  return envString("VITE_IPDEX_MARKET_URL") || envString("VITE_IPDEX_URL");
}

/** Primary sale UUID (or opaque id) as used by `/collection/sales/:id` on the market SPA. */
export function getBookPrimarySaleId(): string {
  return envString("VITE_IPDEX_BOOK_PRIMARY_SALE_ID");
}

/** Primary **listing** UUID for `POST /ip/primary/purchase` on Client Service (see admin / `GET /ip/primary/sales/:salesId`). */
export function getBookPrimaryListingId(): string {
  return envString("VITE_IPDEX_BOOK_PRIMARY_LISTING_ID");
}

/**
 * Optional whole-number HK$ hint for the purchase modal when the primary-sale API is not loaded yet.
 * IPDEX listing `c_price_hkd` is stored in cents; this env is HK dollars (e.g. `100` for HK$100).
 */
export function getBookPrimaryPriceHkdHint(): number | null {
  const raw = envString("VITE_IPDEX_BOOK_PRIMARY_PRICE_HKD");
  if (!raw) return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n * 100) / 100;
}

/** Whole-number HK$ for Premium UI copy; matches build env, overridden by live sale API in checkout. */
export function getBookPremiumPriceHkd(): number {
  return getBookPrimaryPriceHkdHint() ?? 199;
}

export function formatBookPremiumPriceHkd(): string {
  return `${getBookPremiumPriceHkd()} HKD`;
}

/** When multiple NFT redemption DB rules exist, SPA passes this UUID to `/club/redeem` (optional when exactly one enabled rule). */
export function getBookNftRedemptionRuleId(): string {
  return envString("VITE_IPDEX_NFT_REDEMPTION_RULE_ID");
}

/** Standard (free) tier — IPDEX airdrop campaign `publicCode` (Admin → Airdrop campaign). */
export function getBookStandardAirdropPublicCode(): string {
  return envString("VITE_IPDEX_BOOK_STANDARD_AIRDROP_PUBLIC_CODE");
}

/** Free STANDARD tier primary sale UUID (HK$0.01 «免費版» when airdrop publicCode is unset). */
export function getBookStandardPrimarySaleId(): string {
  return envString("VITE_IPDEX_BOOK_STANDARD_PRIMARY_SALE_ID");
}

/** Listing UUID for free STANDARD primary purchase (`POST /ip/primary/purchase`). */
export function getBookStandardPrimaryListingId(): string {
  return envString("VITE_IPDEX_BOOK_STANDARD_PRIMARY_LISTING_ID");
}

/** Expected collection UUID for the free-tier series (sanity check after campaign load). */
export function getBookStandardCollectionId(): string {
  const fromEnv = envString("VITE_IPDEX_BOOK_STANDARD_COLLECTION_ID");
  if (fromEnv) return fromEnv;
  return "b8b65708-7a66-4547-9041-b7a47d3d2c90";
}

let standardCollectionMemo: string | undefined;
let premiumVoucherCollectionMemo: ReadonlySet<string> | undefined;

function normalizeCollectionUuid(id: string): string {
  return `${id}`.trim().toLowerCase();
}

/** Free STANDARD tier series — commemorative only, no on-site redeem. */
export function getBookStandardCollectionIdNormalized(): string {
  if (!standardCollectionMemo) {
    standardCollectionMemo = normalizeCollectionUuid(getBookStandardCollectionId());
  }
  return standardCollectionMemo;
}

export function isStandardMembershipCollectionId(collectionId?: string): boolean {
  const c = normalizeCollectionUuid(`${collectionId ?? ""}`);
  return c !== "" && c === getBookStandardCollectionIdNormalized();
}

/**
 * Paid PREMIUM voucher series UUID(s) — eligible for `/club/redeem` when held as source NFT.
 * Comma / semicolon / whitespace separated; defaults to «CZ NFT Test 2» on dev.
 */
export function getBookPremiumVoucherCollectionIdSet(): ReadonlySet<string> {
  if (premiumVoucherCollectionMemo) return premiumVoucherCollectionMemo;
  const out = new Set<string>();
  const raw = envString("VITE_IPDEX_BOOK_PREMIUM_COLLECTION_ID");
  if (raw.trim()) {
    pushUuidFragmentsIntoSet(raw.split(/[\s,;]+/).filter(Boolean), out);
  } else {
    out.add("a0344152-4a6a-424e-8918-b476e834e8d7");
  }
  premiumVoucherCollectionMemo = out;
  return premiumVoucherCollectionMemo;
}

export function isPremiumVoucherCollectionId(collectionId?: string): boolean {
  const c = normalizeCollectionUuid(`${collectionId ?? ""}`);
  return c !== "" && getBookPremiumVoucherCollectionIdSet().has(c);
}

/** IPDEX NFT series UUID v1–v5 (aligned with `BOOK_NFT_COLLECTION_UUID_RE` in `bookAccountNftApi.ts`). */
const BOOK_COLLECTION_UUID_V1_TO_V5_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

let attendanceStubSeriesMemo: ReadonlySet<string> | undefined;

function pushUuidFragmentsIntoSet(parts: Iterable<string>, add: Set<string>) {
  for (const fragment of parts) {
    const p = `${fragment}`.trim().toLowerCase();
    if (p && BOOK_COLLECTION_UUID_V1_TO_V5_RE.test(p)) add.add(p);
  }
}

/**
 * NFT series UUIDs that mint **after** redemption (attendance stubs) — configured for Account UI only.
 * Comma / semicolon / whitespace separated UUIDs — must match Admin → payout (stub) collection id(s).
 * Does not redeem as a source voucher regardless of heuristic name/classification from BFF payloads.
 */
export function getAttendanceStubCollectionIdSet(): ReadonlySet<string> {
  if (attendanceStubSeriesMemo) return attendanceStubSeriesMemo;
  const out = new Set<string>();
  const raw = `${envString("VITE_IPDEX_BOOK_ATTEND_STUB_SERIES_IDS")}\n${envString("VITE_IPDEX_BOOK_ATTEND_STUB_SERIES_ID")}`;
  if (raw.trim()) pushUuidFragmentsIntoSet(raw.split(/[\s,;]+/).filter(Boolean), out);
  attendanceStubSeriesMemo = out;
  return attendanceStubSeriesMemo;
}

export function isAttendanceStubCollectionId(collectionId?: string): boolean {
  const c = `${collectionId ?? ""}`.trim().toLowerCase();
  return c !== "" && getAttendanceStubCollectionIdSet().has(c);
}

let czLifeCollectionMemo: ReadonlySet<string> | undefined;

/** Union of premium voucher, standard free, and attendance-stub series configured for this book site. */
export function getCzLifeBookCollectionIdSet(): ReadonlySet<string> {
  if (czLifeCollectionMemo) return czLifeCollectionMemo;
  const out = new Set<string>();
  for (const id of getBookPremiumVoucherCollectionIdSet()) out.add(id);
  out.add(getBookStandardCollectionIdNormalized());
  for (const id of getAttendanceStubCollectionIdSet()) out.add(id);
  czLifeCollectionMemo = out;
  return czLifeCollectionMemo;
}

/** True when the NFT series UUID belongs to this CZ Life book-site integration. */
export function isCzLifeBookCollectionId(collectionId?: string): boolean {
  const c = normalizeCollectionUuid(`${collectionId ?? ""}`);
  return c !== "" && getCzLifeBookCollectionIdSet().has(c);
}

/** Public IPDEX Client Service origin (Partner / user APIs). Used only for displayed URLs in the SPA — never secrets. */
export function getIpdexClientApiOrigin(): string {
  const o = normalizeOrigin(envString("VITE_IPDEX_CLIENT_API_ORIGIN"));
  return o;
}

/** IPDEX product / marketing site (footer brand link). */
export function getIpdexSiteUrl(): string {
  return normalizeOrigin(envString("VITE_IPDEX_SITE_URL")) || "https://ipdex.vip";
}

/** Footer / marketing links (override defaults when needed). */
export function getIpdexSocialXUrl(): string {
  return envString("VITE_IPDEX_SOCIAL_X_URL") || "https://x.com/IPDEX_Official";
}

export function getIpdexSocialFacebookUrl(): string {
  return envString("VITE_IPDEX_SOCIAL_FACEBOOK_URL") || "https://facebook.com/ipdex";
}

/** DataDance marketing / product site (footer “Powered by” link). */
export function getDatadanceSiteUrl(): string {
  const o = normalizeOrigin(envString("VITE_DATADANCE_SITE_URL"));
  return o || "https://datadance.ai";
}

/** DataDance explorer base URL (prod default: explorer.datadance.ai; set VITE_DATADANCE_EXPLORER_URL per env). */
export function getDatadanceExplorerUrl(): string {
  return (
    normalizeOrigin(envString("VITE_DATADANCE_EXPLORER_URL")) || "https://explorer.datadance.ai"
  );
}

/** Commercial Press (商務印書館) WeChat official account article — footer link. */
export const COMMERCIAL_PRESS_WECHAT_URL =
  "https://mp.weixin.qq.com/s/Di2kA9omehVh04PNHcXBRA" as const;

/** Freedom of Money book club Telegram community. */
export const BOOK_CLUB_TELEGRAM_HANDLE = "czlifeclub" as const;

export const BOOK_CLUB_TELEGRAM_URL = "https://t.me/czlifeclub" as const;

export const BOOK_CLUB_TELEGRAM_QR_SRC = "/telegram-czlifeclub-qr.png" as const;

/** Offline book-club launch event — Telegram group QR on `/event`. */
export const OFFLINE_EVENT_REGISTER_QR_SRC = BOOK_CLUB_TELEGRAM_QR_SRC;

export const OFFLINE_EVENT_POSTER_SRC = "/offline-event-poster.png" as const;

/** On-site redeem QR deep link — opens account redeem flow after login. */
export { redeemScanPath, redeemScanUrl } from "../lib/redeemDeepLink";
