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

const DEFAULT_WHITELABEL_DOMAINS: WhitelabelDomain[] = [
  {
    domain: "optimism.localhost",
    communitySlug: "optimism",
    tenantId: "optimism",
    name: "Optimism (Local)",
    theme: { primaryColor: "#FF0420" },
  },
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
  {
    domain: "grantsapp.scroll.io",
    communitySlug: "scroll",
    tenantId: "scroll",
    name: "Scroll",
    theme: { primaryColor: "#EBC28E" },
  },
  {
    domain: "app.filpgf.io",
    communitySlug: "filecoin",
    tenantId: "filecoin",
    name: "Filecoin",
    theme: { primaryColor: "#0090ff" },
  },
  {
    domain: "grants.filecoin.io",
    communitySlug: "filecoin",
    tenantId: "filecoin",
    name: "Filecoin (Legacy)",
    theme: { primaryColor: "#0090ff" },
  },
];

function parseExtraWhitelabelDomainsFromEnv(): WhitelabelDomain[] {
  const rawExtraDomains = process.env.WHITELABEL_EXTRA_DOMAINS_JSON;
  if (!rawExtraDomains) {
    return [];
  }

  try {
    const parsed = JSON.parse(rawExtraDomains) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.flatMap((entry) => {
      if (!entry || typeof entry !== "object") {
        return [];
      }

      const record = entry as Record<string, unknown>;
      const domain = typeof record.domain === "string" ? record.domain.trim().toLowerCase() : "";
      const communitySlug =
        typeof record.communitySlug === "string" ? record.communitySlug.trim() : "";
      const tenantId = typeof record.tenantId === "string" ? record.tenantId.trim() : undefined;
      const name = typeof record.name === "string" ? record.name.trim() : "";

      if (!domain || !communitySlug || !name) {
        return [];
      }

      const themeRecord =
        record.theme && typeof record.theme === "object"
          ? (record.theme as Record<string, unknown>)
          : null;

      const primaryColor =
        typeof themeRecord?.primaryColor === "string" ? themeRecord.primaryColor : undefined;
      const logoBackground =
        typeof themeRecord?.logoBackground === "string" ? themeRecord.logoBackground : undefined;

      return [
        {
          domain,
          communitySlug,
          tenantId,
          name,
          theme:
            primaryColor || logoBackground
              ? {
                  primaryColor,
                  logoBackground,
                }
              : undefined,
        },
      ];
    });
  } catch {
    return [];
  }
}

export const WHITELABEL_DOMAINS: WhitelabelDomain[] = [
  ...DEFAULT_WHITELABEL_DOMAINS,
  ...parseExtraWhitelabelDomainsFromEnv(),
];

export function getWhitelabelByDomain(hostname: string): WhitelabelDomain | null {
  const normalizedHost = hostname.split(":")[0]?.toLowerCase();
  return WHITELABEL_DOMAINS.find((d) => d.domain.toLowerCase() === normalizedHost) ?? null;
}

const HSL_TOKEN_PATTERN = /^\d{1,3}\s+\d{1,3}%\s+\d{1,3}%$/;

function hexToHslToken(hex: string): string | null {
  const normalizedHex = hex.replace("#", "").trim();

  const isShortHex = normalizedHex.length === 3;
  const isLongHex = normalizedHex.length === 6;
  if (!isShortHex && !isLongHex) return null;

  const fullHex = isShortHex
    ? normalizedHex
        .split("")
        .map((char) => `${char}${char}`)
        .join("")
    : normalizedHex;

  const r = Number.parseInt(fullHex.slice(0, 2), 16) / 255;
  const g = Number.parseInt(fullHex.slice(2, 4), 16) / 255;
  const b = Number.parseInt(fullHex.slice(4, 6), 16) / 255;

  if ([r, g, b].some(Number.isNaN)) return null;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;

  let h = 0;
  if (delta !== 0) {
    if (max === r) {
      h = ((g - b) / delta) % 6;
    } else if (max === g) {
      h = (b - r) / delta + 2;
    } else {
      h = (r - g) / delta + 4;
    }
    h *= 60;
    if (h < 0) h += 360;
  }

  const l = (max + min) / 2;
  const s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));

  const hue = Math.round(h);
  const saturation = Math.round(s * 100);
  const lightness = Math.round(l * 100);

  return `${hue} ${saturation}% ${lightness}%`;
}

export function toHslToken(color: string): string | null {
  const normalizedColor = color.trim();

  if (HSL_TOKEN_PATTERN.test(normalizedColor)) {
    return normalizedColor;
  }

  if (normalizedColor.startsWith("#")) {
    return hexToHslToken(normalizedColor);
  }

  return null;
}

export function isWhitelabelDomain(hostname: string): boolean {
  return getWhitelabelByDomain(hostname) !== null;
}

/**
 * Find the whitelabel domain for a community slug, matching production/staging environment.
 *
 * Used to redirect old umbrella URLs (e.g. app.karmahq.xyz/optimism)
 * to the tenant's whitelabel domain (e.g. app.opgrants.io).
 */
export function getWhitelabelDomainForSlug(slug: string, isProduction: boolean): string | null {
  // Import is avoided — use the DOMAIN_CONFIGS to check isProduction for each whitelabel domain.
  // WHITELABEL_DOMAINS already has the slug→domain mapping.
  // We need to pick the right one based on environment.
  const normalizedSlug = slug.toLowerCase();
  const candidates = WHITELABEL_DOMAINS.filter(
    (d) => d.communitySlug.toLowerCase() === normalizedSlug && !d.domain.includes("localhost")
  );

  if (candidates.length === 0) return null;

  // Classify candidates by environment convention.
  // Staging domains typically have "test" or "staging" in the name or domain.
  const isStagingDomain = (d: WhitelabelDomain) =>
    d.domain.includes("test") ||
    d.name.toLowerCase().includes("test") ||
    d.name.toLowerCase().includes("staging");

  const match = isProduction
    ? candidates.find((d) => !isStagingDomain(d))
    : candidates.find((d) => isStagingDomain(d));

  // Return null when no environment-matching domain exists.
  // This prevents staging traffic from being sent to a production domain
  // (e.g. testapp.karmahq.xyz/filecoin → grants.filecoin.io → fil.org/grants).
  return match?.domain ?? null;
}
