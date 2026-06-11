const SYNC_STORAGE_KEY = "cz-life:sync-account-after-purchase";
const PAID_ORDERS_KEY = "cz-life:recent-paid-order-ids";
const LAST_CHECKOUT_ORDER_KEY = "cz-life:last-checkout-order-id";

type PaidOrderEntry = { id: string; at: number };

function readPaidOrderEntries(): PaidOrderEntry[] {
  try {
    const raw = sessionStorage.getItem(PAID_ORDERS_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((row) => {
        if (typeof row !== "object" || row === null) return null;
        const id = `${(row as PaidOrderEntry).id ?? ""}`.trim();
        const at = Number((row as PaidOrderEntry).at);
        return id ? { id, at: Number.isFinite(at) ? at : Date.now() } : null;
      })
      .filter((row): row is PaidOrderEntry => row != null);
  } catch {
    return [];
  }
}

function writePaidOrderEntries(entries: PaidOrderEntry[]): void {
  try {
    sessionStorage.setItem(PAID_ORDERS_KEY, JSON.stringify(entries));
  } catch {
    /* private mode / quota */
  }
}

/** Remember checkout order id before Stripe redirect (fallback if success URL omits it). */
export function rememberCheckoutOrderId(orderId: string): void {
  const id = orderId.trim();
  if (!id) return;
  try {
    sessionStorage.setItem(LAST_CHECKOUT_ORDER_KEY, id);
  } catch {
    /* ignore */
  }
}

export function takeLastCheckoutOrderId(): string {
  try {
    const id = `${sessionStorage.getItem(LAST_CHECKOUT_ORDER_KEY) ?? ""}`.trim();
    sessionStorage.removeItem(LAST_CHECKOUT_ORDER_KEY);
    return id;
  } catch {
    return "";
  }
}

/** Call on `/purchase-success` so the next Account visit knows to re-fetch. */
export function markAccountSyncAfterPurchase(): void {
  try {
    sessionStorage.setItem(SYNC_STORAGE_KEY, String(Date.now()));
  } catch {
    /* private mode / quota */
  }
}

/** Returns true once per purchase-success visit; flag is cleared immediately. */
export function takeAccountSyncAfterPurchase(): boolean {
  try {
    if (!sessionStorage.getItem(SYNC_STORAGE_KEY)) return false;
    sessionStorage.removeItem(SYNC_STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}

/** Paid order still listed as pending upstream — hide it until the API catches up. */
export function markRecentPaidOrderId(orderId: string): void {
  const id = orderId.trim();
  if (!id) return;
  const maxAgeMs = 24 * 60 * 60 * 1000;
  const now = Date.now();
  const next = [
    { id, at: now },
    ...readPaidOrderEntries().filter((entry) => entry.id !== id && now - entry.at < maxAgeMs),
  ].slice(0, 12);
  writePaidOrderEntries(next);
}

export function getRecentPaidOrderIds(): Set<string> {
  const maxAgeMs = 24 * 60 * 60 * 1000;
  const now = Date.now();
  const alive = readPaidOrderEntries().filter((entry) => now - entry.at < maxAgeMs);
  if (alive.length !== readPaidOrderEntries().length) writePaidOrderEntries(alive);
  return new Set(alive.map((entry) => entry.id));
}

/** Drop paid markers once pending-order API no longer returns that order id. */
export function reconcileRecentPaidOrderIds(apiOrderIds: string[]): void {
  const apiSet = new Set(apiOrderIds.map((id) => id.trim()).filter(Boolean));
  const next = readPaidOrderEntries().filter((entry) => apiSet.has(entry.id));
  writePaidOrderEntries(next);
}

/** Re-fetch dashboard a few times — NFT balance and pending orders can lag after Stripe checkout. */
export async function pollDashboardRefresh(
  load: (background: boolean) => Promise<void>,
  onPass?: () => void,
): Promise<void> {
  const delaysMs = [0, 2000, 5000, 10000, 15000];
  for (let i = 0; i < delaysMs.length; i++) {
    if (delaysMs[i] > 0) await new Promise((r) => setTimeout(r, delaysMs[i]));
    await load(i > 0);
    onPass?.();
  }
}
