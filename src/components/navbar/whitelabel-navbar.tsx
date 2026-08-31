"use client";

// Side-effect import: evaluates `@show-karma/karma-gap-sdk` via its main entry
// (`core/index.js`), which loads `class/GAP` first and primes the `Schema` /
// `GapSchema` / `Attestation` module graph in the safe order. Without this,
// whitelabel pages whose first SDK touch is a deep import into
// `core/class/entities/ProjectMilestone` (e.g. `hooks/useMilestone.ts`) hit a
// CJS circular dependency and crash with:
//   "Class extends value undefined is not a constructor or null"
// The main-site navbar happens to prime the SDK transitively; this restores
// parity for the slim whitelabel shell. Keep before the other SDK-touching
// imports in this file so Turbopack evaluates it first.
import "@show-karma/karma-gap-sdk";

import { ChevronDown, Menu, X } from "lucide-react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { useIdentityHint } from "@/hooks/useIdentityHint";
import { Link } from "@/src/components/navigation/Link";
import { getDomainInfo } from "@/src/infrastructure/config/domain-constants";
import type {
  TenantConfig,
  TenantHeaderWordmark,
  TenantNavigation,
} from "@/src/infrastructure/types/tenant";
import { useTenantSafe } from "@/store/tenant";
import { karmaLinks } from "@/utilities/karma/karma";
import { PAGES } from "@/utilities/pages";
import { cn } from "@/utilities/tailwind";
import { useWhitelabel } from "@/utilities/whitelabel-context";
import { NavbarAssistantButton } from "./navbar-assistant-button";
import { NavbarAuthButtons } from "./navbar-auth-buttons";
import { navStyles } from "./navbar-nav-item-styles";
import { NavbarPermissionsProvider } from "./navbar-permissions-context";
import { NavbarSearch } from "./navbar-search";
import { DesktopTenantNavItems, MobileTenantNavItems } from "./navbar-tenant-nav-items";
import { NavbarUserMenu } from "./navbar-user-menu";
import { ThemeToggleButton } from "./theme-toggle-button";

/** Menu name for the social links when the tenant does not give one. */
const DEFAULT_SOCIAL_LINKS_LABEL = "Resources";

interface SocialLinkItem {
  key: string;
  label: string;
  href: string;
}

function buildSocialLinks(
  socialLinks: TenantNavigation["socialLinks"],
  labels: TenantNavigation["socialLinkLabels"]
): SocialLinkItem[] {
  return [
    socialLinks?.twitter && {
      key: "twitter",
      label: labels?.twitter ?? "Twitter",
      href: socialLinks.twitter,
    },
    socialLinks?.discord && {
      key: "discord",
      label: labels?.discord ?? "Discord",
      href: socialLinks.discord,
    },
    socialLinks?.github && {
      key: "github",
      label: labels?.github ?? "GitHub",
      href: socialLinks.github,
    },
    socialLinks?.telegram && {
      key: "telegram",
      label: labels?.telegram ?? "Telegram",
      href: socialLinks.telegram,
    },
    socialLinks?.docs && {
      key: "docs",
      label: labels?.docs ?? "Docs",
      href: socialLinks.docs,
    },
    {
      key: "skills",
      label: "Skills",
      href: karmaLinks.skills,
    },
  ].filter((link): link is SocialLinkItem => Boolean(link));
}

function BrandPoweredBy() {
  return (
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
  );
}

function BrandWordmark({ wordmark }: { wordmark: TenantHeaderWordmark }) {
  const { prefix, accent, suffix, accentColor, accentColorDark } = wordmark;
  return (
    <span className="font-mono text-lg font-semibold tracking-tight text-zinc-900 dark:text-white">
      {prefix}
      {accentColorDark ? (
        <>
          <span className="dark:hidden" style={{ color: accentColor }}>
            {accent}
          </span>
          <span className="hidden dark:inline" style={{ color: accentColorDark }}>
            {accent}
          </span>
        </>
      ) : (
        <span style={{ color: accentColor }}>{accent}</span>
      )}
      {suffix}
    </span>
  );
}

/**
 * The wordmark is a per-domain brand, but tenant config is per-tenant and a
 * tenant can serve several domains (filecoin serves both app.filpgf.io and
 * grants.filecoin.io). `wordmark.domains` lists the production domains the
 * wordmark belongs to; anywhere else the tenant keeps its logo + title brand.
 * Domains injected via WHITELABEL_EXTRA_DOMAINS_JSON (dev, previews) are absent
 * from DOMAIN_CONFIGS, so they are not production hosts and still show the
 * wordmark — otherwise it could never be reviewed outside production.
 */
function useDomainScopedWordmark(tenant: TenantConfig): TenantHeaderWordmark | undefined {
  const { config } = useWhitelabel();
  const wordmark = tenant.navigation?.header?.wordmark;
  const servingDomain = config?.domain;

  if (!wordmark?.domains?.length) return wordmark;
  if (!servingDomain) return wordmark;
  if (wordmark.domains.includes(servingDomain)) return wordmark;

  return getDomainInfo(servingDomain)?.isProduction ? undefined : wordmark;
}

