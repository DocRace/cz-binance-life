import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { getRecentPaidOrderIds, reconcileRecentPaidOrderIds } from "../../lib/accountPurchaseSync";
import { bookBffJsonWithRefresh } from "../../lib/bookBffWithRefresh";
import { bookBffIsTransportIssue } from "../../lib/bookBffClient";

type PendingOrderRow = {
  c_order_id: string;
  c_collection_id?: string;
  c_quantity?: number;
  c_amount_hkd?: number;
  c_status?: number;
  collectionName?: string;
  paymentUrl?: string;
};

type PendingOrdersPayload = {
  success?: boolean;
  rows?: Array<Record<string, unknown>>;
  payments?: Array<Record<string, unknown>>;
  collections?: Array<Record<string, unknown>>;
  total?: number;
};

function str(v: unknown): string {
  return `${v ?? ""}`.trim();
}

function formatHkd(cents: number | undefined): string {
  if (cents == null || !Number.isFinite(cents)) return "—";
  return `HK$ ${(cents / 100).toFixed(2)}`;
}

function filterStalePendingRows(
  rows: PendingOrderRow[],
  hideOrderIds: Set<string>,
  suppressCollectionIds?: Set<string>,
): PendingOrderRow[] {
  return rows.filter((row) => {
    if (hideOrderIds.has(row.c_order_id)) return false;
    const collectionId = `${row.c_collection_id ?? ""}`.trim().toLowerCase();
    if (collectionId && suppressCollectionIds?.has(collectionId)) return false;
    return true;
  });
}

function mergePendingRows(data: PendingOrdersPayload): PendingOrderRow[] {
  const paymentMap = new Map<string, string>();
  for (const p of data.payments ?? []) {
    const orderId = str(p.c_order_id);
    const url = str(p.c_payment_url);
    if (orderId && url) paymentMap.set(orderId, url);
  }

  const collectionMap = new Map<string, string>();
  for (const c of data.collections ?? []) {
    const id = str(c.c_collection_id);
    const name = str(c.c_name);
    if (id) collectionMap.set(id, name);
  }

  return (data.rows ?? []).map((row) => {
    const orderId = str(row.c_order_id);
    const collectionId = str(row.c_collection_id);
    return {
      c_order_id: orderId,
      c_collection_id: collectionId,
      c_quantity: Number(row.c_quantity) || 1,
      c_amount_hkd: Number(row.c_amount_hkd),
      c_status: Number(row.c_status),
      collectionName: collectionMap.get(collectionId) || "",
      paymentUrl: paymentMap.get(orderId) || "",
    };
  });
}

interface AccountPendingOrdersProps {
  active: boolean;
  /** Bump after purchase sync so pending-order list re-fetches too. */
  refreshKey?: number;
  /** During post-payment sync, hide pending rows for collections that already show a new voucher. */
  suppressCollectionIds?: Set<string>;
  onChanged?: () => void;
}

export default function AccountPendingOrders({
  active,
  refreshKey = 0,
  suppressCollectionIds,
  onChanged,
}: AccountPendingOrdersProps) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [orders, setOrders] = useState<PendingOrderRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyOrderId, setBusyOrderId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!active) return;
    setLoading(true);
    setError(null);
    try {
      const out = await bookBffJsonWithRefresh<PendingOrdersPayload>("/api/bff/orders/pending/1");
      if (bookBffIsTransportIssue(out)) {
        setError(t("purchase.bffOffline"));
        setOrders([]);
        return;
      }
      if (out.code !== 0 || !out.data?.success) {
        setOrders([]);
        return;
      }
      const rows = mergePendingRows(out.data);
      reconcileRecentPaidOrderIds(rows.map((row) => row.c_order_id));
      setOrders(filterStalePendingRows(rows, getRecentPaidOrderIds(), suppressCollectionIds));
    } catch {
      setError(t("purchase.bffOffline"));
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [active, suppressCollectionIds, t]);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  const handlePay = (order: PendingOrderRow) => {
    const url = order.paymentUrl?.trim();
    if (!url) return;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleCancel = async (orderId: string) => {
    if (!orderId || busyOrderId) return;
    setBusyOrderId(orderId);
    try {
      const out = await bookBffJsonWithRefresh<null>("/api/bff/orders/cancel-payment", {
        method: "POST",
        body: JSON.stringify({ orderId }),
      });
      if (out.code === 0) {
        await load();
        onChanged?.();
      }
    } finally {
      setBusyOrderId(null);
    }
  };

  if (!active) return null;

  return (
    <section className="mb-12">
      <h2 className="font-display text-xl mb-4">{t("account.pendingOrders")}</h2>
      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>{t("common.loading")}</span>
        </div>
      ) : error ? (
        <p className="text-sm text-amber-500" role="status">
          {error}
        </p>
      ) : orders.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("account.noPendingOrders")}</p>
      ) : (
        <ul className="space-y-3">
          {orders.map((order) => (
            <li
              key={order.c_order_id}
              className="rounded-xl border border-border/50 bg-card/30 p-4 flex flex-col sm:flex-row sm:items-center gap-4"
            >
              <div className="min-w-0 flex-1 space-y-1">
                <p className="text-sm font-medium truncate">
                  {order.collectionName || t("account.nftCollectionFallback")}
                </p>
                <p className="text-xs text-muted-foreground font-mono break-all">
                  {t("account.orderId")}: {order.c_order_id}
                </p>
                <p className="text-sm text-foreground">
                  {formatHkd(order.c_amount_hkd)}
                  {order.c_quantity && order.c_quantity > 1 ? ` × ${order.c_quantity}` : ""}
                </p>
              </div>
              <div className="flex flex-wrap gap-2 shrink-0">
                <button
                  type="button"
                  disabled={!order.paymentUrl || busyOrderId === order.c_order_id}
                  onClick={() => handlePay(order)}
                  className="rounded-full px-4 py-2 text-sm bg-gold/90 text-primary-foreground hover:bg-gold disabled:opacity-40"
                >
                  {t("account.pay")}
                </button>
                <button
                  type="button"
                  disabled={busyOrderId === order.c_order_id}
                  onClick={() => void handleCancel(order.c_order_id)}
                  className="rounded-full px-4 py-2 text-sm border border-border text-muted-foreground hover:border-gold/50 hover:text-foreground disabled:opacity-40"
                >
                  {t("account.cancelPayment")}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
