/**
 * Overseas-style commercial invoice PDF for completed book purchases.
 * Not a government tax invoice — a seller-issued commercial invoice / receipt.
 */

import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import bookCoverUrl from "../assets/book-cover-hero.png";

export type PaymentVoucherInput = {
  orderId: string;
  invoiceNumber: string;
  buyerEmail: string;
  buyerName?: string;
  productName: string;
  quantity: number;
  currency: string;
  unitAmountMinor: number | null;
  totalAmountMinor: number | null;
  amountLabelFallback?: string;
  paidAt: string | null;
  orderedAt: string | null;
  paymentMethod: string | null;
  cardBrand: string | null;
  ledgerAmountHkdMinor: number | null;
  sellerName: string;
  sellerWebsite: string;
  sellerContact: string;
  sellerNote: string;
  documentTitle: string;
  labels: InvoiceLabels;
};

export type InvoiceLabels = {
  invoiceTitle: string;
  statusPaid: string;
  billFrom: string;
  billTo: string;
  invoiceNumber: string;
  invoiceDate: string;
  orderRef: string;
  orderDate: string;
  description: string;
  qty: string;
  unitPrice: string;
  amount: string;
  subtotal: string;
  total: string;
  paymentMethod: string;
  paymentStatus: string;
  ledgerHkd: string;
  notes: string;
  disclaimer: string;
  generatedAt: string;
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function resolveAssetUrl(url: string): string {
  if (typeof window === "undefined") return url;
  try {
    return new URL(url, window.location.href).href;
  } catch {
    return url;
  }
}

function currencyDecimals(currency: string): number {
  const c = currency.toUpperCase();
  if (c === "JPY" || c === "KRW") return 0;
  return 2;
}

export function formatMoneyMinor(amountMinor: number | null, currency: string): string {
  if (amountMinor == null || !Number.isFinite(amountMinor)) return "—";
  const cur = (currency || "HKD").toUpperCase();
  const decimals = currencyDecimals(cur);
  const major = amountMinor / 10 ** decimals;
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: cur,
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(major);
  } catch {
    return `${cur} ${major.toFixed(decimals)}`;
  }
}

function formatWhen(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toISOString().replace("T", " ").slice(0, 19) + " UTC";
}

function formatDateOnly(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toISOString().slice(0, 10);
}

export function buildInvoiceNumber(orderId: string, paidAt: string | null): string {
  const day = paidAt ? formatDateOnly(paidAt).replace(/-/g, "") : "00000000";
  const short = orderId.replace(/-/g, "").slice(0, 8).toUpperCase();
  return `INV-${day}-${short}`;
}

function buildInvoiceBodyHtml(input: PaymentVoucherInput): string {
  const L = input.labels;
  const cur = (input.currency || "HKD").toUpperCase();
  const qty = input.quantity || 1;
  const unitMinor =
    input.unitAmountMinor != null
      ? input.unitAmountMinor
      : input.totalAmountMinor != null
        ? Math.round(input.totalAmountMinor / qty)
        : null;
  const totalLabel =
    input.totalAmountMinor != null
      ? formatMoneyMinor(input.totalAmountMinor, cur)
      : input.amountLabelFallback || "—";
  const unitLabel = formatMoneyMinor(unitMinor, cur);
  const method = [input.paymentMethod, input.cardBrand].filter(Boolean).join(" · ") || "—";
  const ledger =
    input.ledgerAmountHkdMinor != null
      ? formatMoneyMinor(input.ledgerAmountHkdMinor, "HKD")
      : "—";
  const invoiceDate = formatDateOnly(input.paidAt || input.orderedAt);

  return `
  <div class="inv-header">
    <div class="brand">
      <img class="logo-cover" src="${escapeHtml(resolveAssetUrl(bookCoverUrl))}" alt="" />
      <div class="brand-text">
        <div class="brand-name">${escapeHtml(input.sellerName)}</div>
        <div class="brand-sub">${escapeHtml(input.sellerWebsite)}</div>
      </div>
    </div>
    <div class="inv-title-block">
      <div class="inv-title">${escapeHtml(L.invoiceTitle)}</div>
      <div class="inv-status">${escapeHtml(L.statusPaid)}</div>
    </div>
  </div>

  <div class="meta-grid">
    <div class="meta-card">
      <div class="meta-label">${escapeHtml(L.billFrom)}</div>
      <div class="meta-strong">${escapeHtml(input.sellerName)}</div>
      <div>${escapeHtml(input.sellerWebsite)}</div>
      <div>${escapeHtml(input.sellerContact)}</div>
      <div class="muted">${escapeHtml(input.sellerNote)}</div>
    </div>
    <div class="meta-card">
      <div class="meta-label">${escapeHtml(L.billTo)}</div>
      <div class="meta-strong">${escapeHtml(input.buyerName || input.buyerEmail || "—")}</div>
      <div>${escapeHtml(input.buyerEmail || "—")}</div>
    </div>
    <div class="meta-card meta-card-right">
      <div class="kv"><span>${escapeHtml(L.invoiceNumber)}</span><strong>${escapeHtml(input.invoiceNumber)}</strong></div>
      <div class="kv"><span>${escapeHtml(L.invoiceDate)}</span><strong>${escapeHtml(invoiceDate)}</strong></div>
      <div class="kv"><span>${escapeHtml(L.orderRef)}</span><strong class="mono">${escapeHtml(input.orderId)}</strong></div>
      <div class="kv"><span>${escapeHtml(L.orderDate)}</span><strong>${escapeHtml(formatDateOnly(input.orderedAt))}</strong></div>
    </div>
  </div>

  <table class="lines">
    <thead>
      <tr>
        <th>${escapeHtml(L.description)}</th>
        <th class="num">${escapeHtml(L.qty)}</th>
        <th class="num">${escapeHtml(L.unitPrice)}</th>
        <th class="num">${escapeHtml(L.amount)}</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>${escapeHtml(input.productName || "—")}</td>
        <td class="num">${escapeHtml(String(qty))}</td>
        <td class="num">${escapeHtml(unitLabel)}</td>
        <td class="num">${escapeHtml(totalLabel)}</td>
      </tr>
    </tbody>
  </table>

  <div class="totals">
    <div class="tot-row"><span>${escapeHtml(L.subtotal)}</span><strong>${escapeHtml(totalLabel)}</strong></div>
    <div class="tot-row tot-grand"><span>${escapeHtml(L.total)}</span><strong>${escapeHtml(totalLabel)}</strong></div>
    <div class="tot-row"><span>${escapeHtml(L.paymentStatus)}</span><strong>${escapeHtml(L.statusPaid)}</strong></div>
    <div class="tot-row"><span>${escapeHtml(L.paymentMethod)}</span><strong>${escapeHtml(method)}</strong></div>
    <div class="tot-row muted-row"><span>${escapeHtml(L.ledgerHkd)}</span><strong>${escapeHtml(ledger)}</strong></div>
  </div>

  <div class="notes">
    <div class="meta-label">${escapeHtml(L.notes)}</div>
    <p>${escapeHtml(L.disclaimer)}</p>
  </div>
  <div class="footer-meta">${escapeHtml(L.generatedAt)}: ${escapeHtml(formatWhen(new Date().toISOString()))}</div>
`;
}

