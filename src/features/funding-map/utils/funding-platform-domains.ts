import { LEGACY_UMBRELLA_HOSTS } from "@/utilities/domains";

export const FUNDING_PLATFORM_DOMAINS = {
  optimism: {
    dev: "https://testapp.opgrants.io",
    prod: "https://app.opgrants.io",
  },
  filecoin: {
    dev: "https://app.filpgf.io",
    prod: "https://app.filpgf.io",
  },
  polygon: {
    dev: `https://${LEGACY_UMBRELLA_HOSTS.staging}/polygon`,
    prod: "https://founders.polygon.technology",
  },
  scroll: {
    dev: "https://grantsapp.scroll.io",
    prod: "https://grantsapp.scroll.io",
  },
  shared: {
    dev: `https://${LEGACY_UMBRELLA_HOSTS.staging}`,
    prod: `https://${LEGACY_UMBRELLA_HOSTS.prod}`,
  },
};

export const FUNDING_PLATFORM_TENANT_IDS = [
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
