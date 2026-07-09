"use client";

import { usePathname } from "next/navigation";
import { NON_PROFITS_PAGES, PAGES } from "@/utilities/pages";
import { Navbar } from "./navbar";

// The /nonprofits/find-funders section supplies its own navbar via its layout.
// Suppressing both the global navbar and the spacer here avoids a 64px gap above it.
export function GlobalNavbarSlot() {
  const pathname = usePathname();

  if (pathname.startsWith(NON_PROFITS_PAGES.HOME)) return null;
  // The embedded Sanity Studio is a full-screen authoring tool with its own
  // chrome — never wrap it in the marketing navbar.
  if (pathname.startsWith(PAGES.ADMIN_STUDIO)) return null;

  return (
    <>
      <Navbar />
      <div className="h-[var(--navbar-height)]" />
    </>
  );
}
