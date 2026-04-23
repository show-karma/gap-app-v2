"use client";

// Side-effect import: evaluates `@show-karma/karma-gap-sdk` via its main entry
// (`core/index.js`), which loads `class/GAP` first and primes the `Schema` /
// `GapSchema` / `Attestation` module graph in the safe order. Without this,
// pages whose first SDK touch is a deep import into
// `core/class/entities/ProjectMilestone` (e.g. `hooks/useMilestone.ts` on
// `/community/:slug/updates`) hit a CJS circular dependency and crash with:
//   "Class extends value undefined is not a constructor or null"
// This mirrors the same priming added to `whitelabel-navbar.tsx` in d8e1e67d:
// the main navbar was assumed to prime the SDK transitively, but in a
// production build the dynamic imports below can split chunks in a way that
// lets the page's deep import evaluate first. Keep this before other
// SDK-touching imports so Turbopack evaluates it first.
import "@show-karma/karma-gap-sdk";

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
            "flex justify-between w-full flex-row gap-8 h-16 max-w-[1920px] min-w-min items-center"
          )}
        >
          <NavbarDesktopNavigation />
          <NavbarMobileMenu />
        </div>
      </nav>
    </NavbarPermissionsProvider>
  );
}
