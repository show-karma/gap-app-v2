"use client";

/**
 * NonProfitsNavbar — dedicated top nav for the /non-profits/find-funders section.
 *
 * Ported from grant-atlas src/components/landing-nav.tsx (the navbar shown on
 * karmagrants.org). Adaptations for gap-app-v2:
 * - Brand: "Karma Find Funders" — the Karma logo (next/image) sits in for the original mark.
 * - Router/links: TanStack Router → next/link + NON_PROFITS_PAGES constants.
 * - Homepage detection: useMatch → usePathname.
 * - Theme: grant-atlas ThemeProvider → next-themes.
 * - Auth: grant-atlas useAuth → gap-app-v2 @/hooks/useAuth (Privy).
 * - Bookmarks: research-tray store → useResearchTray React Query hook.
 *
 * Styling uses the lp-* classes in styles/non-profits-landing.css. The CSS
 * variables live on the `.landing` wrapper provided by app/non-profits/layout.tsx.
 */

import { Bookmark, HelpCircle, Moon, Sun } from "lucide-react";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import {
  NavbarPermissionsProvider,
  useNavbarPermissions,
} from "@/src/components/navbar/navbar-permissions-context";
import { NavbarUserSkeleton } from "@/src/components/navbar/navbar-user-skeleton";
import { NON_PROFITS_PAGES } from "@/utilities/pages";
import { useResearchTray } from "../hooks/use-research-tray";
import { FILINGS_STATS } from "../lib/stats";
import { BookmarksDrawer } from "./bookmarks-drawer";
import { HelpModal } from "./help-modal";

// Loaded the same way as the homepage navbar (ssr: false) so the account
// dropdown is identical and never renders on the server — this avoids the
// hydration mismatch a direct import causes when auth state differs between
// SSR and the first client render.
const NavbarUserMenu = dynamic(
  () =>
    import("@/src/components/navbar/navbar-user-menu").then((m) => ({
      default: m.NavbarUserMenu,
    })),
  { ssr: false, loading: () => <NavbarUserSkeleton /> }
);

// ── Brand ─────────────────────────────────────────────────────────────────────

function BrandMark() {
  return (
    <span className="lp-brand">
      <Image
        className="block h-7 w-auto dark:hidden"
        src="/logo/karma-logo-light.svg"
        alt="Karma"
        width={127}
        height={32}
        priority
      />
      <Image
        className="hidden h-7 w-auto dark:block"
        src="/logo/karma-logo-dark.svg"
        alt="Karma"
        width={127}
        height={32}
        priority
      />
    </span>
  );
}

// ── Auth area ─────────────────────────────────────────────────────────────────

/**
 * Reuses the main app navbar's user menu so the account dropdown is identical to
 * the one on the homepage. Must render inside <NavbarPermissionsProvider> — that
 * is what NavbarUserMenu reads for its auth/permission state.
 *
 * NavbarUserMenu renders its own loading skeleton (not ready) and returns null
 * when logged out, so the lp-styled "Sign in" button only appears once auth is
 * ready and the user is signed out.
 */
function AuthArea({ onLogin }: { onLogin: () => void }) {
  const { ready, isLoggedIn } = useNavbarPermissions();

  return (
    <>
      <NavbarUserMenu />
      {ready && !isLoggedIn && (
        <button className="lp-btn lp-btn-primary" onClick={onLogin} type="button">
          Sign in
        </button>
      )}
    </>
  );
}

// ── Navbar ────────────────────────────────────────────────────────────────────

export function NonProfitsNavbar() {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const { authenticated, login } = useAuth();
  const pathname = usePathname();
  const isHomepage = pathname === NON_PROFITS_PAGES.HOME;
  const { data: bookmarks = [] } = useResearchTray();
  const bookmarkCount = bookmarks.length;
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = (resolvedTheme ?? theme) === "dark";
  const toggleTheme = () => setTheme(isDark ? "light" : "dark");

  return (
    <>
      <nav className="lp-nav">
        <div className="lp-container lp-nav-inner">
          <Link href={NON_PROFITS_PAGES.HOME} aria-label="Karma Find Funders home">
            <BrandMark />
          </Link>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {/* Marketing links — only on the landing page */}
            {isHomepage && (
              <div className="lp-nav-links" style={{ marginRight: 8 }}>
                <a className="lp-nav-link" href="#how">
                  How it works
                </a>
                <a className="lp-nav-link" href="#connector">
                  Claude / ChatGPT
                </a>
                <a className="lp-nav-link" href="#audience">
                  Who it&apos;s for
                </a>
                <a className="lp-nav-link" href="#connector">
                  API
                </a>
              </div>
            )}

            <div className="lp-nav-status">
              <span className="lp-status-dot" />
              <span>{FILINGS_STATS.indexedLabel}</span>
            </div>

            {/* Help */}
            <button
              className="lp-icon-btn"
              onClick={() => setHelpOpen(true)}
              aria-label="Help"
              type="button"
            >
              <HelpCircle className="size-4" />
            </button>

            {/* Bookmarks — authenticated, off the landing page */}
            {authenticated && !isHomepage && (
              <button
                type="button"
                onClick={() => setDrawerOpen(true)}
                aria-label="Open bookmarks"
                className="lp-icon-btn relative"
              >
                <Bookmark
                  className={`size-4 ${bookmarkCount > 0 ? "fill-amber-500 stroke-amber-600" : ""}`}
                />
                {bookmarkCount > 0 && (
                  <span className="lp-bookmark-badge">
                    {bookmarkCount > 9 ? "9+" : bookmarkCount}
                  </span>
                )}
              </button>
            )}

            {/* Theme toggle */}
            <button
              className="lp-icon-btn"
              onClick={toggleTheme}
              aria-label="Toggle theme"
              type="button"
            >
              {mounted ? (
                isDark ? (
                  <Sun className="size-4" />
                ) : (
                  <Moon className="size-4" />
                )
              ) : (
                <span className="size-4" />
              )}
            </button>

            {/* Auth — same account menu as the homepage navbar */}
            <NavbarPermissionsProvider>
              <AuthArea onLogin={login} />
            </NavbarPermissionsProvider>
          </div>
        </div>
      </nav>

      {authenticated && <BookmarksDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />}
      <HelpModal open={helpOpen} onClose={() => setHelpOpen(false)} />
    </>
  );
}
