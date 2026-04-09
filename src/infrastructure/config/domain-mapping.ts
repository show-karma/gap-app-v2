import type { TenantId } from "../types/tenant";
import {
  isSharedDomain as checkIsSharedDomain,
  getDefaultSharedDomain,
  getExclusiveDomainsForTenant,
  getTenantForExclusiveDomain,
} from "./domain-constants";

export interface DomainMapping {
  id: TenantId;
  slug: string;
  name: string;
  logoUrl: string;
  whitelabelDomain?: string;
  useSharedSubdomain: boolean;
}

export const DOMAIN_MAPPINGS: DomainMapping[] = [
  {
    id: "karma",
    slug: "karma",
    name: "Karma",
    logoUrl: "/tenants/karma/logo.svg",
    useSharedSubdomain: true,
  },
  {
    id: "optimism",
    slug: "optimism",
    name: "Optimism",
    logoUrl: "/tenants/optimism/logo.png",
    whitelabelDomain: getExclusiveDomainsForTenant("optimism")[0],
    useSharedSubdomain: false,
  },
  {
    id: "arbitrum",
    slug: "arbitrum",
    name: "Arbitrum",
    logoUrl: "/tenants/arbitrum/logo.svg",
    useSharedSubdomain: true,
  },
  {
    id: "celo",
    slug: "celo",
    name: "Celo",
    logoUrl: "/tenants/celo/logo.jpeg",
    useSharedSubdomain: true,
  },
  {
    id: "polygon",
    slug: "polygon",
    name: "Polygon",
    logoUrl: "/tenants/polygon/logo.svg",
    useSharedSubdomain: true,
  },
  {
    id: "scroll",
    slug: "scroll",
    name: "Scroll",
    logoUrl: "/tenants/scroll/logo.svg",
    useSharedSubdomain: true,
  },
  {
    id: "celopg",
    slug: "celopg",
    name: "Celo Public Goods",
    logoUrl: "/tenants/celopg/logo.jpeg",
    useSharedSubdomain: true,
  },
  {
    id: "regen-coordination",
    slug: "regen-coordination",
    name: "Regen Coordination",
    logoUrl: "/tenants/regen-coordination/logo.png",
    useSharedSubdomain: true,
  },
  {
    id: "localism-fund",
    slug: "localism-fund",
    name: "Localism Fund",
    logoUrl: "/tenants/localism-fund/logo.png",
    useSharedSubdomain: true,
  },
  {
    id: "filecoin",
    slug: "filecoin",
    name: "Filecoin",
    logoUrl: "/tenants/filecoin/logo.svg",
    useSharedSubdomain: true,
  },
  {
    id: "for-the-world",
    slug: "for-the-world",
    name: "For the World",
    logoUrl: "/tenants/for-the-world/logo.jpeg",
    useSharedSubdomain: true,
  },
];

export function getDomainMappingByCommunity(communityId: TenantId): DomainMapping | undefined {
  return DOMAIN_MAPPINGS.find((mapping) => mapping.id === communityId);
}

export function getDomainMappingByDomain(domain: string): DomainMapping | undefined {
  const tenant = getTenantForExclusiveDomain(domain);
  if (tenant) return getDomainMappingByCommunity(tenant);
  return undefined;
}

export function getDomainMappingBySlug(slug: string): DomainMapping | undefined {
  return DOMAIN_MAPPINGS.find((mapping) => mapping.slug === slug);
}

export function isSharedSubdomain(hostname: string): boolean {
  return checkIsSharedDomain(hostname);
}

export function getCommunityDomain(communityId: TenantId, forceSharedSubdomain = false): string {
  const mapping = getDomainMappingByCommunity(communityId);
  const baseDomain = getDefaultSharedDomain();
  if (!mapping) return baseDomain;
  if (forceSharedSubdomain || !mapping.whitelabelDomain) {
    return `${baseDomain}/${mapping.slug}`;
  }
  return mapping.whitelabelDomain;
}
