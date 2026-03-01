export interface WhitelabelDomain {
  domain: string;
  communitySlug: string;
  tenantId?: string;
  name: string;
  theme?: {
    primaryColor?: string;
    logoBackground?: string;
  };
}

export const WHITELABEL_DOMAINS: WhitelabelDomain[] = [
  // Optimism
  {
    domain: "app.opgrants.io",
    communitySlug: "optimism",
    tenantId: "optimism",
    name: "Optimism",
    theme: { primaryColor: "#FF0420" },
  },
  {
    domain: "testapp.opgrants.io",
    communitySlug: "optimism",
    tenantId: "optimism",
    name: "Optimism (Test)",
    theme: { primaryColor: "#FF0420" },
  },
  // Polygon
  {
    domain: "founders.polygon.technology",
    communitySlug: "polygon",
    tenantId: "polygon",
    name: "Polygon",
    theme: { primaryColor: "#8247E5" },
  },
  {
    domain: "foundersapp.polygon.technology",
    communitySlug: "polygon",
    tenantId: "polygon",
    name: "Polygon (Test)",
    theme: { primaryColor: "#8247E5" },
  },
  // Scroll
  {
    domain: "grantsapp.scroll.io",
    communitySlug: "scroll",
    tenantId: "scroll",
    name: "Scroll",
    theme: { primaryColor: "#EBC28E" },
  },
  // Filecoin
  {
    domain: "grants.filecoin.io",
    communitySlug: "filecoin",
    tenantId: "filecoin",
    name: "Filecoin",
    theme: { primaryColor: "#0090ff" },
  },
  {
    domain: "app.filpgf.io",
    communitySlug: "filecoin",
    tenantId: "filecoin",
    name: "Filecoin PGF",
    theme: { primaryColor: "#0090ff" },
  },
];

export function getWhitelabelByDomain(hostname: string): WhitelabelDomain | null {
  const normalizedHost = hostname.split(":")[0].toLowerCase();
  return WHITELABEL_DOMAINS.find((d) => d.domain === normalizedHost) ?? null;
}

export function getWhitelabelBySlug(slug: string): WhitelabelDomain | null {
  return WHITELABEL_DOMAINS.find((d) => d.communitySlug === slug) ?? null;
}

export function isWhitelabelDomain(hostname: string): boolean {
  return getWhitelabelByDomain(hostname) !== null;
}
