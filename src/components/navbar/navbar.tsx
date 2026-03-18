"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/utilities/tailwind";
import { layoutTheme } from "../../helper/theme";
import { NavbarDesktopNavigation } from "./navbar-desktop-navigation";
import { NavbarPermissionsProvider } from "./navbar-permissions-context";

const NavbarMobileMenu = dynamic(
  () => import("./navbar-mobile-menu").then((m) => ({ default: m.NavbarMobileMenu })),
  {
    ssr: false,
    loading: () => (
      <div className="lg:hidden flex flex-row items-center gap-3 w-full">
        <Skeleton className="h-8 w-24" />
        <div className="flex flex-row items-center gap-2 ml-auto">
          <Skeleton className="h-9 w-20 rounded-md" />
          <Skeleton className="h-6 w-6 rounded" />
        </div>
      </div>
    ),
  }
);

export function Navbar() {
  return (
    <NavbarPermissionsProvider>
      <nav
        className={cn(
          "flex bg-background w-full items-center justify-center flex-row gap-8 max-w-full min-w-min border-b border-border z-50 fixed top-0 left-0 right-0"
        )}
      >
        <div
          className={cn(
            layoutTheme.padding,
            "flex justify-between w-full flex-row gap-8 py-3 max-w-[1920px] min-w-min items-center"
          )}
        >
          <NavbarDesktopNavigation />
          <NavbarMobileMenu />
        </div>
      </nav>
    </NavbarPermissionsProvider>
  );
}
