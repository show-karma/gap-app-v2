"use client";

import { ChevronDown, Copy, ExternalLink, LogIn, LogOut, Menu, X } from "lucide-react";
import Image from "next/image";
import { Fragment, useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "@/src/components/navigation/Link";
import type { NavDropdown, NavItem } from "@/src/infrastructure/types/tenant";
import { useTenantSafe } from "@/store/tenant";
import { cn } from "@/utilities/tailwind";

function truncateAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

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
  const { authenticate: login, logout, ready, authenticated, address } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const copyAddress = useCallback(() => {
    if (!address) return;
    navigator.clipboard.writeText(address).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [address]);

  if (!tenant) {
    return (
      <nav className="sticky top-0 z-50 border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto flex h-16 max-w-7xl items-center px-4 sm:px-6">
          <div className="h-10 w-10 animate-pulse rounded-lg bg-gray-200" />
        </div>
      </nav>
    );
  }

  const claimFundsHref = tenant.navigation?.claimFundsHref;
  const showClaimFunds = authenticated && claimFundsHref;

  const socialLinks: SocialLinkItem[] = [
    tenant.navigation?.socialLinks?.twitter && {
      key: "twitter",
      label: "Twitter",
      href: tenant.navigation.socialLinks.twitter,
    },
    tenant.navigation?.socialLinks?.discord && {
      key: "discord",
      label: "Discord",
      href: tenant.navigation.socialLinks.discord,
    },
    tenant.navigation?.socialLinks?.github && {
      key: "github",
      label: "GitHub",
      href: tenant.navigation.socialLinks.github,
    },
    tenant.navigation?.socialLinks?.telegram && {
      key: "telegram",
      label: "Telegram",
      href: tenant.navigation.socialLinks.telegram,
    },
    tenant.navigation?.socialLinks?.docs && {
      key: "docs",
      label: "Docs",
      href: tenant.navigation.socialLinks.docs,
    },
  ].filter((link): link is SocialLinkItem => Boolean(link));

  return (
    <nav className="sticky top-0 z-50 border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        {/* Brand */}
        <Link href="/" className="flex flex-col items-start">
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
                src="/logo/karma-logo-light.svg"
                alt="Karma"
                width={40}
                height={20}
                className="hidden dark:block"
              />
              <Image
                src="/images/karma-logo-dark.svg"
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
            <Link
              href="/my-applications"
              className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white"
            >
              My Applications
            </Link>
          )}
          <Link
            href="/browse-applications"
            className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white"
          >
            Applications
          </Link>

          {/* Tenant nav items with Claim Funds inserted before "More" dropdown */}
          {tenant.navigation?.items?.map((item, index) => {
            const isMoreDropdown = isDropdown(item) && item.label === "More";
            return (
              <Fragment key={item.label ?? `nav-${index}`}>
                {showClaimFunds && isMoreDropdown && (
                  <Link
                    href={claimFundsHref}
                    className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white"
                  >
                    Claim Funds
                  </Link>
                )}
                {isDropdown(item) ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white">
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
                              <ExternalLink className="h-3 w-3 text-zinc-400" />
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
                    className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white"
                  >
                    {item.label}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                ) : (
                  <Link
                    href={item.href}
                    className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white"
                  >
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
              <Link
                href={claimFundsHref}
                className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white"
              >
                Claim Funds
              </Link>
            )}

          {/* Resources dropdown */}
          {socialLinks.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white">
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
                      <ExternalLink className="h-3 w-3 text-zinc-400" />
                    </a>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Separator */}
          <div className="mx-2 h-6 w-px bg-zinc-200 dark:bg-zinc-700" />

          {/* Auth / Wallet */}
          {ready &&
            (authenticated && address ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="inline-flex items-center gap-2 rounded-full bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700">
                    <span className="h-2 w-2 rounded-full bg-green-500" />
                    <span className="font-mono text-xs">{truncateAddress(address)}</span>
                    <ChevronDown className="h-3.5 w-3.5" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-[200px]">
                  <DropdownMenuItem onClick={copyAddress} className="cursor-pointer">
                    <Copy className="mr-2 h-4 w-4" />
                    {copied ? "Copied!" : "Copy Address"}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={logout}
                    className="cursor-pointer text-red-600 focus:text-red-600 dark:text-red-400 dark:focus:text-red-400"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button size="sm" onClick={login} className="rounded-full px-4">
                <LogIn className="mr-1.5 h-4 w-4" />
                Sign in
              </Button>
            ))}
        </div>

        {/* Mobile: wallet + menu toggle */}
        <div className="flex items-center gap-2 lg:hidden">
          {ready && authenticated && address && (
            <button
              onClick={copyAddress}
              className="inline-flex items-center gap-1.5 rounded-full bg-zinc-100 px-3 py-1.5 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
              <span className="font-mono">{truncateAddress(address)}</span>
            </button>
          )}
          <button
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
                href="/my-applications"
                className="block rounded-lg px-3 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
                onClick={() => setIsMenuOpen(false)}
              >
                My Applications
              </Link>
            )}
            <Link
              href="/browse-applications"
              className="block rounded-lg px-3 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
              onClick={() => setIsMenuOpen(false)}
            >
              Applications
            </Link>

            {tenant.navigation?.items?.map((item, index) => {
              const isMoreDropdown = isDropdown(item) && item.label === "More";
              return (
                <Fragment key={item.label ?? `mobile-nav-${index}`}>
                  {showClaimFunds && isMoreDropdown && (
                    <Link
                      href={claimFundsHref}
                      className="block rounded-lg px-3 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
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
                            className="flex items-center justify-between rounded-lg px-3 py-2 pl-6 text-sm text-zinc-600 transition-colors hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                          >
                            {dropdownItem.label}
                            <ExternalLink className="h-3 w-3 text-zinc-400" />
                          </a>
                        ) : (
                          <Link
                            key={dropdownItem.label}
                            href={dropdownItem.href}
                            className="block rounded-lg px-3 py-2 pl-6 text-sm text-zinc-600 transition-colors hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
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
                      className="flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
                    >
                      {item.label}
                      <ExternalLink className="h-3 w-3 text-zinc-400" />
                    </a>
                  ) : (
                    <Link
                      href={item.href}
                      className="block rounded-lg px-3 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
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
                  className="block rounded-lg px-3 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
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
                    className="flex items-center justify-between rounded-lg px-3 py-2 pl-6 text-sm text-zinc-600 transition-colors hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  >
                    {link.label}
                    <ExternalLink className="h-3 w-3 text-zinc-400" />
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Mobile auth */}
          {ready && (
            <div className="mt-3 border-t border-zinc-200 pt-3 dark:border-zinc-700">
              {authenticated && address ? (
                <Button
                  variant="ghost"
                  className="w-full justify-start text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-900/20"
                  onClick={() => {
                    logout();
                    setIsMenuOpen(false);
                  }}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </Button>
              ) : (
                <Button
                  className="w-full rounded-full"
                  size="sm"
                  onClick={() => {
                    login();
                    setIsMenuOpen(false);
                  }}
                >
                  <LogIn className="mr-1.5 h-4 w-4" />
                  Sign in
                </Button>
              )}
            </div>
          )}
        </div>
      )}
    </nav>
  );
}