/* The accent renders twice — one span per color scheme — so the anchor carries
   an aria-label and the duplicated glyphs stay out of the accessible name. */
/** Brand slot: a tenant text wordmark linking to the tenant's own site when configured, otherwise the tenant logo + title linking to the app root. */
function NavbarBrand({ tenant }: { tenant: TenantConfig }) {
  const wordmark = useDomainScopedWordmark(tenant);

  return wordmark ? (
    <a
      href={wordmark.href}
      aria-label={
        wordmark.ariaLabel ?? `${wordmark.prefix}${wordmark.accent}${wordmark.suffix ?? ""}`
      }
      className="flex shrink-0 flex-col items-start"
    >
      <BrandWordmark wordmark={wordmark} />
      {tenant.navigation?.header?.poweredBy && <BrandPoweredBy />}
    </a>
  ) : (
    <Link href={"/"} className="flex shrink-0 flex-col items-start">
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
          <p className="whitespace-nowrap text-lg font-semibold text-zinc-900 dark:text-white">
            {tenant.navigation?.header?.title || "Grants Council"}
          </p>
        )}
      </div>
      {tenant.navigation?.header?.poweredBy && <BrandPoweredBy />}
    </Link>
  );
}

export function WhitelabelNavbar() {
  const pathname = usePathname();
  const tenant = useTenantSafe();
  const { authenticated } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Publishes who is signed in to the tenant's marketing site, which is on its
  // own origin and cannot see this session. Display only — see identity-hint.ts.
  useIdentityHint();

  const tenantSocialLinks = tenant?.navigation?.socialLinks;
  const tenantSocialLinkLabels = tenant?.navigation?.socialLinkLabels;
  const socialLinksLabel = tenant?.navigation?.socialLinksLabel ?? DEFAULT_SOCIAL_LINKS_LABEL;
  const socialLinks = useMemo<SocialLinkItem[]>(
    () => buildSocialLinks(tenantSocialLinks, tenantSocialLinkLabels),
    [tenantSocialLinks, tenantSocialLinkLabels]
  );

  if (pathname.startsWith(PAGES.ADMIN_STUDIO)) {
    return null;
  }

  if (!tenant) {
    return (
      <nav
        data-app-chrome
        className="sticky top-0 z-50 border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
      >
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
  const showClaimFunds = Boolean(authenticated && claimFundsHref);

  return (
    <NavbarPermissionsProvider>
      <nav
        data-app-chrome
        className="sticky top-0 z-50 border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
      >
        <div className="mx-auto flex h-16 items-center justify-between px-8 lg:px-8 xl:px-24">
          {/* Brand */}
          <NavbarBrand tenant={tenant} />

          {/* Desktop Nav */}
          <div className="hidden items-center gap-1 lg:flex">
            {/* Search */}
            {/* `ml-6` is breathing room against the brand: the row is
                `justify-between` with no gap, so the search box otherwise butts
                straight up against the wordmark. */}
            <div className="ml-6 mr-2">
              <NavbarSearch placeholder="Search Project" />
            </div>
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
            <DesktopTenantNavItems
              items={tenant.navigation?.items}
              showClaimFunds={showClaimFunds}
              claimFundsHref={claimFundsHref}
            />

            {/* Resources dropdown */}
            {socialLinks.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button type="button" className={navStyles.desktopTrigger}>
                    {socialLinksLabel}
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

            {/* Tenant items that sit to the right of the social menu. */}
            <DesktopTenantNavItems
              items={tenant.navigation?.itemsAfterSocialLinks}
              showClaimFunds={false}
              claimFundsHref={undefined}
            />

            {/* Karma Assistant */}
            <NavbarAssistantButton className="mr-1" />

            {/* Theme toggle */}
            <ThemeToggleButton />

            {/* Separator */}
            <div className="mx-2 h-6 w-px bg-zinc-200 dark:bg-zinc-700" />

            {/* Auth — reuse main app components */}
            {authenticated ? <NavbarUserMenu /> : <NavbarAuthButtons />}
          </div>

          {/* Mobile: menu toggle */}
          <div className="flex items-center gap-2 lg:hidden">
            <NavbarAssistantButton compact />
            <ThemeToggleButton />
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
            {/* Mobile Search */}
            <div className="mb-3">
              <NavbarSearch
                onSelectItem={() => setIsMenuOpen(false)}
                placeholder="Search Project"
              />
            </div>
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

              <MobileTenantNavItems
                items={tenant.navigation?.items}
                showClaimFunds={showClaimFunds}
                claimFundsHref={claimFundsHref}
                onNavigate={() => setIsMenuOpen(false)}
              />

              {/* Social links in mobile */}
              {socialLinks.length > 0 && (
                <div className="space-y-1 border-t border-zinc-200 pt-2 dark:border-zinc-700">
                  <span className="block px-3 text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                    {socialLinksLabel}
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

              {/* Tenant items that sit after the social menu, as on desktop. */}
              <MobileTenantNavItems
                items={tenant.navigation?.itemsAfterSocialLinks}
                showClaimFunds={false}
                claimFundsHref={undefined}
                onNavigate={() => setIsMenuOpen(false)}
              />
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
