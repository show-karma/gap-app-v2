"use client";

import { usePathname } from "next/navigation";
import { NON_PROFITS_PAGES } from "@/utilities/pages";
import { Navbar } from "./navbar";

// The /non-profits/find-funders section supplies its own navbar via its layout.
// Suppressing both the global navbar and the spacer here avoids a 64px gap above it.
export function GlobalNavbarSlot() {
  const pathname = usePathname();

  if (pathname.startsWith(NON_PROFITS_PAGES.HOME)) return null;

  return (
    <>
      <Navbar />
      <div className="h-[var(--navbar-height)]" />
    </>
  );
}
