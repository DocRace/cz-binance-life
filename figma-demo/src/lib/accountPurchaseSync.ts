const SYNC_STORAGE_KEY = "cz-life:sync-account-after-purchase";
const PAID_ORDERS_KEY = "cz-life:recent-paid-order-ids";
const LAST_CHECKOUT_ORDER_KEY = "cz-life:last-checkout-order-id";

/** Grace period only — hide pending row while webhook may still be catching up. */
const PAID_ORDER_HIDE_MAX_AGE_MS = 2 * 60 * 1000;

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
    localStorage.setItem(LAST_CHECKOUT_ORDER_KEY, id);
    sessionStorage.setItem(LAST_CHECKOUT_ORDER_KEY, id);
  } catch {
    /* ignore */
  }
}

export function takeLastCheckoutOrderId(): string {
  try {
    const id = `${localStorage.getItem(LAST_CHECKOUT_ORDER_KEY) ?? sessionStorage.getItem(LAST_CHECKOUT_ORDER_KEY) ?? ""}`.trim();
    localStorage.removeItem(LAST_CHECKOUT_ORDER_KEY);
    sessionStorage.removeItem(LAST_CHECKOUT_ORDER_KEY);
    return id;
  } catch {
    return "";
  }
}

/** Call on `/purchase-success` so the next Account visit knows to re-fetch. */
export function markAccountSyncAfterPurchase(): void {
  try {
    const stamp = String(Date.now());
    localStorage.setItem(SYNC_STORAGE_KEY, stamp);
    sessionStorage.setItem(SYNC_STORAGE_KEY, stamp);
  } catch {
    /* private mode / quota */
  }
}

/** Returns true once per purchase-success visit; flag is cleared immediately. */
export function takeAccountSyncAfterPurchase(): boolean {
  try {
    const stamp =
      localStorage.getItem(SYNC_STORAGE_KEY) ?? sessionStorage.getItem(SYNC_STORAGE_KEY);
    if (!stamp) return false;
    localStorage.removeItem(SYNC_STORAGE_KEY);
    sessionStorage.removeItem(SYNC_STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}

/**
 * Briefly hide a just-paid order from the pending list while fulfillment webhook catches up.
 * Keep the window short: long hides masked stuck PENDING orders (paid-but-unfulfilled bugs).
 */
export function markRecentPaidOrderId(orderId: string): void {
  const id = orderId.trim();
  if (!id) return;
  const now = Date.now();
  const next = [
    { id, at: now },
    ...readPaidOrderEntries().filter((entry) => entry.id !== id && now - entry.at < PAID_ORDER_HIDE_MAX_AGE_MS),
  ].slice(0, 12);
  writePaidOrderEntries(next);
}

/** Stop hiding an order id (e.g. still pending after grace period — show so user can see stuck state). */
export function clearRecentPaidOrderId(orderId: string): void {
  const id = orderId.trim();
  if (!id) return;
  writePaidOrderEntries(readPaidOrderEntries().filter((entry) => entry.id !== id));
}

export function getRecentPaidOrderIds(): Set<string> {
  const now = Date.now();
  const alive = readPaidOrderEntries().filter((entry) => now - entry.at < PAID_ORDER_HIDE_MAX_AGE_MS);
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
