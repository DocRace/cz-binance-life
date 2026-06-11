import { useEffect } from "react";
import { useLocation } from "react-router";
import { useTranslation } from "react-i18next";

function titleKeyForPath(pathname: string): string {
  if (pathname === "/") return "meta.titleHome";
  if (pathname === "/book") return "meta.titleBook";
  if (pathname === "/club") return "meta.titleClub";
  if (pathname === "/event") return "meta.titleOfflineEvent";
  if (pathname === "/principles") return "meta.titlePrinciples";
  if (pathname === "/timeline") return "meta.titleTimeline";
  if (pathname === "/account/redeem") return "meta.titleAccountRedeem";
  if (pathname === "/account") return "meta.titleAccount";
  if (pathname === "/purchase-success") return "meta.titlePurchaseSuccess";
  return "meta.titleNotFound";
}

/** Sync browser tab title and <html lang> with route + active i18n language. */
export function useDocumentTitle() {
  const { pathname } = useLocation();
  const { t, i18n } = useTranslation();

  useEffect(() => {
    document.title = t(titleKeyForPath(pathname));
    document.documentElement.lang = i18n.resolvedLanguage || i18n.language || "en";
  }, [pathname, t, i18n.language, i18n.resolvedLanguage]);
}
