import type { BookBffJsonResult } from "./bookBffClient";
import { bookBffIsTransportIssue } from "./bookBffClient";

/** Extra redeem diagnostics when `localStorage.bookDebugRedeem==="1"` or on known test hosts. */
function redeemVerboseDiagnosticsEnabled(): boolean {
  try {
    if (typeof window === "undefined") return false;
    if (`${window.localStorage?.getItem("bookDebugRedeem")}` === "1") return true;
    const h = window.location.hostname;
    return h === "cz-life-test.ipdex.vip" || h === "localhost" || h === "127.0.0.1";
  } catch {
    return false;
  }
}

/** When diagnostics are active — logs envelope on failed redeem (no request body). */
export function logClubRedeemResponseIfDebugging<T>(
  prefix: string,
  out: BookBffJsonResult<T>,
): void {
  try {
    if (typeof window === "undefined") return;
    if (!redeemVerboseDiagnosticsEnabled()) return;
    if (out.code === 0) return;
    // eslint-disable-next-line no-console
    console.warn(prefix, {
      code: out.code,
      message: out.message,
      rawStatus: out.rawStatus,
      data: out.data,
      transportError: out.transportError,
    });
  } catch {
    /* ignore */
  }
}

/** Append `[#code] message` under translated error when diagnostics are active. */
export function withBookRedeemDebugDetail(
  genericMessage: string,
  out: Pick<BookBffJsonResult<unknown>, "code" | "message">,
): string {
  try {
    if (typeof window === "undefined") return genericMessage;
    if (!redeemVerboseDiagnosticsEnabled()) return genericMessage;
    const c = out.code;
    if (typeof c !== "number") return genericMessage;
    const m = `${out.message || ""}`.trim();
    const detail = m || "(empty upstream message)";
    return `${genericMessage}\n[#${c}] ${detail}`;
  } catch {
    return genericMessage;
  }
}

export function localizedBookRedeemFailureMessage<T>(
  t: (key: string) => string,
  out: BookBffJsonResult<T>,
): string {
  const baseOffline = t("account.redeemErrorOffline");
  const baseGeneric = t("account.redeemErrorGeneric");
  let msg = bookBffIsTransportIssue(out) ? baseOffline : `${out.message || ""}`.trim() || baseGeneric;
  if (out.code === -10601) msg = t("account.redeemErrorStaffCode");
  else if (out.code === -10603) msg = `${t("account.redeemErrorBalanceLock")}\n\n${t("account.redeemErrorUpstreamTips")}`;
  else if (out.code === -10602) msg = `${t("account.redeemErrorSourceSeries")}\n\n${t("account.redeemErrorUpstreamTips")}`;
  else if (out.code === -10604) msg = t("account.redeemErrorNoStock");
  else if (out.code === -10605) msg = t("account.redeemErrorChain");
  else if (out.code === -10606) msg = t("account.redeemErrorRuleRequired");
  return withBookRedeemDebugDetail(msg, out);
}

/** Trim only — server allowlist compares series UUID casing; normalization is done case-insensitive on backend. */
export function normalizeIpdexRedeemSeriesUuid(raw: string): string {
  return `${raw ?? ""}`.trim();
}

/** Token index as shown in IPDEX UI (strip leading `#`). */
export function normalizeRedeemSourceTokenId(raw: string): string {
  let s = `${raw ?? ""}`.trim();
  if (s.startsWith("#")) s = s.slice(1).trim();
  return s;
}

function redemptionRuleUuidLooksValid(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s.trim());
}

/** Canonical JSON body for `POST /api/bff/club/redeem` (field names match BFF → IPDEX façade). */
export function buildClubRedeemPostJsonPayload(input: {
  staffCode: string;
  sourceCollectionId: string;
  sourceTokenId: string;
  idempotencyKey: string;
  redemptionRuleId?: string;
}): Record<string, string> {
  const body: Record<string, string> = {
    staffCode: input.staffCode.trim(),
    sourceCollectionId: normalizeIpdexRedeemSeriesUuid(input.sourceCollectionId),
    sourceTokenId: normalizeRedeemSourceTokenId(input.sourceTokenId),
    idempotencyKey: input.idempotencyKey,
  };
  const rid = `${input.redemptionRuleId ?? ""}`.trim();
  if (rid && redemptionRuleUuidLooksValid(rid)) {
    body.redemptionRuleId = normalizeIpdexRedeemSeriesUuid(rid);
  }
  return body;
}
