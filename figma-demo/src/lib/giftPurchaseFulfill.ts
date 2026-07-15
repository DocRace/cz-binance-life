import {
  type DisplayNft,
  isPremiumVoucherNft,
  isSyntheticNftBalanceToken,
} from "./bookAccountNftApi";
import { giftNftToEmail } from "./giftNftClient";
import {
  clearPendingGiftPurchase,
  readPendingGiftPurchase,
  writePendingGiftPurchase,
} from "./giftPurchaseStorage";

export type GiftFulfillOutcome =
  | { status: "none" }
  | { status: "waiting" }
  | { status: "complete"; recipientEmail: string; giftedCount: number }
  | { status: "partial"; recipientEmail: string; giftedCount: number; message: string }
  | { status: "failed"; message: string };

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function pickGiftablePremiumNfts(nfts: DisplayNft[]): DisplayNft[] {
  return nfts
    .filter(
      (nft) =>
        nft.badge === "original" &&
        isPremiumVoucherNft(nft) &&
        nft.collectionId &&
        nft.tokenId &&
        !isSyntheticNftBalanceToken(nft.tokenId),
    )
    .sort((a, b) => {
      const tb = `${b.tokenId}`.localeCompare(`${a.tokenId}`, undefined, { numeric: true });
      if (tb !== 0) return tb;
      return `${b.acquiredDate ?? ""}`.localeCompare(`${a.acquiredDate ?? ""}`);
    });
}

export async function tryFulfillPendingGiftPurchase(options: {
  nfts: DisplayNft[];
  payerEmail: string;
}): Promise<GiftFulfillOutcome> {
  const pending = readPendingGiftPurchase();
  if (!pending || pending.status === "complete") {
    return { status: "none" };
  }

  const recipientEmail = normalizeEmail(pending.recipientEmail);
  const payerEmail = normalizeEmail(options.payerEmail);
  if (!recipientEmail.includes("@")) {
    clearPendingGiftPurchase();
    return { status: "failed", message: "invalid_recipient" };
  }
  if (payerEmail && recipientEmail === payerEmail) {
    writePendingGiftPurchase({
      ...pending,
      status: "failed",
      lastError: "cannot_gift_to_self",
    });
    return { status: "failed", message: "cannot_gift_to_self" };
  }

  const remaining = pending.quantity - pending.giftedCount;
  if (remaining <= 0) {
    writePendingGiftPurchase({ ...pending, status: "complete" });
    clearPendingGiftPurchase();
    return { status: "complete", recipientEmail, giftedCount: pending.giftedCount };
  }

  const candidates = pickGiftablePremiumNfts(options.nfts);
  if (candidates.length < remaining) {
    return { status: "waiting" };
  }

  let giftedCount = pending.giftedCount;
  let lastError = "";

  for (let i = 0; i < remaining; i += 1) {
    const nft = candidates[i];
    const result = await giftNftToEmail({
      collectionId: nft.collectionId,
      tokenId: nft.tokenId,
      recipientEmail,
    });
    if (!result.ok) {
      lastError = result.message;
      break;
    }
    giftedCount += 1;
  }

  const next = {
    ...pending,
    giftedCount,
    lastError: lastError || undefined,
  };

  if (giftedCount >= pending.quantity) {
    writePendingGiftPurchase({ ...next, status: "complete" });
    clearPendingGiftPurchase();
    return { status: "complete", recipientEmail, giftedCount };
  }

  if (giftedCount > pending.giftedCount) {
    writePendingGiftPurchase({ ...next, status: "partial" });
    return {
      status: "partial",
      recipientEmail,
      giftedCount,
      message: lastError || "partial_gift",
    };
  }

  writePendingGiftPurchase({ ...next, status: "failed" });
  return { status: "failed", message: lastError || "gift_failed" };
}
