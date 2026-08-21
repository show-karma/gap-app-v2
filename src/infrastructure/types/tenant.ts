import type { ImageProps } from "next/image";

// Known tenant IDs with explicit configuration
export const KNOWN_TENANT_IDS = [
  "optimism",
  "arbitrum",
  "celo",
  "polygon",
  "scroll",
  "karma",
  "celopg",
  "regen-coordination",
  "localism-fund",
  "filecoin",
  "for-the-world",
] as const;
export type KnownTenantId = (typeof KNOWN_TENANT_IDS)[number];

// All tenant IDs including "default" for backwards compatibility
export const TENANT_IDS = [...KNOWN_TENANT_IDS, "default"] as const;
export type TenantId = (typeof TENANT_IDS)[number];

/**
 * Check if a string is a known tenant ID (has explicit configuration)
 */
export function isKnownTenant(id: string): id is KnownTenantId {
  return KNOWN_TENANT_IDS.includes(id as KnownTenantId);
}

export interface TenantTheme {
  mode: "light" | "dark";
  colors: {
    primary: string;
    primaryDark: string;
    primaryLight: string;
    secondary: string;
    background: string;
    foreground: string;
    mutedForeground: string;
    buttontext: string;
    border: string;
    success: string;
    warning: string;
    error: string;
  };
  fonts: {
    sans: string[];
    mono: string[];
  };
  radius: {
    small: string;
    medium: string;
    large: string;
  };
}

export interface TenantAssets {
  logo: string;
  logoDark?: string;
  favicon: string;
  ogImage: string;
}

// Navigation types
export interface NavDropdownSubItem {
  label: string;
  href: string;
  isExternal?: boolean;
}

export interface NavDropdownItem {
  label: string;
  href?: string;
  isExternal?: boolean;
  /** Nested sub-items shown on hover (dropdown inside dropdown) */
  items?: NavDropdownSubItem[];
}

export interface NavLink {
  label: string;
  href: string;
  isExternal?: boolean;
}

export interface NavDropdown {
  label: string;
  items: NavDropdownItem[];
}

export type NavItem = NavLink | NavDropdown;

export interface TenantHeaderWordmark {
  /** Text rendered before the accented segment (e.g. "fil"). */
  prefix: string;
  /** Accented segment of the wordmark (e.g. "pgf"). */
  accent: string;
  /** Text rendered after the accented segment (e.g. ".io"). */
  suffix?: string;
  /** Destination of the brand link — typically the tenant's marketing site. */
  href: string;
  /**
   * Production domains this wordmark belongs to. A tenant can serve several
   * domains (see DOMAIN_CONFIGS / WHITELABEL_DOMAINS), and the wordmark is a
   * per-domain brand, so domains outside this list keep the logo + title brand.
   * Omitted: the wordmark renders on every domain serving the tenant.
   */
  domains?: string[];
  /** Accent color in light mode. Omitted: the accent inherits the wordmark text color. */
  accentColor?: string;
  /** Accent color in dark mode. Falls back to `accentColor`. */
  accentColorDark?: string;
  ariaLabel?: string;
}

export interface TenantNavigation {
  header?: {
    logo?: Partial<ImageProps>;
    title?: string;
    shouldHaveTitle?: boolean;
    poweredBy?: boolean;
    /** When set, a text wordmark replaces the logo + title brand block. */
    wordmark?: TenantHeaderWordmark;
  };
  items: NavItem[];
  /** Whether to show the top-level "Applications" link in the navbar. Defaults to true. */
  showBrowseApplications?: boolean;
  claimFundsHref?: string;
  socialLinks?: {
    twitter?: string;
    discord?: string;
    github?: string;
    docs?: string;
    telegram?: string;
    paragraph?: string;
    farcaster?: string;
  };
  /** Per-tenant label overrides for social links (e.g. show "Social" instead of "Twitter"). */
  socialLinkLabels?: {
    twitter?: string;
    discord?: string;
    github?: string;
    docs?: string;
    telegram?: string;
  };
  /**
   * Name of the menu the social links sit under, in the navbar and in the
   * mobile section heading. Defaults to "Resources"; a tenant that calls the
   * same set of links something else (filecoin: "Connect") sets it here rather
   * than the label being decided in the navbar for everyone.
   */
  socialLinksLabel?: string;
}

export interface HeroStat {
  value: string;
  label: string;
}

export interface TenantContent {
  welcomeText?: string;
  heroHeading?: string;
  heroDescription?: string;
  heroStats?: HeroStat[];
  subtitle?: string;
  openFundingRoundsTitle?: string;
}

export interface ClaimGrantsConfig {
  enabled: boolean;
  provider: "hedgey" | "none";
  providerConfig?: {
    type: "hedgey";
    networkName: string;
    contractAddress: string;
  };
}

export interface TenantSeo {
  title: string;
  description: string;
  keywords: string[];
}

export interface TenantConfig {
  id: string;
  name: string;
  theme: TenantTheme;
  assets: TenantAssets;
  navigation: TenantNavigation;
  content?: TenantContent;
  karmaAssets: TenantAssets;
  seo: TenantSeo;
  chainId: number;
  apiUrl?: string;
  rpcUrl?: string;
  indexerUrl?: string;
  communitySlug?: string;
  communityUID?: string;
  claimGrants: ClaimGrantsConfig;
  /**
   * Parent domain to publish the identity hint on, for tenants whose marketing
   * site is a sibling host (filecoin: `.filpgf.io`, shared by app.filpgf.io and
   * www.filpgf.io). Omitted, no hint is written at all.
   *
   * See `utilities/auth/identity-hint.ts` for what the hint is and, more
   * importantly, what it is not — it carries no token and grants nothing.
   */
  identityHintCookieDomain?: string;
}
