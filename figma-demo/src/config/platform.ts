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

/** When multiple NFT redemption DB rules exist, SPA passes this UUID to `/club/redeem` (optional when exactly one enabled rule). */
export function getBookNftRedemptionRuleId(): string {
  return envString("VITE_IPDEX_NFT_REDEMPTION_RULE_ID");
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

/** Public IPDEX Client Service origin (Partner / user APIs). Used only for displayed URLs in the SPA — never secrets. */
export function getIpdexClientApiOrigin(): string {
  const o = normalizeOrigin(envString("VITE_IPDEX_CLIENT_API_ORIGIN"));
  return o;
}

/** Footer / marketing links (override defaults when needed). */
export function getIpdexSocialXUrl(): string {
  return envString("VITE_IPDEX_SOCIAL_X_URL") || "https://x.com/ipdex";
}

export function getIpdexSocialFacebookUrl(): string {
  return envString("VITE_IPDEX_SOCIAL_FACEBOOK_URL") || "https://facebook.com/ipdex";
}

/** DataDance marketing / product site (footer “Powered by” link). */
export function getDatadanceSiteUrl(): string {
  const o = normalizeOrigin(envString("VITE_DATADANCE_SITE_URL"));
  return o || "https://datadance.ai";
}

/** DataDance explorer base URL (defaults to scan.datadance.ai). */
export function getDatadanceExplorerUrl(): string {
  return (
    normalizeOrigin(envString("VITE_DATADANCE_EXPLORER_URL")) || "https://scan.datadance.ai"
  );
}
