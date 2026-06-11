/**
 * Shared page layout primitives — one width / spacing scale across marketing pages.
 * Import these class strings instead of ad-hoc max-w-* and mb-* per section.
 */

/** Page shells / footer horizontal inset (avoid Tailwind `container` breakpoint drift). */
export const SITE_CONTAINER_X = "mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8";

/**
 * Navbar: matches body inset up to max-w-6xl, then widens on xl+ so nav tabs have room.
 */
export const SITE_HEADER_X =
  "mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8 xl:max-w-7xl 2xl:max-w-[88rem]";

export const PAGE_SHELL = `${SITE_CONTAINER_X} py-20`;

export const PAGE_SHELL_HOME = `${SITE_CONTAINER_X} py-24 md:py-32`;

/** Standard vertical rhythm between sections */
export const SECTION_SPACING = "mb-20 md:mb-24";

/** Hero / tier blocks on home — slightly more breathing room */
export const SECTION_SPACING_LG = "mb-28 md:mb-36";

export const CONTENT_NARROW = "mx-auto w-full max-w-3xl";

export const CONTENT_PROSE = "mx-auto w-full max-w-4xl";

export const CONTENT_DEFAULT = "mx-auto w-full max-w-5xl";

export const CONTENT_WIDE = "mx-auto w-full max-w-6xl";

export const GRID_GAP = "gap-6 md:gap-8";

export const PAGE_HEADER = "mb-20 text-center md:mb-24";

export const CARD_SURFACE =
  "rounded-2xl border border-border/50 bg-card/30 backdrop-blur-sm";

export const CARD_SURFACE_SOFT =
  "rounded-2xl border border-border/50 bg-card/20 backdrop-blur-sm";

export const CARD_HOVER =
  "transition-colors duration-500 hover:border-gold/25";
