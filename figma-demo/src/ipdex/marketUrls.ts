import {
  getBookPrimarySaleId,
  getIpdexMarketOrigin,
  IPDEX_PRIMARY_SALE_PATH_PREFIX,
  normalizeOrigin,
} from "../config/platform";

/**
 * Deeplink into IPDEX primary sale page (user completes NFT order & payment there).
 * Returns empty string when origin or primary sale id is not configured.
 */
export function buildBookPrimarySaleCheckoutUrl(desiredQty: number): string {
  const origin = normalizeOrigin(getIpdexMarketOrigin());
  const saleId = getBookPrimarySaleId();
  if (!origin || !saleId) {
    return "";
  }

  const path = `${IPDEX_PRIMARY_SALE_PATH_PREFIX}${encodeURIComponent(saleId)}`;
  const qs = new URLSearchParams({
    qty: String(Math.max(1, Math.min(99, Math.floor(desiredQty)))),
    utm_source: "freedom_of_money_book_site",
  });
  return `${origin}${path}?${qs.toString()}`;
}
