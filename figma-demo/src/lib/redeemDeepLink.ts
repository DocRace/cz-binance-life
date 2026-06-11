/** Query flag for on-site redeem QR / deep links → `/account?redeem=scan`. */
export const REDEEM_SCAN_QUERY_KEY = "redeem";
export const REDEEM_SCAN_QUERY_VALUE = "scan";

export function isRedeemScanDeepLink(params: URLSearchParams): boolean {
  const v = `${params.get(REDEEM_SCAN_QUERY_KEY) ?? ""}`.trim().toLowerCase();
  return v === REDEEM_SCAN_QUERY_VALUE || v === "1" || v === "true";
}

export function redeemScanPath(): string {
  return `/account?${REDEEM_SCAN_QUERY_KEY}=${REDEEM_SCAN_QUERY_VALUE}`;
}

export function redeemScanUrl(origin = "https://czlife.club"): string {
  const base = origin.replace(/\/+$/, "");
  return `${base}${redeemScanPath()}`;
}
