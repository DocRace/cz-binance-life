import { useCallback, useEffect, useState } from "react";
import { motion } from "motion/react";
import { Link, Navigate } from "react-router";
import { ArrowLeft, Download, Eye, FileText, Loader2, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  bookBffClearSessionAndReload,
  bookBffIsTransportIssue,
  bookBffJson,
  bookBffProfileUnavailable,
} from "../../lib/bookBffClient";
import { bookBffJsonWithRefresh, bookBffVerifySessionAlive } from "../../lib/bookBffWithRefresh";
import {
  buildInvoiceNumber,
  buildInvoicePreviewDocumentHtml,
  downloadPaymentVoucherPdf,
  formatMoneyMinor,
  type PaymentVoucherInput,
} from "../../lib/paymentVoucher";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import { CONTENT_DEFAULT, PAGE_SHELL } from "../layout/pageLayout";

type HistoryOrder = {
  c_order_id: string;
  c_collection_id?: string;
  c_quantity?: number;
  c_amount_hkd?: number;
  c_created_at?: string | null;
  presentmentCurrency?: string | null;
  presentmentAmount?: number | null;
  paidAt?: string | null;
  productName: string;
};

type HistoryPayload = {
  success?: boolean;
  rows?: Array<Record<string, unknown>>;
  collections?: Array<Record<string, unknown>>;
  total?: number;
};

type PaymentPayload = {
  orderId?: string;
  quantity?: number;
  ledgerAmountHkd?: number | null;
  agreed?: {
    currency?: string | null;
    unitAmount?: number | null;
    totalAmount?: number | null;
  };
  paid?: {
    paidAt?: string | null;
    presentmentCurrency?: string | null;
    presentmentAmount?: number | null;
    paymentMethod?: string | null;
    cardBrand?: string | null;
  };
};

function str(v: unknown): string {
  return `${v ?? ""}`.trim();
}

function mergeHistoryRows(data: HistoryPayload): HistoryOrder[] {
  const collectionMap = new Map<string, string>();
  for (const c of data.collections ?? []) {
    const id = str(c.c_collection_id);
    const name = str(c.c_name) || str(c.c_ip_name);
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
      c_created_at: row.c_created_at ? String(row.c_created_at) : null,
      presentmentCurrency: row.presentmentCurrency != null ? String(row.presentmentCurrency) : null,
      presentmentAmount:
        row.presentmentAmount != null && Number.isFinite(Number(row.presentmentAmount))
          ? Number(row.presentmentAmount)
          : null,
      paidAt: row.paidAt != null ? String(row.paidAt) : null,
      productName: collectionMap.get(collectionId) || "",
    };
  });
}

