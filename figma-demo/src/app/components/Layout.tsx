import { Outlet, Link, useLocation } from "react-router";
import { useState } from "react";
import { motion } from "motion/react";
import { useTranslation } from "react-i18next";
import bookCover from "../../assets/book-cover-hero.png";
import LanguageSwitcher from "./LanguageSwitcher";
import { SiteNavDrawer, SiteNavMenuButton, useSiteNavItems } from "./SiteNavDrawer";
import { Toaster } from "sonner";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { SITE_HEADER_X } from "../layout/pageLayout";


export default function Layout() {
  const location = useLocation();
  const { t } = useTranslation();
  useDocumentTitle();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  /** Viral H5 shell: no site chrome (nav / footer / partner strip). */
  const isH5Shell =
    location.pathname === "/club/chronicle" ||
    location.pathname.startsWith("/club/chronicle/") ||
    location.pathname.startsWith("/s/");

  const navItems = useSiteNavItems();

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Background effects */}
      {!isH5Shell ? (
        <>
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
              backgroundSize: "50px 50px",
            }}
          />
        </>
      ) : null}

      {/* Header */}
      {!isH5Shell ? (
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
                  const isActive = item.match(location.pathname);
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

            <SiteNavMenuButton
              className="-mr-1 lg:hidden"
              open={mobileNavOpen}
              onClick={() => setMobileNavOpen(true)}
            />
          </div>
        </div>
      </motion.header>
      ) : null}

      {!isH5Shell ? (
        <SiteNavDrawer open={mobileNavOpen} onOpenChange={setMobileNavOpen} />
      ) : null}

      {/* Main content */}
      <main className={`relative ${isH5Shell ? "min-h-dvh" : ""}`}>
        <Outlet />
        <Toaster richColors position="top-center" toastOptions={{ className: "z-[230]" }} style={{ zIndex: 230 }} />
      </main>

    </div>
  );
}
