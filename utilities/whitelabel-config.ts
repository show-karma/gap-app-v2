export interface WhitelabelDomain {
  domain: string;
  communitySlug: string;
  name: string;
  theme?: {
    primaryColor?: string;
    logoBackground?: string;
  };
}

export const WHITELABEL_DOMAINS: WhitelabelDomain[] = [
  {
    domain: "grants.optimism.io",
    communitySlug: "optimism",
    name: "Optimism",
    theme: {
      primaryColor: "#FF0420",
      logoBackground: "#FF0420",
    },
  },
  {
    domain: "test-wl.local",
    communitySlug: "optimism",
    name: "Test Optimism",
    theme: {
      primaryColor: "#FF0420",
      logoBackground: "#FF0420",
    },
  },
];

export function getWhitelabelByDomain(hostname: string): WhitelabelDomain | null {
  const normalizedHost = hostname.split(":")[0];
  return WHITELABEL_DOMAINS.find((d) => d.domain === normalizedHost) ?? null;
}

export function getWhitelabelBySlug(slug: string): WhitelabelDomain | null {
  return WHITELABEL_DOMAINS.find((d) => d.communitySlug === slug) ?? null;
}

export function isWhitelabelDomain(hostname: string): boolean {
  return getWhitelabelByDomain(hostname) !== null;
}
