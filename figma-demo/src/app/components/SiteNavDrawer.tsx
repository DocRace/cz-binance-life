import { Link, useLocation } from "react-router";
import { Users, List, User, Home, Clock, MapPin, Trophy } from "lucide-react";
import { motion } from "motion/react";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "./LanguageSwitcher";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "./ui/sheet";

export type SiteNavItem = {
  path: string;
  label: string;
  icon: typeof Home;
  match: (pathname: string) => boolean;
};

export function useSiteNavItems(): SiteNavItem[] {
  const { t } = useTranslation();
  return [
    { path: "/", label: t("nav.home"), icon: Home, match: (p) => p === "/" },
    { path: "/club", label: t("nav.joinClub"), icon: Users, match: (p) => p === "/club" },
    {
      path: "/club/chronicle",
      label: t("nav.chronicle"),
      icon: Trophy,
      match: (p) => p === "/club/chronicle" || p.startsWith("/club/chronicle"),
    },
    { path: "/event", label: t("nav.offlineEvent"), icon: MapPin, match: (p) => p === "/event" },
    { path: "/principles", label: t("nav.principles"), icon: List, match: (p) => p === "/principles" },
    { path: "/timeline", label: t("nav.timeline"), icon: Clock, match: (p) => p === "/timeline" },
    { path: "/account", label: t("nav.account"), icon: User, match: (p) => p.startsWith("/account") },
  ];
}

type SiteNavDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Unique layoutId so desktop Layout + H5 chronicle drawers don't clash animations. */
  layoutId?: string;
  /** Show language switcher inside the drawer (default true). */
  showLanguageSwitcher?: boolean;
};

/** Right-side sheet with the same tab list as the mobile site header menu. */
export function SiteNavDrawer({
  open,
  onOpenChange,
  layoutId = "activeMobileNav",
  showLanguageSwitcher = true,
}: SiteNavDrawerProps) {
  const { t } = useTranslation();
  const location = useLocation();
  const navItems = useSiteNavItems();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-[min(100%,20rem)] flex-col gap-6 border-border/50 bg-background/95 pt-14"
        aria-describedby={undefined}
      >
        <SheetHeader className="border-b border-border/40 px-5 pb-4 text-left">
          <SheetTitle className="font-display text-lg">{t("nav.siteTitle")}</SheetTitle>
        </SheetHeader>
        <nav
          className="mx-4 flex flex-col gap-0.5 rounded-2xl border border-border/40 bg-muted/35 p-1.5 shadow-inner backdrop-blur-md"
          aria-label={t("nav.menuLabel")}
        >
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.match(location.pathname);
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => onOpenChange(false)}
                className={`relative flex min-w-0 items-center gap-3 rounded-full px-3.5 py-2.5 text-sm transition-colors duration-300 ${
                  isActive ? "text-gold" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {isActive ? (
                  <motion.div
                    layoutId={layoutId}
                    className="absolute inset-0 rounded-full bg-gold/12 ring-1 ring-gold/35"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                ) : null}
                <Icon className="relative h-4 w-4 shrink-0 text-current" />
                <span className="relative min-w-0 flex-1 text-balance leading-snug">{item.label}</span>
              </Link>
            );
          })}
        </nav>
        {showLanguageSwitcher ? (
          <div className="relative z-[1] mx-4 border-t border-border/40 pt-4">
            <LanguageSwitcher />
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

type SiteNavMenuButtonProps = {
  onClick: () => void;
  open?: boolean;
  className?: string;
};

export function SiteNavMenuButton({ onClick, open = false, className = "" }: SiteNavMenuButtonProps) {
  const { t } = useTranslation();
  return (
    <button
      type="button"
      className={`shrink-0 p-2 text-muted-foreground transition-colors hover:text-foreground ${className}`}
      aria-label={t("nav.openMenu")}
      aria-expanded={open}
      onClick={onClick}
    >
      <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
      </svg>
    </button>
  );
}
