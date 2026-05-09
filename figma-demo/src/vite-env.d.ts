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
  /** Public Client Service origin (display / future APIs), e.g. https://your-client-api.example — no trailing slash. */
  readonly VITE_IPDEX_CLIENT_API_ORIGIN?: string;
  readonly VITE_IPDEX_SOCIAL_X_URL?: string;
  readonly VITE_IPDEX_SOCIAL_FACEBOOK_URL?: string;
  /** DataDance block explorer origin, default handled in code if unset. */
  readonly VITE_DATADANCE_EXPLORER_URL?: string;
  /** Optional absolute BFF origin (no trailing slash). Empty = same-origin /api/bff (use Vite proxy in dev). */
  readonly VITE_BOOK_BFF_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
