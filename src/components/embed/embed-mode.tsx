"use client";

import { useSearchParams } from "next/navigation";
import { useEffect } from "react";

/**
 * Marks the document as embedded when the URL carries `embed=1`.
 *
 * Set on `<html>` rather than passed down as a prop because the chrome it
 * hides — the navbar, the footer, the assistant bubble — is rendered by the
 * root layout, which cannot read search params. Styling hangs off the
 * attribute (see `[data-embed="1"]` rules in styles/globals.css).
 *
 * Used by the filpgf.io landing site, which opens `/ask-karma` in an overlay:
 * the app's own header inside that panel would read as a site in a box.
 */
export function EmbedMode() {
  const searchParams = useSearchParams();
  const isEmbedded = searchParams?.get("embed") === "1";

  useEffect(() => {
    const root = document.documentElement;
    if (!isEmbedded) {
      root.removeAttribute("data-embed");
      return;
    }
    root.setAttribute("data-embed", "1");
    return () => root.removeAttribute("data-embed");
  }, [isEmbedded]);

  return null;
}
