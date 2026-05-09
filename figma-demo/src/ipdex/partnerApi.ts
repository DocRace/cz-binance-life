import { getIpdexClientApiOrigin } from "../config/platform";

/**
 * Partner API (verification / snapshot / transfer / destroy) is implemented on IPDEX client service.
 *
 * - Base path: `/api/v1/partner/*` — authenticated with App Key + HMAC **on the server** (never expose the secret to this SPA).
 * - Typical use for an external partner site: entitlement checks (capital balance), treasury ops (transfer/destroy) via your BFF proxy.
 *
 * Canonical doc (in ipdex mono-repo): `ipdex-backend-v1/docs/partner/PARTNER_API_ARCHITECTURE.md`
 * Local setup: `ipdex-backend-v1/docs/partner/LOCAL_DEV.md`
 */
export const IPDEX_PARTNER_API_BASE = "/api/v1/partner" as const;

/** Resolved label for Partner API (absolute URL when `VITE_IPDEX_CLIENT_API_ORIGIN` is set). */
export function getPartnerApiPublicLabel(): string {
  const origin = getIpdexClientApiOrigin();
  return origin ? `${origin}${IPDEX_PARTNER_API_BASE}` : IPDEX_PARTNER_API_BASE;
}
