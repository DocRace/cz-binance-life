import { Outlet, Link, useLocation } from "react-router";
import { useState } from "react";
import { Users, List, User, Home, Clock, MapPin, Globe, SquareArrowOutUpRight } from "lucide-react";
import { motion } from "motion/react";
import { useTranslation } from "react-i18next";
import bookCover from "../../assets/book-cover-hero.png";
import LanguageSwitcher from "./LanguageSwitcher";
import { DataDanceWordmark } from "./DataDanceWordmark";
import {
  BOOK_CLUB_TELEGRAM_HANDLE,
  BOOK_CLUB_TELEGRAM_QR_SRC,
  BOOK_CLUB_TELEGRAM_URL,
  COMMERCIAL_PRESS_WECHAT_URL,
  getDatadanceSiteUrl,
  getIpdexSiteUrl,
  getIpdexSocialXUrl,
} from "../../config/platform";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "./ui/sheet";
import { Toaster } from "sonner";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { SITE_CONTAINER_X, SITE_HEADER_X } from "../layout/pageLayout";


export default function Layout() {
  const location = useLocation();
  const { t } = useTranslation();
  useDocumentTitle();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const ipdexBrandHref = getIpdexSiteUrl();
  const datadanceHref = getDatadanceSiteUrl();

  const partnerTitleClass = "font-display text-sm tracking-wide text-foreground/90";
  const partnerDescClass =
    "max-w-xs text-[11px] leading-relaxed text-muted-foreground sm:max-w-[15rem] lg:max-w-[13.5rem]";
  const partnerLinkClass = "text-muted-foreground transition-colors hover:text-gold";
  const partnerBrandLinkClass =
    "inline-flex items-center gap-1 font-tech text-[11px] text-muted-foreground/90 transition-colors hover:text-gold";

  const navItems = [
    { path: "/", label: t("nav.home"), icon: Home },
    { path: "/club", label: t("nav.joinClub"), icon: Users },
    { path: "/event", label: t("nav.offlineEvent"), icon: MapPin },
    { path: "/principles", label: t("nav.principles"), icon: List },
    { path: "/timeline", label: t("nav.timeline"), icon: Clock },
    { path: "/account", label: t("nav.account"), icon: User },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Background effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-gold opacity-10 blur-[120px] rounded-full" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-stone-400 opacity-10 blur-[120px] rounded-full" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-stone-500 opacity-5 blur-[150px] rounded-full" />
      </div>

      {/* Grid pattern overlay */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px'
        }}
      />

      {/* Header */}
      <motion.header
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="relative z-[40] border-b border-border/50 backdrop-blur-xl bg-background/80"
      >
        <div className={`${SITE_HEADER_X} py-3`}>
          <div className="flex items-center justify-between gap-3">
            <Link
              to="/"
              className="group flex shrink-0 items-center gap-2 sm:gap-3"
              aria-label={t("nav.siteTitle")}
            >
              <div className="relative h-10 w-10 shrink-0 sm:h-12 sm:w-12">
                <img
                  src={bookCover}
                  alt=""
                  className="h-full w-full object-contain object-center"
                  decoding="async"
                />
              </div>
              <div className="w-[10.75rem] shrink-0 sm:w-[11.75rem] md:w-[13.5rem]">
                <h1 className="whitespace-nowrap font-display text-sm leading-snug tracking-wide sm:text-base md:text-lg">
                  {t("nav.siteTitle")}
                </h1>
                <p className="whitespace-nowrap text-[10px] font-tech leading-snug text-muted-foreground sm:text-xs">
                  {t("nav.siteSubtitle")}
                </p>
              </div>
            </Link>

            <div className="hidden min-h-0 flex-1 items-center justify-end gap-2 lg:flex">
              <nav
                className="flex h-9 items-center gap-0.5 rounded-full border border-border/40 bg-muted/35 p-1 shadow-inner backdrop-blur-md"
                aria-label={t("nav.menuLabel")}
              >
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`
                        relative flex h-7 shrink-0 items-center rounded-full px-2.5 text-center text-sm transition-colors duration-300 lg:px-3 xl:px-3.5
                        ${isActive
                          ? "text-gold"
                          : "text-muted-foreground hover:text-foreground"
                        }
                      `}
                    >
                      {isActive && (
                        <motion.div
                          layoutId="activeNav"
                          className="absolute inset-0 rounded-full bg-gold/12 ring-1 ring-gold/35"
                          transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                        />
                      )}
                      <span className="relative flex items-center gap-1.5 leading-none xl:gap-2">
                        <Icon className="h-3.5 w-3.5 shrink-0 text-current xl:h-4 xl:w-4" />
                        <span className="whitespace-nowrap px-0.5">{item.label}</span>
                      </span>
                    </Link>
                  );
                })}
              </nav>
              <div className="shrink-0">
                <LanguageSwitcher />
              </div>
            </div>

            <button
              type="button"
              className="shrink-0 -mr-1 p-2 text-muted-foreground hover:text-foreground lg:hidden"
              aria-label={t("nav.openMenu")}
              aria-expanded={mobileNavOpen}
              onClick={() => setMobileNavOpen(true)}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </motion.header>

      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent
          side="right"
          className="flex w-[min(100%,20rem)] flex-col gap-6 border-border/50 bg-background/95 pt-14"
          aria-describedby={undefined}
        >
          <SheetHeader className="px-5 text-left border-b border-border/40 pb-4">
            <SheetTitle className="font-display text-lg">{t("nav.siteTitle")}</SheetTitle>
          </SheetHeader>
          <nav
            className="mx-4 flex flex-col gap-0.5 rounded-2xl border border-border/40 bg-muted/35 p-1.5 shadow-inner backdrop-blur-md"
            aria-label={t("nav.menuLabel")}
          >
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileNavOpen(false)}
                  className={`relative flex min-w-0 items-center gap-3 rounded-full px-3.5 py-2.5 text-sm transition-colors duration-300 ${
                    isActive
                      ? "text-gold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeMobileNav"
                      className="absolute inset-0 rounded-full bg-gold/12 ring-1 ring-gold/35"
                      transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                  <Icon className="relative h-4 w-4 shrink-0 text-current" />
                  <span className="relative min-w-0 flex-1 text-balance leading-snug">{item.label}</span>
                </Link>
              );
            })}
          </nav>
          <div className="relative z-[1] mx-4 border-t border-border/40 pt-4">
            <LanguageSwitcher />
          </div>
        </SheetContent>
      </Sheet>

      {/* Main content */}
      <main className="relative">
        <Outlet />
        <Toaster richColors position="top-center" toastOptions={{ className: "z-[230]" }} style={{ zIndex: 230 }} />
      </main>

      {/* Footer */}
      <footer
        className={`relative border-t border-border/50 backdrop-blur-xl bg-background/80 ${
          location.pathname === "/timeline" ? "mt-0" : "mt-20"
        }`}
      >
        <div className={`${SITE_CONTAINER_X} py-12`}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            <div className="text-center">
              <h3 className="font-display mb-4">{t("footer.aboutTitle")}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {t("footer.aboutDesc")}
              </p>
            </div>
            <div className="text-center">
              <h3 className="font-display mb-4">{t("footer.badgeTitle")}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {t("footer.badgeDesc")}
              </p>
            </div>
            <div className="text-center">
              <h3 className="font-display mb-4">{t("footer.contactTitle")}</h3>
              <a
                href={BOOK_CLUB_TELEGRAM_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="mx-auto mb-3 inline-block rounded-xl border border-border/45 bg-white p-2 shadow-sm transition-opacity hover:opacity-90"
                aria-label={t("club.contactTelegramQrAlt")}
              >
                <img
                  src={BOOK_CLUB_TELEGRAM_QR_SRC}
                  alt=""
                  width={120}
                  height={120}
                  className="h-[7.5rem] w-[7.5rem] object-contain"
                  loading="lazy"
                  decoding="async"
                />
              </a>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {t("club.contactTelegram")}:{" "}
                <a
                  href={BOOK_CLUB_TELEGRAM_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gold hover:text-gold-light transition-colors"
                >
                  @{BOOK_CLUB_TELEGRAM_HANDLE}
                </a>
              </p>
            </div>
          </div>

          {/* Partners strip */}
          <div className="border-t border-border/50 pt-8">
            <div className="grid grid-cols-1 gap-8 md:gap-6 lg:grid-cols-3 lg:gap-0 lg:items-start">
              {/* Commercial Press — left on wide screens */}
              <div className="flex flex-col items-center gap-3 text-center lg:items-start lg:text-left lg:pr-8">
                <h4 className={partnerTitleClass}>{t("footer.publisherSocialTitle")}</h4>
                <p className={partnerDescClass}>{t("footer.publisherDesc")}</p>
                <div className="flex items-center gap-2">
                  <a
                    href={COMMERCIAL_PRESS_WECHAT_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={partnerLinkClass}
                    aria-label={t("footer.publisherWechatAria")}
                  >
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                      <path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 0 1 .213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 0 0 .167-.054l1.903-1.114a.864.864 0 0 1 .717-.098 10.16 10.16 0 0 0 2.837.403c.276 0 .543-.027.811-.05-.857-2.578.157-4.972 1.932-6.446 1.703-1.415 3.882-1.98 5.853-1.838-.576-3.583-4.196-6.348-8.596-6.348zM5.785 5.991c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178A1.17 1.17 0 0 1 4.623 7.17c0-.651.52-1.18 1.162-1.18zm5.813 0c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178 1.17 1.17 0 0 1-1.162-1.178c0-.651.52-1.18 1.162-1.18zm5.34 2.867c-1.797-.052-3.746.512-5.28 1.786-1.72 1.428-2.687 3.72-1.78 6.22.942 2.453 3.666 4.229 6.884 4.229.826 0 1.622-.12 2.361-.336a.722.722 0 0 1 .598.082l1.584.926a.272.272 0 0 0 .14.047c.134 0 .24-.111.24-.247 0-.06-.023-.12-.038-.177l-.327-1.233a.582.582 0 0 1 .181-.555c1.529-1.195 2.512-2.947 2.512-4.892 0-3.59-3.284-6.444-7.075-6.85zm-2.289 3.098c.535 0 .969.44.969.984 0 .544-.434.984-.969.984a.978.978 0 0 1-.969-.984c0-.544.434-.984.969-.984zm4.633 0c.535 0 .969.44.969.984 0 .544-.434.984-.969.984a.978.978 0 0 1-.969-.984c0-.544.434-.984.969-.984z"/>
                    </svg>
                  </a>
                </div>
              </div>

              {/* IPDEX — center */}
              <div className="flex flex-col items-center gap-3 border-border/50 border-t pt-8 text-center lg:border-t-0 lg:border-x lg:px-8 lg:pt-0">
                <h4 className={partnerTitleClass}>IPDEX</h4>
                <p className={partnerDescClass}>{t("footer.poweredByIpdex")}</p>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <a
                    href={ipdexBrandHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={partnerBrandLinkClass}
                  >
                    IPDEX
                    <SquareArrowOutUpRight className="h-3 w-3 shrink-0 opacity-90" aria-hidden />
                  </a>
                  <a
                    href={ipdexBrandHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={partnerLinkClass}
                    aria-label={t("footer.ipdexWebsiteAria")}
                  >
                    <Globe className="h-5 w-5" aria-hidden />
                  </a>
                  <a
                    href={getIpdexSocialXUrl()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={partnerLinkClass}
                    aria-label={t("footer.ipdexXAria")}
                  >
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                    </svg>
                  </a>
                </div>
              </div>

              {/* DataDance Chain — right on wide screens */}
              <div className="flex flex-col items-center gap-3 border-t border-border/40 pt-8 text-center lg:items-end lg:border-t-0 lg:pl-8 lg:pt-0 lg:text-right">
                <h4 className={partnerTitleClass}>{t("footer.datadanceTitle")}</h4>
                <p className={partnerDescClass}>{t("footer.datadanceDesc")}</p>
                <div className="flex flex-wrap items-center justify-center gap-3 lg:justify-end">
                  <a
                    href={datadanceHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex text-foreground/90 transition-colors hover:text-gold"
                    aria-label={t("footer.datadanceWebsiteAria")}
                  >
                    <DataDanceWordmark className="h-[1.5625rem] w-[9rem]" />
                  </a>
                  <a
                    href={datadanceHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={partnerLinkClass}
                    aria-label={t("footer.datadanceWebsiteAria")}
                  >
                    <Globe className="h-5 w-5" aria-hidden />
                  </a>
                </div>
              </div>
            </div>

            <div className="mt-8 border-t border-border/40 pt-6 text-center text-sm text-muted-foreground">
              {t("footer.copyright")}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
