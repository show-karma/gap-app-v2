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
    dev: "https://testapp.karmahq.xyz/polygon",
    prod: "https://founders.polygon.technology",
  },
  scroll: {
    dev: "https://grantsapp.scroll.io",
    prod: "https://grantsapp.scroll.io",
  },
  shared: {
    dev: "https://testapp.karmahq.xyz",
    prod: "https://app.karmahq.xyz",
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
