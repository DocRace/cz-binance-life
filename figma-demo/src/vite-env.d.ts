/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** IPDEX market SPA origin (no trailing slash), e.g. http://localhost:3001 */
  readonly VITE_IPDEX_MARKET_URL?: string;
  /** Legacy fallback if `VITE_IPDEX_MARKET_URL` is unset. */
  readonly VITE_IPDEX_URL?: string;
  /** `/collection/sales/:id` segment — primary sale id from IPDEX backend/admin. */
  readonly VITE_IPDEX_BOOK_PRIMARY_SALE_ID?: string;
  /** Primary listing UUID for Client Service `POST /ip/primary/purchase` (not the market SPA `/collection/sales/:id` slug). */
  readonly VITE_IPDEX_BOOK_PRIMARY_LISTING_ID?: string;
  /** Optional HK$ unit price hint for checkout UI until sale detail resolves (whole dollars, e.g. `100`). */
  readonly VITE_IPDEX_BOOK_PRIMARY_PRICE_HKD?: string;
  /** Airdrop campaign publicCode for free STANDARD tier claim flow. */
  readonly VITE_IPDEX_BOOK_STANDARD_AIRDROP_PUBLIC_CODE?: string;
  /** Optional collection UUID sanity check for free-tier airdrop (defaults in code). */
  readonly VITE_IPDEX_BOOK_STANDARD_COLLECTION_ID?: string;
  /** Paid PREMIUM voucher collection UUID(s) — eligible for on-site redeem (comma-separated). */
  readonly VITE_IPDEX_BOOK_PREMIUM_COLLECTION_ID?: string;
  /** Public Client Service origin (display / future APIs), e.g. https://your-client-api.example — no trailing slash. */
  readonly VITE_IPDEX_CLIENT_API_ORIGIN?: string;
  readonly VITE_IPDEX_SOCIAL_X_URL?: string;
  readonly VITE_IPDEX_SOCIAL_FACEBOOK_URL?: string;
  /** DataDance block explorer origin, default handled in code if unset. */
  readonly VITE_DATADANCE_EXPLORER_URL?: string;
  /** DataDance marketing site (footer “Powered by” link), default https://datadance.ai */
  readonly VITE_DATADANCE_SITE_URL?: string;
  /** When multiple redemption rules are enabled, set this to the admin rule UUID (passed to `/club/redeem`). */
  readonly VITE_IPDEX_NFT_REDEMPTION_RULE_ID?: string;
  /**
   * Payout/stub NFT series UUID(s) for on-site redemption (comma/space/semicolon separated).
   * Holders never see a "Redeem" CTA — these are commemorative stubs after redemption, not vouchers.
   */
  readonly VITE_IPDEX_BOOK_ATTEND_STUB_SERIES_IDS?: string;
  /** Same as plural form; single-series convenience. */
  readonly VITE_IPDEX_BOOK_ATTEND_STUB_SERIES_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
