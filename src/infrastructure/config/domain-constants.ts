import type { TenantId } from "../types/tenant";

export interface DomainInfo {
  domain: string;
  isProduction: boolean;
  isShared: boolean;
  isUmbrella?: boolean;
  tenantId?: TenantId;
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
  { domain: "karmahq.xyz", isProduction: true, isShared: true },
  { domain: "staging.karmahq.xyz", isProduction: false, isShared: true },
  { domain: "app.karmahq.xyz", isProduction: true, isShared: true, isUmbrella: true },
  { domain: "testapp.karmahq.xyz", isProduction: false, isShared: true, isUmbrella: true },
  { domain: "app.localhost", isProduction: false, isShared: true, isUmbrella: true },
];

export function getDomainInfo(hostname: string): DomainInfo | undefined {
  const cleanHost = hostname.replace(/^https?:\/\//, "").split("/")[0];
  const exactMatch = DOMAIN_CONFIGS.find((config) => config.domain === cleanHost);
  if (exactMatch) return exactMatch;
  const hostWithoutPort = cleanHost.split(":")[0];
  return DOMAIN_CONFIGS.find((config) => config.domain === hostWithoutPort);
}

export function getDefaultSharedDomain(): string {
  return "karmahq.xyz";
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

export function isUmbrellaDomain(hostname: string): boolean {
  const domainInfo = getDomainInfo(hostname);
  return domainInfo?.isUmbrella === true;
}

export function getExclusiveDomainsForTenant(tenantId: TenantId): string[] {
  return DOMAIN_CONFIGS.filter((config) => config.tenantId === tenantId).map(
    (config) => config.domain
  );
}
