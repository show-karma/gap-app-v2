"use client";

import { ChevronDown, Menu, X } from "lucide-react";
import Image from "next/image";
import { Fragment, useMemo, useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "@/src/components/navigation/Link";
import type { NavDropdown, NavItem } from "@/src/infrastructure/types/tenant";
import { useTenantSafe } from "@/store/tenant";
import { cn } from "@/utilities/tailwind";
import { NavbarAuthButtons } from "./navbar-auth-buttons";
import { NavbarPermissionsProvider } from "./navbar-permissions-context";
import { NavbarUserMenu } from "./navbar-user-menu";

const navStyles = {
  desktopLink:
    "rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white",
  desktopTrigger:
    "inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white",
  mobileLink:
    "block rounded-lg px-3 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800",
  mobileExternalLink:
    "flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800",
  mobileSubItem:
    "block rounded-lg px-3 py-2 pl-6 text-sm text-zinc-600 transition-colors hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800",
  mobileSubItemExternal:
    "flex items-center justify-between rounded-lg px-3 py-2 pl-6 text-sm text-zinc-600 transition-colors hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800",
};

function isDropdown(item: NavItem): item is NavDropdown {
  return "items" in item;
}

interface SocialLinkItem {
  key: string;
  label: string;
  href: string;
}

export function WhitelabelNavbar() {
  const tenant = useTenantSafe();
  const { authenticated } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const tenantSocialLinks = tenant?.navigation?.socialLinks;
  const socialLinks = useMemo<SocialLinkItem[]>(
    () =>
      [
        tenantSocialLinks?.twitter && {
          key: "twitter",
          label: "Twitter",
          href: tenantSocialLinks.twitter,
        },
        tenantSocialLinks?.discord && {
          key: "discord",
          label: "Discord",
          href: tenantSocialLinks.discord,
        },
        tenantSocialLinks?.github && {
          key: "github",
          label: "GitHub",
          href: tenantSocialLinks.github,
        },
        tenantSocialLinks?.telegram && {
          key: "telegram",
          label: "Telegram",
          href: tenantSocialLinks.telegram,
        },
        tenantSocialLinks?.docs && {
          key: "docs",
          label: "Docs",
          href: tenantSocialLinks.docs,
        },
      ].filter((link): link is SocialLinkItem => Boolean(link)),
    [tenantSocialLinks]
  );

  if (!tenant) {
    return (
      <nav className="sticky top-0 z-50 border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto flex h-16 items-center justify-between px-8 lg:px-24">
          <Skeleton className="h-8 w-8 rounded-lg" />
          <div className="hidden items-center gap-3 lg:flex">
            <Skeleton className="h-8 w-20 rounded-lg" />
            <Skeleton className="h-8 w-24 rounded-lg" />
            <Skeleton className="h-8 w-20 rounded-lg" />
            <div className="mx-2 h-6 w-px bg-zinc-200 dark:bg-zinc-700" />
            <Skeleton className="h-9 w-28 rounded-md" />
          </div>
        </div>
      </nav>
    );
  }

  const claimFundsHref = tenant.navigation?.claimFundsHref;
  const showClaimFunds = authenticated && claimFundsHref;

  return (
    <NavbarPermissionsProvider>
      <nav className="sticky top-0 z-50 border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto flex h-16 items-center justify-between px-8 lg:px-24">
          {/* Brand */}
          <Link href={"/"} className="flex flex-col items-start">
            <div className="flex items-center gap-2">
              {tenant.assets?.logo ? (
                tenant.assets.logoDark ? (
                  <>
                    <Image
                      src={tenant.assets.logo}
                      alt={tenant.name}
                      width={40}
                      height={40}
                      {...tenant.navigation?.header?.logo}
                      className={cn(
                        "h-8 w-8 object-cover dark:hidden",
                        tenant.navigation?.header?.logo?.className
                      )}
                    />
                    <Image
                      src={tenant.assets.logoDark}
                      alt={tenant.name}
                      width={40}
                      height={40}
                      {...tenant.navigation?.header?.logo}
                      className={cn(
                        "hidden h-8 w-8 object-cover dark:block",
                        tenant.navigation?.header?.logo?.className
                      )}
                    />
                  </>
                ) : (
                  <Image
                    src={tenant.assets.logo}
                    alt={tenant.name}
                    width={40}
                    height={40}
                    {...tenant.navigation?.header?.logo}
                    className={cn(
                      "h-8 w-8 rounded-full object-contain",
                      tenant.navigation?.header?.logo?.className
                    )}
                  />
                )
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">
                  {tenant.name?.[0] || "C"}
                </div>
              )}
              {tenant.navigation?.header?.shouldHaveTitle && (
                <p className="text-lg font-semibold text-zinc-900 dark:text-white">
                  {tenant.navigation?.header?.title || "Grants Council"}
                </p>
              )}
            </div>
            {tenant.navigation?.header?.poweredBy && (
              <div className="flex w-full items-center justify-end gap-1">
                <span className="text-xs text-zinc-500 dark:text-zinc-400">Powered by</span>
                <Image
                  src="/images/karma-logo-dark.svg"
                  alt="Karma"
                  width={40}
                  height={20}
                  className="hidden dark:block"
                />
                <Image
                  src="/logo/karma-logo-light.svg"
                  alt="Karma"
                  width={40}
                  height={20}
                  className="block dark:hidden"
                />
              </div>
            )}
          </Link>

          {/* Desktop Nav */}
          <div className="hidden items-center gap-1 lg:flex">
            {/* My Applications - first when authenticated (matching reference) */}
            {authenticated && (
              <Link href={"/dashboard"} className={navStyles.desktopLink}>
                Dashboard
              </Link>
            )}
            {tenant.navigation?.showBrowseApplications !== false && (
              <Link href={"/browse-applications"} className={navStyles.desktopLink}>
                Applications
              </Link>
            )}

            {/* Tenant nav items with Claim Funds inserted before "More" dropdown */}
            {tenant.navigation?.items?.map((item, index) => {
              const isMoreDropdown = isDropdown(item) && item.label === "More";
              return (
                <Fragment key={item.label ?? `nav-${index}`}>
                  {showClaimFunds && isMoreDropdown && (
                    <Link href={claimFundsHref} className={navStyles.desktopLink}>
                      Claim Funds
                    </Link>
                  )}
                  {isDropdown(item) ? (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button type="button" className={navStyles.desktopTrigger}>
                          {item.label}
                          <ChevronDown className="h-3.5 w-3.5" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="min-w-[180px]">
                        {item.items.map((dropdownItem) => (
                          <DropdownMenuItem key={dropdownItem.label} asChild>
                            {dropdownItem.isExternal ? (
                              <a
                                href={dropdownItem.href}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-between"
                              >
                                {dropdownItem.label}
                              </a>
                            ) : (
                              <Link href={dropdownItem.href}>{dropdownItem.label}</Link>
                            )}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : "isExternal" in item && item.isExternal ? (
                    <a
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={navStyles.desktopTrigger}
                    >
                      {item.label}
                    </a>
                  ) : (
                    <Link href={item.href} className={navStyles.desktopLink}>
                      {item.label}
                    </Link>
                  )}
                </Fragment>
              );
            })}

            {/* Show Claim Funds at end if no "More" dropdown exists */}
            {showClaimFunds &&
              !tenant.navigation?.items?.some(
                (item) => isDropdown(item) && item.label === "More"
              ) && (
                <Link href={claimFundsHref} className={navStyles.desktopLink}>
                  Claim Funds
                </Link>
              )}

            {/* Resources dropdown */}
            {socialLinks.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button type="button" className={navStyles.desktopTrigger}>
                    Resources
                    <ChevronDown className="h-3.5 w-3.5" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-[160px]">
                  {socialLinks.map((link) => (
                    <DropdownMenuItem key={link.key} asChild>
                      <a
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between"
                      >
                        {link.label}
                      </a>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* Separator */}
            <div className="mx-2 h-6 w-px bg-zinc-200 dark:bg-zinc-700" />

            {/* Auth — reuse main app components */}
            {authenticated ? <NavbarUserMenu /> : <NavbarAuthButtons />}
          </div>

          {/* Mobile: menu toggle */}
          <div className="flex items-center gap-2 lg:hidden">
            <button
              type="button"
              className="rounded-lg p-2 text-zinc-600 transition-colors hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label="Toggle menu"
            >
              {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {isMenuOpen && (
          <div className="border-t border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900 lg:hidden">
            <div className="space-y-1">
              {authenticated && (
                <Link
                  href={"/dashboard"}
                  className={navStyles.mobileLink}
                  onClick={() => setIsMenuOpen(false)}
                >
                  Dashboard
                </Link>
              )}
              {tenant.navigation?.showBrowseApplications !== false && (
                <Link
                  href={"/browse-applications"}
                  className={navStyles.mobileLink}
                  onClick={() => setIsMenuOpen(false)}
                >
                  Applications
                </Link>
              )}

              {tenant.navigation?.items?.map((item, index) => {
                const isMoreDropdown = isDropdown(item) && item.label === "More";
                return (
                  <Fragment key={item.label ?? `mobile-nav-${index}`}>
                    {showClaimFunds && isMoreDropdown && (
                      <Link
                        href={claimFundsHref}
                        className={navStyles.mobileLink}
                        onClick={() => setIsMenuOpen(false)}
                      >
                        Claim Funds
                      </Link>
                    )}
                    {isDropdown(item) ? (
                      <div className="space-y-1 py-1">
                        <span className="block px-3 text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                          {item.label}
                        </span>
                        {item.items.map((dropdownItem) =>
                          dropdownItem.isExternal ? (
                            <a
                              key={dropdownItem.label}
                              href={dropdownItem.href}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={navStyles.mobileSubItemExternal}
                            >
                              {dropdownItem.label}
                            </a>
                          ) : (
                            <Link
                              key={dropdownItem.label}
                              href={dropdownItem.href}
                              className={navStyles.mobileSubItem}
                              onClick={() => setIsMenuOpen(false)}
                            >
                              {dropdownItem.label}
                            </Link>
                          )
                        )}
                      </div>
                    ) : "isExternal" in item && item.isExternal ? (
                      <a
                        href={item.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={navStyles.mobileExternalLink}
                      >
                        {item.label}
                      </a>
                    ) : (
                      <Link
                        href={item.href}
                        className={navStyles.mobileLink}
                        onClick={() => setIsMenuOpen(false)}
                      >
                        {item.label}
                      </Link>
                    )}
                  </Fragment>
                );
              })}

              {showClaimFunds &&
                !tenant.navigation?.items?.some(
                  (item) => isDropdown(item) && item.label === "More"
                ) && (
                  <Link
                    href={claimFundsHref}
                    className={navStyles.mobileLink}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Claim Funds
                  </Link>
                )}

              {/* Social links in mobile */}
              {socialLinks.length > 0 && (
                <div className="space-y-1 border-t border-zinc-200 pt-2 dark:border-zinc-700">
                  <span className="block px-3 text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                    Resources
                  </span>
                  {socialLinks.map((link) => (
                    <a
                      key={link.key}
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={navStyles.mobileSubItemExternal}
                    >
                      {link.label}
                    </a>
                  ))}
                </div>
              )}
            </div>

            {/* Mobile auth — reuse main app components */}
            <div className="mt-3 border-t border-zinc-200 pt-3 dark:border-zinc-700">
              {authenticated ? <NavbarUserMenu /> : <NavbarAuthButtons />}
            </div>
          </div>
        )}
      </nav>
    </NavbarPermissionsProvider>
  );
}