const INVOICE_STYLES = `
  * { box-sizing: border-box; }
  .invoice-root {
    width: 794px;
    font-family: "Helvetica Neue", Helvetica, Arial, "PingFang SC", "Noto Sans SC",
      "Microsoft YaHei", sans-serif;
    color: #141414;
    background: #fff;
    padding: 36px 40px 32px;
  }
  .inv-header {
    display: flex; justify-content: space-between; align-items: flex-start;
    gap: 20px; margin-bottom: 28px; padding-bottom: 18px;
    border-bottom: 2px solid #111;
  }
  .brand { display: flex; align-items: center; gap: 12px; min-width: 0; }
  .logo-cover { width: 48px; height: 64px; object-fit: cover; border-radius: 2px; box-shadow: 0 1px 4px rgba(0,0,0,.12); }
  .brand-name { font-size: 18px; font-weight: 700; letter-spacing: 0.02em; line-height: 1.25; }
  .brand-sub { font-size: 12px; color: #555; margin-top: 2px; }
  .inv-title-block { text-align: right; }
  .inv-title { font-size: 28px; font-weight: 800; letter-spacing: 0.12em; }
  .inv-status {
    display: inline-block; margin-top: 8px; font-size: 11px; font-weight: 700;
    letter-spacing: 0.08em; color: #0a7a3e; border: 1px solid #0a7a3e;
    padding: 3px 10px; border-radius: 999px;
  }
  .meta-grid {
    display: grid; grid-template-columns: 1.1fr 1fr 1.2fr; gap: 14px; margin-bottom: 22px;
  }
  .meta-card {
    border: 1px solid #e6e6e6; border-radius: 8px; padding: 12px 14px;
    font-size: 12px; line-height: 1.45; min-height: 112px;
  }
  .meta-card-right .kv {
    display: flex; justify-content: space-between; gap: 10px; margin-bottom: 6px;
  }
  .meta-card-right .kv span { color: #666; }
  .meta-card-right .kv strong { text-align: right; font-weight: 600; }
  .meta-label {
    font-size: 10px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase;
    color: #888; margin-bottom: 6px;
  }
  .meta-strong { font-size: 13px; font-weight: 700; margin-bottom: 2px; }
  .muted { color: #777; margin-top: 6px; }
  .mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 10px; word-break: break-all; }
  table.lines { width: 100%; border-collapse: collapse; margin: 8px 0 18px; }
  table.lines th {
    text-align: left; font-size: 10px; letter-spacing: 0.06em; text-transform: uppercase;
    color: #666; border-bottom: 1px solid #111; padding: 8px 6px;
  }
  table.lines td {
    padding: 12px 6px; border-bottom: 1px solid #e8e8e8; font-size: 13px; vertical-align: top;
  }
  .num { text-align: right !important; white-space: nowrap; }
  .totals { margin-left: auto; width: 320px; }
  .tot-row {
    display: flex; justify-content: space-between; gap: 16px;
    padding: 6px 0; font-size: 12px; border-bottom: 1px solid #eee;
  }
  .tot-grand {
    border-bottom: 2px solid #111; font-size: 14px; padding-top: 10px; padding-bottom: 10px;
  }
  .muted-row { color: #777; }
  .notes { margin-top: 22px; padding-top: 14px; border-top: 1px solid #e6e6e6; }
  .notes p { margin: 0; font-size: 11px; color: #555; line-height: 1.55; max-width: 48em; }
  .footer-meta { margin-top: 14px; font-size: 10px; color: #999; }
`;

