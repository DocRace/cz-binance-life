import { getIpdexClientApiOrigin, getBookPrimaryListingId, normalizeOrigin } from "../config/platform";

/** Set by a BFF cookie handoff or future in-app IPDEX login; never store Partner HMAC secrets here. */
export const IPDEX_ACCESS_TOKEN_STORAGE_KEY = "ipdex_access_token";

export type IpdexEnvelope<T> = {
  code: number;
  message: string;
  data: T | null;
};

/** Public Client Service: `POST /ip/primary/purchase` (requires CORS for this site origin when called from the browser). */
export async function createPrimaryPurchaseOrderViaClientApi(options: {
  clientApiOrigin?: string;
  accessToken: string;
  listingId: string;
  quantity: number;
  paymentChannel?: "stripe" | "crypto";
  currency?: string;
}): Promise<{
  orderId: string;
  paymentUrl: string;
  paymentChannel?: string;
  settleAsset?: string;
  settleAmount?: string;
  settleChainId?: string;
}> {
  const origin = normalizeOrigin(options.clientApiOrigin ?? getIpdexClientApiOrigin());
  if (!origin) {
    throw new Error("missing_client_api_origin");
  }
  const paymentChannel = options.paymentChannel === "crypto" ? "crypto" : "stripe";
  const res = await fetch(`${origin}/ip/primary/purchase`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${options.accessToken}`,
    },
    body: JSON.stringify({
      listingId: options.listingId,
      quantity: options.quantity,
      paymentChannel,
      ...(paymentChannel === "stripe"
        ? { currency: (options.currency || "hkd").toLowerCase() }
        : {}),
    }),
  });

  const json = (await res.json()) as IpdexEnvelope<{
    orderId: string;
    paymentUrl: string;
    paymentChannel?: string;
    settleAsset?: string;
    settleAmount?: string;
    settleChainId?: string;
  }>;
  if (!res.ok || json.code !== 0 || !json.data?.paymentUrl) {
    throw new Error(json.message || `http_${res.status}`);
  }
  return json.data;
}

/** True when env has both API origin and listing UUID — optional `sessionStorage` token enables API checkout. */
export function canUseEmbeddedPrimaryPurchase(sessionToken: string | null): boolean {
  return Boolean(
    getIpdexClientApiOrigin() && getBookPrimaryListingId() && sessionToken?.trim(),
  );
}