export default function AccountInvoices() {
  const { t } = useTranslation();
  const [sessionChecking, setSessionChecking] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [profileEmail, setProfileEmail] = useState("");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [orders, setOrders] = useState<HistoryOrder[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState("");
  const [previewVoucher, setPreviewVoucher] = useState<PaymentVoucherInput | null>(null);

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const s = await bookBffJson<{ authenticated: boolean }>("/api/bff/auth/session");
        if (cancel) return;
        if (bookBffIsTransportIssue(s)) {
          setLoadError(t("purchase.bffOffline"));
          setIsLoggedIn(false);
          return;
        }
        if (!(s.code === 0 && s.data?.authenticated)) {
          setIsLoggedIn(false);
          return;
        }
        const me = await bookBffJsonWithRefresh<Record<string, unknown>>("/api/bff/me");
        if (cancel) return;
        if (me.code === 0 && me.data && typeof me.data === "object") {
          setIsLoggedIn(true);
          setProfileEmail(str(me.data.email) || str(me.data.c_email));
        } else if (bookBffProfileUnavailable(me)) {
          void bookBffClearSessionAndReload();
        } else {
          setLoadError(t("purchase.bffOffline"));
          setIsLoggedIn(false);
        }
      } catch {
        if (!cancel) {
          setLoadError(t("purchase.bffOffline"));
          setIsLoggedIn(false);
        }
      } finally {
        if (!cancel) setSessionChecking(false);
      }
    })();
    return () => {
      cancel = true;
    };
  }, [t]);

  const loadHistory = useCallback(
    async (pageNum: number) => {
      setLoading(true);
      setLoadError(null);
      try {
        const out = await bookBffJsonWithRefresh<HistoryPayload>(`/api/bff/orders/history/${pageNum}`);
        if (bookBffIsTransportIssue(out)) {
          setLoadError(t("purchase.bffOffline"));
          setOrders([]);
          return;
        }
        if (out.code !== 0 || !out.data?.success) {
          setLoadError(t("account.invoicesLoadError"));
          setOrders([]);
          return;
        }
        setOrders(mergeHistoryRows(out.data));
        setTotal(Number(out.data.total) || 0);
        setPage(pageNum);
      } catch {
        setLoadError(t("account.invoicesLoadError"));
        setOrders([]);
      } finally {
        setLoading(false);
      }
    },
    [t],
  );

  useEffect(() => {
    if (!isLoggedIn) return;
    void loadHistory(1);
  }, [isLoggedIn, loadHistory]);

  useEffect(() => {
    if (!isLoggedIn) return;
    const recheckSession = () => {
      if (document.visibilityState !== "visible") return;
      void (async () => {
        const alive = await bookBffVerifySessionAlive();
        if (!alive) await bookBffClearSessionAndReload();
      })();
    };
    document.addEventListener("visibilitychange", recheckSession);
    return () => document.removeEventListener("visibilitychange", recheckSession);
  }, [isLoggedIn]);

  const invoiceLabels = useCallback(
    () => ({
      invoiceTitle: t("account.invoiceDocumentTitle"),
      statusPaid: t("account.invoiceStatusPaid"),
      billFrom: t("account.invoiceBillFrom"),
      billTo: t("account.invoiceBillTo"),
      invoiceNumber: t("account.invoiceNumber"),
      invoiceDate: t("account.invoiceDate"),
      orderRef: t("account.invoiceOrderRef"),
      orderDate: t("account.invoiceOrderDate"),
      description: t("account.invoiceDescription"),
      qty: t("account.invoiceQtyCol"),
      unitPrice: t("account.invoiceUnitPrice"),
      amount: t("account.invoiceAmountCol"),
      subtotal: t("account.invoiceSubtotal"),
      total: t("account.invoiceTotal"),
      paymentMethod: t("account.invoiceFieldPaymentMethod"),
      paymentStatus: t("account.invoicePaymentStatus"),
      ledgerHkd: t("account.invoiceFieldLedgerHkd"),
      notes: t("account.invoiceNotes"),
      disclaimer: t("account.invoiceDisclaimer"),
      generatedAt: t("account.invoiceGeneratedAt"),
    }),
    [t],
  );

  const buildVoucher = useCallback(
    async (order: HistoryOrder): Promise<PaymentVoucherInput | null> => {
      const pay = await bookBffJsonWithRefresh<PaymentPayload>(
        `/api/bff/orders/${order.c_order_id}/payment`,
      );
      if (pay.code !== 0 || !pay.data) {
        toast.error(t("account.invoiceDetailError"));
        return null;
      }
      const currency =
        str(pay.data.paid?.presentmentCurrency) ||
        str(pay.data.agreed?.currency) ||
        str(order.presentmentCurrency) ||
        "hkd";
      const totalMinor =
        pay.data.paid?.presentmentAmount ??
        pay.data.agreed?.totalAmount ??
        order.presentmentAmount ??
        null;
      const unitMinor =
        pay.data.agreed?.unitAmount != null && Number.isFinite(Number(pay.data.agreed.unitAmount))
          ? Number(pay.data.agreed.unitAmount)
          : null;
      const paidAt = pay.data.paid?.paidAt || order.paidAt;
      return {
        orderId: order.c_order_id,
        invoiceNumber: buildInvoiceNumber(order.c_order_id, paidAt),
        buyerEmail: profileEmail,
        productName: order.productName || t("account.invoiceProductFallback"),
        quantity: pay.data.quantity || order.c_quantity || 1,
        currency,
        unitAmountMinor: unitMinor,
        totalAmountMinor: totalMinor,
        amountLabelFallback:
          order.c_amount_hkd != null ? formatMoneyMinor(order.c_amount_hkd, "HKD") : undefined,
        paidAt,
        orderedAt: order.c_created_at || null,
        paymentMethod: pay.data.paid?.paymentMethod || null,
        cardBrand: pay.data.paid?.cardBrand || null,
        ledgerAmountHkdMinor: pay.data.ledgerAmountHkd ?? order.c_amount_hkd ?? null,
        sellerName: t("account.invoiceSellerName"),
        sellerWebsite: t("account.invoiceSellerWebsite"),
        sellerContact: t("account.invoiceSellerContact"),
        sellerNote: t("account.invoiceSellerNote"),
        documentTitle: t("account.invoiceDocumentTitle"),
        labels: invoiceLabels(),
      };
    },
    [profileEmail, t, invoiceLabels],
  );

  const closePreview = useCallback(() => {
    setPreviewOpen(false);
    setPreviewLoading(false);
    setPreviewHtml(null);
    setPreviewTitle("");
    setPreviewVoucher(null);
  }, []);

  const handleOpen = async (order: HistoryOrder) => {
    if (busyKey) return;
    const key = `${order.c_order_id}:view`;
    setBusyKey(key);
    setPreviewOpen(true);
    setPreviewLoading(true);
    setPreviewHtml(null);
    setPreviewVoucher(null);
    setPreviewTitle(t("account.invoiceDocumentTitle"));
    try {
      const voucher = await buildVoucher(order);
      if (!voucher) {
        closePreview();
        return;
      }
      setPreviewVoucher(voucher);
      setPreviewTitle(`${voucher.invoiceNumber}.pdf`);
      setPreviewHtml(buildInvoicePreviewDocumentHtml(voucher));
    } catch {
      toast.error(t("account.invoicePdfError"));
      closePreview();
    } finally {
      setPreviewLoading(false);
      setBusyKey(null);
    }
  };

  const handleDownload = async (order: HistoryOrder) => {
    if (busyKey) return;
    const key = `${order.c_order_id}:download`;
    setBusyKey(key);
    try {
      const voucher = await buildVoucher(order);
      if (voucher) {
        await downloadPaymentVoucherPdf(voucher);
        toast.success(t("account.invoiceDownloadOk"));
      }
    } catch {
      toast.error(t("account.invoicePdfError"));
    } finally {
      setBusyKey(null);
    }
  };

  const handlePreviewDownload = async () => {
    if (!previewVoucher || busyKey) return;
    setBusyKey("preview:download");
    try {
      await downloadPaymentVoucherPdf(previewVoucher);
      toast.success(t("account.invoiceDownloadOk"));
    } catch {
      toast.error(t("account.invoicePdfError"));
    } finally {
      setBusyKey(null);
    }
  };

  if (sessionChecking) {
    return (
      <div className={`${PAGE_SHELL} flex items-center justify-center min-h-[50vh]`}>
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isLoggedIn) {
    return <Navigate to="/account" replace />;
  }

  const pageSize = 20;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className={`${PAGE_SHELL} ${CONTENT_DEFAULT}`}>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
        <Link
          to="/account"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-gold mb-6"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden />
          {t("account.invoicesBack")}
        </Link>
        <h1 className="font-display text-3xl md:text-4xl mb-3">{t("account.invoicesTitle")}</h1>
        <p className="text-muted-foreground text-sm md:text-base leading-relaxed max-w-2xl">
          {t("account.invoicesIntro")}
        </p>
      </motion.div>

      {loadError ? (
        <p className="text-sm text-amber-500 mb-6" role="alert">
          {loadError}
        </p>
      ) : null}

      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground mb-8">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>{t("common.loading")}</span>
        </div>
      ) : null}

      {!loading && orders.length === 0 ? (
        <p className="text-muted-foreground mb-10">{t("account.invoicesEmpty")}</p>
      ) : null}

      {orders.length > 0 ? (
        <ul className="space-y-3 mb-10">
          {orders.map((order) => {
            const currency = str(order.presentmentCurrency) || "hkd";
            const amountLabel =
              order.presentmentAmount != null
                ? formatMoneyMinor(order.presentmentAmount, currency)
                : formatMoneyMinor(order.c_amount_hkd ?? null, "HKD");
            const when = order.paidAt || order.c_created_at;
            const viewBusy = busyKey === `${order.c_order_id}:view`;
            const downloadBusy = busyKey === `${order.c_order_id}:download`;
            const rowLocked = Boolean(busyKey);
            return (
              <li
                key={order.c_order_id}
                className="rounded-xl border border-border/60 bg-card/30 px-4 py-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4"
              >
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <FileText className="w-5 h-5 text-gold shrink-0 mt-0.5" aria-hidden />
                  <div className="min-w-0">
                    <p className="font-medium text-foreground truncate">
                      {order.productName || t("account.invoiceProductFallback")}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {amountLabel}
                      {" · "}
                      {t("account.invoiceQty", { count: order.c_quantity || 1 })}
                      {when ? ` · ${new Date(when).toLocaleString()}` : null}
                    </p>
                    <p className="text-xs font-mono text-muted-foreground/80 mt-1 break-all">
                      {order.c_order_id}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 sm:shrink-0">
                  <button
                    type="button"
                    disabled={rowLocked}
                    onClick={() => void handleOpen(order)}
                    className="inline-flex items-center gap-1.5 rounded-full border border-gold/50 px-4 py-2 text-sm text-gold hover:bg-gold/10 disabled:opacity-50"
                  >
                    {viewBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
                    {t("account.invoiceOpen")}
                  </button>
                  <button
                    type="button"
                    disabled={rowLocked}
                    onClick={() => void handleDownload(order)}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-sm text-muted-foreground hover:border-gold/40 hover:text-foreground disabled:opacity-50"
                  >
                    {downloadBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                    {t("account.invoiceDownload")}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}

      {totalPages > 1 ? (
        <div className="flex items-center justify-center gap-3 mb-8">
          <button
            type="button"
            disabled={page <= 1 || loading}
            onClick={() => void loadHistory(page - 1)}
            className="text-sm text-muted-foreground hover:text-gold disabled:opacity-40"
          >
            {t("account.invoicesPrev")}
          </button>
          <span className="text-sm text-muted-foreground">
            {t("account.invoicesPage", { page, totalPages })}
          </span>
          <button
            type="button"
            disabled={page >= totalPages || loading}
            onClick={() => void loadHistory(page + 1)}
            className="text-sm text-muted-foreground hover:text-gold disabled:opacity-40"
          >
            {t("account.invoicesNext")}
          </button>
        </div>
      ) : null}

      <Dialog
        open={previewOpen}
        onOpenChange={(open) => {
          if (!open) closePreview();
          else setPreviewOpen(true);
        }}
      >
        <DialogContent className="flex h-[min(92vh,920px)] w-[min(960px,calc(100%-1.5rem))] max-w-none flex-col gap-0 overflow-hidden rounded-2xl border border-border bg-card p-0 shadow-2xl sm:max-w-none">
          <DialogHeader className="shrink-0 border-b border-border/60 px-4 py-3 pr-12 text-left sm:px-5">
            <DialogTitle className="truncate font-mono text-sm sm:text-base">
              {previewTitle || t("account.invoiceDocumentTitle")}
            </DialogTitle>
            <DialogDescription className="sr-only">
              {t("account.invoicesIntro")}
            </DialogDescription>
          </DialogHeader>
          <div className="relative min-h-0 flex-1 bg-muted/40">
            {previewLoading || !previewHtml ? (
              <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="text-sm">{t("common.loading")}</span>
              </div>
            ) : (
              <iframe
                title={previewTitle || t("account.invoiceDocumentTitle")}
                srcDoc={previewHtml}
                className="absolute inset-0 h-full w-full border-0 bg-[#f3f3f3]"
              />
            )}
          </div>
          <div className="flex shrink-0 items-center justify-end gap-2 border-t border-border/60 px-4 py-3 sm:px-5">
            <button
              type="button"
              disabled={!previewVoucher || Boolean(busyKey)}
              onClick={() => void handlePreviewDownload()}
              className="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-sm text-muted-foreground hover:border-gold/40 hover:text-foreground disabled:opacity-50"
            >
              {busyKey === "preview:download" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              {t("account.invoiceDownload")}
            </button>
            <button
              type="button"
              onClick={closePreview}
              className="inline-flex items-center gap-1.5 rounded-full border border-gold/50 px-4 py-2 text-sm text-gold hover:bg-gold/10"
            >
              <X className="h-4 w-4" />
              {t("common.close")}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
