/** Site chrome (header / footer) — below all overlays. */
export const Z_SITE_CHROME = 40;

/** Full-screen modal / sheet backdrop (blur dimmer). */
export const Z_OVERLAY_BACKDROP = 200;

/** Modal panels, sheets, dialogs (above backdrop). */
export const Z_OVERLAY_PANEL = 210;

/** Popovers, dropdowns, selects (above modal panels when open). */
export const Z_FLOATING = 220;

/** Toasts — above floating UI. */
export const Z_TOAST = 230;

export const overlayBackdropClass =
  "fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm";

export const overlayBackdropClassLight =
  "fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm";