/** Full HTML document for in-page preview (no PDF generation). */
export function buildInvoicePreviewDocumentHtml(input: PaymentVoucherInput): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><style>
html,body{margin:0;padding:0;background:#f3f3f3;}
body{display:flex;justify-content:center;padding:16px 12px 24px;}
${INVOICE_STYLES}
.invoice-root{box-shadow:0 8px 28px rgba(0,0,0,.08);max-width:100%;}
@media (max-width:840px){
  .invoice-root{width:100%;padding:24px 18px;}
  .meta-grid{grid-template-columns:1fr;}
}
</style></head><body><div class="invoice-root">${buildInvoiceBodyHtml(input)}</div></body></html>`;
}

async function waitForImages(root: HTMLElement, timeoutMs = 8000): Promise<void> {
  const images = Array.from(root.querySelectorAll("img"));
  if (images.length === 0) return;
  await Promise.all(
    images.map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete && img.naturalWidth > 0) {
            resolve();
            return;
          }
          let done = false;
          const finish = () => {
            if (done) return;
            done = true;
            resolve();
          };
          img.addEventListener("load", finish, { once: true });
          img.addEventListener("error", finish, { once: true });
          window.setTimeout(finish, timeoutMs);
        }),
    ),
  );
}

async function renderInvoicePdf(input: PaymentVoucherInput): Promise<jsPDF> {
  const host = document.createElement("div");
  host.setAttribute("aria-hidden", "true");
  // Keep on-screen (opacity 0) so browsers still load images; off-left can hang html2canvas.
  host.style.cssText =
    "position:fixed;left:0;top:0;width:794px;background:#fff;opacity:0;pointer-events:none;z-index:-1;";
  host.innerHTML = `<style>${INVOICE_STYLES}</style><div class="invoice-root">${buildInvoiceBodyHtml(input)}</div>`;
  document.body.appendChild(host);

  try {
    const root = host.querySelector(".invoice-root") as HTMLElement;
    await waitForImages(root);
    await new Promise<void>((r) => requestAnimationFrame(() => r()));

    const canvas = await html2canvas(root, {
      scale: 1.5,
      backgroundColor: "#ffffff",
      useCORS: true,
      allowTaint: true,
      logging: false,
      imageTimeout: 8000,
    });

    const img = canvas.toDataURL("image/jpeg", 0.92);
    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const margin = 10;
    const maxW = pageW - margin * 2;
    const maxH = pageH - margin * 2;
    const imgW = canvas.width;
    const imgH = canvas.height;
    let w = maxW;
    let h = (imgH / imgW) * w;
    if (h > maxH) {
      h = maxH;
      w = (imgW / imgH) * h;
    }
    const x = (pageW - w) / 2;
    pdf.addImage(img, "JPEG", x, margin, w, h, undefined, "FAST");
    return pdf;
  } finally {
    host.remove();
  }
}

export async function createPaymentVoucherPdfBlob(
  input: PaymentVoucherInput,
): Promise<{ blob: Blob; filename: string; url: string }> {
  const pdf = await renderInvoicePdf(input);
  const blob = pdf.output("blob");
  const filename = `${input.invoiceNumber}.pdf`;
  const url = URL.createObjectURL(blob);
  return { blob, filename, url };
}

export async function downloadPaymentVoucherPdf(input: PaymentVoucherInput): Promise<void> {
  const pdf = await renderInvoicePdf(input);
  pdf.save(`${input.invoiceNumber}.pdf`);
}

export async function openPaymentVoucherPdf(input: PaymentVoucherInput): Promise<void> {
  const { url } = await createPaymentVoucherPdfBlob(input);
  const win = window.open(url, "_blank", "noopener,noreferrer");
  if (!win) {
    const a = document.createElement("a");
    a.href = url;
    a.download = `${input.invoiceNumber}.pdf`;
    a.click();
  }
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

/** @deprecated */
export async function downloadPaymentVoucherHtml(input: PaymentVoucherInput): Promise<void> {
  return downloadPaymentVoucherPdf(input);
}

/** @deprecated */
export async function openPaymentVoucher(input: PaymentVoucherInput): Promise<void> {
  return openPaymentVoucherPdf(input);
}
