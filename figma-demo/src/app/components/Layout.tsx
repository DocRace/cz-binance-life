import { Outlet, Link, useLocation } from "react-router";
import { useState } from "react";
import { Users, Sparkles, User, Home, Clock, SquareArrowOutUpRight } from "lucide-react";
import { motion } from "motion/react";
import { useTranslation } from "react-i18next";
import bookCover from "../../assets/book-cover-hero.png";
import LanguageSwitcher from "./LanguageSwitcher";
import PlatformSettlementRibbon from "./PlatformSettlementRibbon";
import {
  BOOK_CLUB_TELEGRAM_HANDLE,
  BOOK_CLUB_TELEGRAM_QR_SRC,
  BOOK_CLUB_TELEGRAM_URL,
  getIpdexMarketOrigin,
  getIpdexSocialFacebookUrl,
  getIpdexSocialXUrl,
  normalizeOrigin,
} from "../../config/platform";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "./ui/sheet";
import { Toaster } from "sonner";
import { useDocumentTitle } from "../hooks/useDocumentTitle";


export default function Layout() {
  const location = useLocation();
  const { t } = useTranslation();
  useDocumentTitle();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const ipdexMarketHref = normalizeOrigin(getIpdexMarketOrigin());
  const ipdexBrandHref = ipdexMarketHref || "https://ipdex.io";

  const navItems = [
    { path: "/", label: t("nav.home"), icon: Home },
    { path: "/club", label: t("nav.joinClub"), icon: Users },
    { path: "/principles", label: t("nav.principles"), icon: Sparkles },
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
        <div className="container mx-auto px-4 py-3 sm:px-6">
          <div className="flex items-center justify-between gap-3">
            <Link to="/" className="group flex min-w-0 flex-1 items-center gap-2 sm:gap-3 lg:max-w-[min(100%,22rem)] xl:max-w-md">
              <div className="relative h-10 w-10 shrink-0 sm:h-12 sm:w-12">
                <img
                  src={bookCover}
                  alt=""
                  className="h-full w-full object-contain object-center"
                  decoding="async"
                />
              </div>
              <div className="min-w-0">
                <h1 className="font-display text-sm leading-snug tracking-wide text-balance sm:text-base md:text-lg">{t("nav.siteTitle")}</h1>
                <p className="text-[10px] text-muted-foreground font-tech leading-snug text-balance sm:text-xs">{t("nav.siteSubtitle")}</p>
              </div>
            </Link>

            <div className="hidden min-h-0 flex-1 items-center md:flex md:justify-end md:gap-2">
              <nav
                className="flex h-9 max-w-full items-center gap-0.5 overflow-x-auto rounded-full border border-border/40 bg-muted/35 p-1 shadow-inner backdrop-blur-md [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
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
              className="md:hidden shrink-0 -mr-1 p-2 text-muted-foreground hover:text-foreground"
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
          <SheetHeader className="text-left border-b border-border/40 pb-4">
            <SheetTitle className="font-display text-lg">{t("nav.siteTitle")}</SheetTitle>
          </SheetHeader>
          <nav className="flex flex-col gap-1" aria-label={t("nav.menuLabel")}>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileNavOpen(false)}
                  className={`flex min-w-0 items-center gap-3 rounded-xl px-4 py-3 text-sm transition-colors ${
                    isActive
                      ? "bg-gold/10 text-gold ring-1 ring-gold/30"
                      : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="min-w-0 flex-1 text-balance leading-snug">{item.label}</span>
                </Link>
              );
            })}
          </nav>
          <div className="relative z-[1] mt-auto border-t border-border/40 pt-4 pb-2">
            <LanguageSwitcher dropUp />
          </div>
        </SheetContent>
      </Sheet>

      {/* Main content */}
      <main className="relative">
        <Outlet />
        <Toaster richColors position="top-center" toastOptions={{ className: "z-[230]" }} style={{ zIndex: 230 }} />
      </main>

      {/* Footer */}
      <footer className="relative border-t border-border/50 mt-20 backdrop-blur-xl bg-background/80">
        <div className="container mx-auto px-6 py-12">
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

          {/* Social Media Links */}
          <div className="border-t border-border/50 pt-8">
            <div className="flex flex-col items-center gap-6">
              <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-8">
                {/* Publisher (primary) */}
                <div className="flex flex-col items-center gap-3 text-center">
                  <h4 className="font-display text-sm tracking-wide text-foreground/90">
                    {t("footer.publisherSocialTitle")}
                  </h4>
                  <div className="flex flex-wrap items-center justify-center gap-3">
                  <a href="https://x.com/commercialpress" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-gold transition-colors">
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                    </svg>
                  </a>
                  <a href="https://facebook.com/commercialpress" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-gold transition-colors">
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                  </a>
                  <a href="https://www.xiaohongshu.com/user/profile/commercialpress" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-gold transition-colors">
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 15.419c-.543.543-1.304.879-2.146.879H8.252c-.842 0-1.603-.336-2.146-.879-.543-.543-.879-1.304-.879-2.146V8.727c0-.842.336-1.603.879-2.146.543-.543 1.304-.879 2.146-.879h7.496c.842 0 1.603.336 2.146.879.543.543.879 1.304.879 2.146v4.546c0 .842-.336 1.603-.879 2.146z"/>
                    </svg>
                  </a>
                  <a href="https://weixin.qq.com/commercialpress" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-gold transition-colors">
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 0 1 .213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 0 0 .167-.054l1.903-1.114a.864.864 0 0 1 .717-.098 10.16 10.16 0 0 0 2.837.403c.276 0 .543-.027.811-.05-.857-2.578.157-4.972 1.932-6.446 1.703-1.415 3.882-1.98 5.853-1.838-.576-3.583-4.196-6.348-8.596-6.348zM5.785 5.991c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178A1.17 1.17 0 0 1 4.623 7.17c0-.651.52-1.18 1.162-1.18zm5.813 0c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178 1.17 1.17 0 0 1-1.162-1.178c0-.651.52-1.18 1.162-1.18zm5.34 2.867c-1.797-.052-3.746.512-5.28 1.786-1.72 1.428-2.687 3.72-1.78 6.22.942 2.453 3.666 4.229 6.884 4.229.826 0 1.622-.12 2.361-.336a.722.722 0 0 1 .598.082l1.584.926a.272.272 0 0 0 .14.047c.134 0 .24-.111.24-.247 0-.06-.023-.12-.038-.177l-.327-1.233a.582.582 0 0 1 .181-.555c1.529-1.195 2.512-2.947 2.512-4.892 0-3.59-3.284-6.444-7.075-6.85zm-2.289 3.098c.535 0 .969.44.969.984 0 .544-.434.984-.969.984a.978.978 0 0 1-.969-.984c0-.544.434-.984.969-.984zm4.633 0c.535 0 .969.44.969.984 0 .544-.434.984-.969.984a.978.978 0 0 1-.969-.984c0-.544.434-.984.969-.984z"/>
                    </svg>
                  </a>
                  </div>
                </div>

                <div className="h-px w-full max-w-sm bg-border/50" aria-hidden />

                <div className="flex flex-col items-center gap-3 text-center">
                  <p className="max-w-md text-[11px] leading-relaxed text-muted-foreground">
                    {t("footer.poweredByIpdex")}
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    <a
                      href={ipdexBrandHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded-md text-[11px] font-tech text-muted-foreground/90 hover:text-gold transition-colors"
                    >
                      IPDEX
                      <SquareArrowOutUpRight className="h-3 w-3 shrink-0 opacity-90" aria-hidden />
                    </a>
                    <a href={getIpdexSocialXUrl()} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-gold transition-colors">
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                      </svg>
                    </a>
                    <a href={getIpdexSocialFacebookUrl()} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-gold transition-colors">
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                      </svg>
                    </a>
                  </div>
                </div>
              </div>
              <PlatformSettlementRibbon variant="subtle" className="mx-auto mb-6 w-full max-w-lg shrink-0" />
              <div className="text-sm text-muted-foreground text-center">
                {t("footer.copyright")}
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
