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

/** DataDance explorer base URL (defaults to scan.datadance.ai). */
export function getDatadanceExplorerUrl(): string {
  return (
    normalizeOrigin(envString("VITE_DATADANCE_EXPLORER_URL")) || "https://scan.datadance.ai"
  );
}
