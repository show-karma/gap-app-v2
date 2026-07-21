"use client";

import { usePathname } from "next/navigation";
import { isDonorResearchTokenRoute, NON_PROFITS_PAGES } from "@/utilities/pages";
import { Footer } from "./footer";
import { WhitelabelFooter } from "./whitelabel-footer";

export function FooterSwitcher({ isWhitelabel }: { isWhitelabel: boolean }) {
  const pathname = usePathname();

  if (isWhitelabel) return <WhitelabelFooter />;
  if (pathname.startsWith(NON_PROFITS_PAGES.HOME)) return null;
  // Anonymous donor-research token pages carry their own slim chrome.
  if (isDonorResearchTokenRoute(pathname)) return null;
  // In-app sidebar layouts (community manage, nonprofit research) also get the
  // platform footer: their rails are shell-scoped (SIDEBAR_BELOW_NAVBAR_CLASSES),
  // not viewport-fixed, so the footer renders full-width below them.
  return <Footer />;
}
