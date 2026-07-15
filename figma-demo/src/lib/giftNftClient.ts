import { getBookPremiumVoucherCollectionIdSet, isPremiumVoucherCollectionId } from "../config/platform";
import { bookBffJson, bookBffIsTransportIssue, type BookBffJsonResult } from "./bookBffClient";

/** Gift API expects `t_nft_collections.c_collection_id`, not IP/series UUIDs from balance payloads. */
export function resolveGiftCollectionId(raw?: string): string {
  const normalized = `${raw ?? ""}`.trim().toLowerCase();
  const premiumSet = getBookPremiumVoucherCollectionIdSet();
  if (normalized && isPremiumVoucherCollectionId(normalized)) return normalized;
  const configured = [...premiumSet][0];
  if (configured) return configured;
  return `${raw ?? ""}`.trim();
}

export function localizedGiftFailureMessage(
  t: (key: string) => string,
  out: Pick<BookBffJsonResult<unknown>, "code" | "message">,
): string {
  if (bookBffIsTransportIssue(out as BookBffJsonResult<unknown>)) {
    return t("purchase.bffOffline");
  }
  if (out.code === -10011) return t("giftPurchase.errorNotOwned");
  if (out.code === -10001) return t("giftPurchase.errorInvalidParameter");
  if (out.code === -10605) return t("account.redeemErrorChain");
  const detail = `${out.message ?? ""}`.trim();
  return detail ? `${t("account.giftError")} (${detail})` : t("account.giftError");
}

export type GiftEmailLookup = {
  email: string;
  exists: boolean;
  willAutoProvision?: boolean;
};

export type GiftNftResult = {
  recipientUid?: string;
  recipientEmail?: string;
  collectionId?: string;
  tokenId?: string;
  settlementTxHash?: string | null;
};

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function lookupGiftRecipientEmail(
  email: string,
): Promise<{ ok: true; data: GiftEmailLookup } | { ok: false; message: string }> {
  const normalized = normalizeEmail(email);
  if (!normalized.includes("@")) {
    return { ok: false, message: "invalid_email" };
  }

  const out = await bookBffJson<GiftEmailLookup>("/api/bff/gift/lookup-email", {
    method: "POST",
    body: JSON.stringify({ email: normalized }),
  });

  if (out.code === 0 && out.data?.email) {
    return { ok: true, data: out.data };
  }

  return {
    ok: false,
    message: bookBffIsTransportIssue(out) ? "bff_offline" : out.message || "lookup_failed",
  };
}

export async function giftNftToEmail(input: {
  collectionId: string;
  tokenId: string;
  recipientEmail: string;
}): Promise<
  | { ok: true; data: GiftNftResult }
  | { ok: false; message: string; code?: number }
> {
  const collectionId = resolveGiftCollectionId(input.collectionId);
  const tokenId = `${input.tokenId}`.trim();
  const recipientEmail = normalizeEmail(input.recipientEmail);
  if (!collectionId || !tokenId || !recipientEmail.includes("@")) {
    return { ok: false, message: "invalid_parameters", code: -10001 };
  }

  const out = await bookBffJson<GiftNftResult>("/api/bff/nft/gift", {
    method: "POST",
    body: JSON.stringify({ collectionId, tokenId, recipientEmail }),
  });

  if (out.code === 0 && out.data) {
    return { ok: true, data: out.data };
  }

  return {
    ok: false,
    message: bookBffIsTransportIssue(out) ? "bff_offline" : out.message || "gift_failed",
    code: out.code,
  };
}
