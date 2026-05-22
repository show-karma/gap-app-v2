"use client";

import { usePathname } from "next/navigation";
import { Navbar } from "./navbar";

/**
 * Renders the global app navbar plus the fixed-navbar spacer for non-whitelabel
 * routes — except the /non-profits section, which supplies its own dedicated
 * navbar via app/non-profits/layout.tsx. Suppressing both the navbar and the
 * spacer here avoids a 64px gap above the standalone "Grow Nonprofit" nav.
 */
export function GlobalNavbarSlot() {
  const pathname = usePathname();

  if (pathname.startsWith("/non-profits")) return null;

  return (
    <>
      <Navbar />
      <div className="h-[var(--navbar-height)]" />
    </>
  );
}
