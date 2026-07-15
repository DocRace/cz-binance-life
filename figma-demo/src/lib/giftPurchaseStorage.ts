export type PendingGiftPurchase = {
  recipientEmail: string;
  quantity: number;
  orderId?: string;
  createdAt: number;
  giftedCount: number;
  status: "pending" | "complete" | "partial" | "failed";
  lastError?: string;
};

const STORAGE_KEY = "cz-life:pending-gift-purchase";

/** localStorage survives Stripe opening checkout in a new tab; sessionStorage does not. */
function readRawPendingGiftPurchase(): string | null {
  try {
    const fromLocal = localStorage.getItem(STORAGE_KEY);
    if (fromLocal) return fromLocal;
    const fromSession = sessionStorage.getItem(STORAGE_KEY);
    if (fromSession) {
      localStorage.setItem(STORAGE_KEY, fromSession);
      sessionStorage.removeItem(STORAGE_KEY);
      return fromSession;
    }
    return null;
  } catch {
    return null;
  }
}

function writeRawPendingGiftPurchase(raw: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, raw);
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* private mode / quota */
  }
}

function clearRawPendingGiftPurchase(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function rememberPendingGiftPurchase(input: {
  recipientEmail: string;
  quantity: number;
  orderId?: string;
}): void {
  const recipientEmail = input.recipientEmail.trim().toLowerCase();
  const quantity = Math.max(1, Math.floor(input.quantity));
  if (!recipientEmail.includes("@") || quantity < 1) return;

  const row: PendingGiftPurchase = {
    recipientEmail,
    quantity,
    orderId: input.orderId?.trim() || undefined,
    createdAt: Date.now(),
    giftedCount: 0,
    status: "pending",
  };

  writeRawPendingGiftPurchase(JSON.stringify(row));
}

export function readPendingGiftPurchase(): PendingGiftPurchase | null {
  try {
    const raw = readRawPendingGiftPurchase();
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PendingGiftPurchase;
    if (!parsed || typeof parsed !== "object") return null;
    const recipientEmail = `${parsed.recipientEmail ?? ""}`.trim().toLowerCase();
    const quantity = Math.floor(Number(parsed.quantity));
    if (!recipientEmail.includes("@") || quantity < 1) return null;
    return {
      recipientEmail,
      quantity,
      orderId: parsed.orderId?.trim() || undefined,
      createdAt: Number(parsed.createdAt) || Date.now(),
      giftedCount: Math.max(0, Math.floor(Number(parsed.giftedCount) || 0)),
      status: parsed.status === "complete" || parsed.status === "partial" || parsed.status === "failed"
        ? parsed.status
        : "pending",
      lastError: parsed.lastError?.trim() || undefined,
    };
  } catch {
    return null;
  }
}

export function writePendingGiftPurchase(row: PendingGiftPurchase): void {
  writeRawPendingGiftPurchase(JSON.stringify(row));
}

export function clearPendingGiftPurchase(): void {
  clearRawPendingGiftPurchase();
}
