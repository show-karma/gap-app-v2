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

export interface TenantNavigation {
  header?: {
    logo?: Partial<ImageProps>;
    title?: string;
    shouldHaveTitle?: boolean;
    poweredBy?: boolean;
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
}
