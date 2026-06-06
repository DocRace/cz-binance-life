import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

/** Render overlays at document.body so they sit above layout chrome stacking contexts. */
export default function OverlayPortal({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;
  return createPortal(children, document.body);
}
