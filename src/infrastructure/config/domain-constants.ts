import { bareHostname, ROOT_DOMAIN } from "@/utilities/domains";
import type { TenantId } from "../types/tenant";

export interface DomainInfo {
  domain: string;
  isProduction: boolean;
  isShared: boolean;
  tenantId?: TenantId;
  /** Former umbrella domains — redirect /<slug>/path to the tenant's whitelabel domain. */
  isLegacyUmbrella?: boolean;
}

export const DOMAIN_CONFIGS: DomainInfo[] = [
  { domain: "grantsapp.scroll.io", isProduction: true, isShared: false, tenantId: "scroll" },
  { domain: "grants.filecoin.io", isProduction: true, isShared: false, tenantId: "filecoin" },
  { domain: "app.filpgf.io", isProduction: true, isShared: false, tenantId: "filecoin" },
  {
    domain: "founders.polygon.technology",
    isProduction: true,
    isShared: false,
    tenantId: "polygon",
  },
  {
    domain: "foundersapp.polygon.technology",
    isProduction: false,
    isShared: false,
    tenantId: "polygon",
  },
  { domain: "app.opgrants.io", isProduction: true, isShared: false, tenantId: "optimism" },
  { domain: "testapp.opgrants.io", isProduction: false, isShared: false, tenantId: "optimism" },
  { domain: "karmahq.org", isProduction: true, isShared: true },
  { domain: "staging.karmahq.org", isProduction: false, isShared: true },
  // Legacy .xyz hosts stay listed permanently: isSharedDomain() fails open to
  // true for anything absent here, so dropping them degrades silently.
  { domain: "karmahq.xyz", isProduction: true, isShared: true },
  { domain: "staging.karmahq.xyz", isProduction: false, isShared: true },
  { domain: "app.karmahq.xyz", isProduction: true, isShared: true, isLegacyUmbrella: true },
  { domain: "testapp.karmahq.xyz", isProduction: false, isShared: true, isLegacyUmbrella: true },
];

export function getDomainInfo(hostname: string): DomainInfo | undefined {
  const authority = hostname.replace(/^https?:\/\//, "").split("/")[0];
  const host = bareHostname(authority);
  return DOMAIN_CONFIGS.find((config) => config.domain === host);
}

export function getDefaultSharedDomain(): string {
  return ROOT_DOMAIN;
}

export function isSharedDomain(hostname: string): boolean {
  const domainInfo = getDomainInfo(hostname);
  if (!domainInfo) return true;
  return domainInfo.isShared === true;
}

export function getTenantForExclusiveDomain(hostname: string): TenantId | null {
  const domainInfo = getDomainInfo(hostname);
  return domainInfo?.tenantId || null;
}

export function getSharedDomains(): string[] {
  return DOMAIN_CONFIGS.filter((config) => config.isShared).map((config) => config.domain);
}

export function getExclusiveDomainsForTenant(tenantId: TenantId): string[] {
  return DOMAIN_CONFIGS.filter((config) => config.tenantId === tenantId).map(
    (config) => config.domain
  );
}
