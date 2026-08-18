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
  const embed = searchParams?.get("embed");
  // "1" hides the chrome around the page. "login" goes further: the page is a
  // bare surface for the sign-in dialog, so the host site supplies the
  // backdrop and the dialog is all that shows.
  const surface = embed === "1" || embed === "login" ? embed : null;

  useEffect(() => {
    const root = document.documentElement;
    if (!surface) {
      root.removeAttribute("data-embed");
      return;
    }
    root.setAttribute("data-embed", surface);
    return () => root.removeAttribute("data-embed");
  }, [surface]);

  return null;
}
