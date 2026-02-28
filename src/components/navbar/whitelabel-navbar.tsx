"use client";

import Image from "next/image";
import { Fragment, useState } from "react";
import { Link } from "@/src/components/navigation/Link";
import type { NavDropdown, NavItem } from "@/src/infrastructure/types/tenant";
import { useTenantSafe } from "@/store/tenant";
import { cn } from "@/utilities/tailwind";

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
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  if (!tenant) {
    return (
      <nav className="sticky top-0 z-50 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center">
          <div className="w-10 h-10 rounded-lg bg-gray-200 animate-pulse" />
        </div>
      </nav>
    );
  }

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
    <nav className="sticky top-0 z-50 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
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
                      "w-8 h-8 object-cover dark:hidden",
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
                      "w-8 h-8 object-cover dark:block hidden",
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
                    "w-8 h-8 object-contain rounded-full",
                    tenant.navigation?.header?.logo?.className
                  )}
                />
              )
            ) : (
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm bg-primary">
                {tenant.name?.[0] || "C"}
              </div>
            )}
            {tenant.navigation?.header?.shouldHaveTitle && (
              <p className="font-semibold text-lg text-zinc-900 dark:text-white">
                {tenant.navigation?.header?.title || "Grants Council"}
              </p>
            )}
          </div>
          {tenant.navigation?.header?.poweredBy && (
            <div className="flex items-center justify-end w-full gap-1">
              <span className="text-xs text-zinc-500 dark:text-zinc-400">Powered by</span>
              <Image
                src="/images/karma-logo-white.svg"
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
        <div className="hidden lg:flex items-center gap-6">
          <Link href="/browse-applications" className="text-zinc-600 dark:text-zinc-200 text-base">
            Applications
          </Link>
          {tenant.navigation?.items?.map((item, index) => (
            <Fragment key={item.label ?? `nav-${index}`}>
              {isDropdown(item) ? (
                <div className="relative">
                  <button
                    className="text-zinc-600 dark:text-zinc-200 text-base flex items-center gap-1"
                    onClick={() => setOpenDropdown(openDropdown === item.label ? null : item.label)}
                    onBlur={() => setTimeout(() => setOpenDropdown(null), 200)}
                  >
                    {item.label}
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </button>
                  {openDropdown === item.label && (
                    <div className="absolute top-full mt-1 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-lg py-1 min-w-[200px] z-50">
                      {item.items.map((dropdownItem) => (
                        <a
                          key={dropdownItem.label}
                          href={dropdownItem.href}
                          target={dropdownItem.isExternal ? "_blank" : undefined}
                          rel={dropdownItem.isExternal ? "noopener noreferrer" : undefined}
                          className="block px-4 py-2 text-sm text-zinc-600 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-700"
                        >
                          {dropdownItem.label}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              ) : "isExternal" in item && item.isExternal ? (
                <a
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-zinc-600 dark:text-zinc-200 text-base"
                >
                  {item.label}
                </a>
              ) : (
                <Link href={item.href} className="text-zinc-600 dark:text-zinc-200 text-base">
                  {item.label}
                </Link>
              )}
            </Fragment>
          ))}
          {socialLinks.length > 0 && (
            <div className="relative">
              <button
                className="text-zinc-600 dark:text-zinc-200 text-base flex items-center gap-1"
                onClick={() => setOpenDropdown(openDropdown === "resources" ? null : "resources")}
                onBlur={() => setTimeout(() => setOpenDropdown(null), 200)}
              >
                Resources
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>
              {openDropdown === "resources" && (
                <div className="absolute top-full right-0 mt-1 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-lg py-1 min-w-[160px] z-50">
                  {socialLinks.map((link) => (
                    <a
                      key={link.key}
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block px-4 py-2 text-sm text-zinc-600 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-700"
                    >
                      {link.label}
                    </a>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Mobile menu toggle */}
        <button
          className="lg:hidden p-2 text-zinc-600 dark:text-zinc-200"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          aria-label="Toggle menu"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            {isMenuOpen ? (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            ) : (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile menu */}
      {isMenuOpen && (
        <div className="lg:hidden border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-4 space-y-3">
          <Link
            href="/browse-applications"
            className="block text-zinc-700 dark:text-zinc-200"
            onClick={() => setIsMenuOpen(false)}
          >
            Applications
          </Link>
          {tenant.navigation?.items?.map((item, index) => (
            <Fragment key={item.label ?? `mobile-nav-${index}`}>
              {isDropdown(item) ? (
                <div className="space-y-2">
                  <span className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">
                    {item.label}
                  </span>
                  {item.items.map((dropdownItem) => (
                    <a
                      key={dropdownItem.label}
                      href={dropdownItem.href}
                      target={dropdownItem.isExternal ? "_blank" : undefined}
                      rel={dropdownItem.isExternal ? "noopener noreferrer" : undefined}
                      className="block pl-4 text-zinc-700 dark:text-zinc-200"
                    >
                      {dropdownItem.label}
                    </a>
                  ))}
                </div>
              ) : (
                <Link
                  href={(item as { href: string }).href}
                  className="block text-zinc-700 dark:text-zinc-200"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {item.label}
                </Link>
              )}
            </Fragment>
          ))}
        </div>
      )}
    </nav>
  );
}
