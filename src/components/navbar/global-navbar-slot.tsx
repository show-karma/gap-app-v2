"use client";

import { usePathname } from "next/navigation";
import { isDonorResearchTokenRoute, NON_PROFITS_PAGES, PAGES } from "@/utilities/pages";
import { Navbar } from "./navbar";

// The /nonprofits/find-funders section supplies its own navbar via its layout.
// Suppressing both the global navbar and the spacer here avoids a 64px gap above it.
// Donor-research token pages (shared report / diligence response) are anonymous,
// outward-facing documents with their own slim chrome (TokenPageShell).
export function GlobalNavbarSlot() {
  const pathname = usePathname();

  if (pathname.startsWith(NON_PROFITS_PAGES.HOME)) return null;
  // The embedded Sanity Studio is a full-screen authoring tool with its own
  // chrome — never wrap it in the marketing navbar.
  if (pathname.startsWith(PAGES.ADMIN_STUDIO)) return null;
  if (isDonorResearchTokenRoute(pathname)) return null;

  return (
    <>
      <Navbar />
      <div className="h-[var(--navbar-height)]" />
    </>
  );
}
