// P2-22: gap-app-v2 is single-indexer by design — all tenants share
// envVars.NEXT_PUBLIC_GAP_INDEXER_URL. No per-tenant indexerUrl override
// is needed. If this changes, implement getIndexerUrl(tenantId) here and
// thread it as the 8th param of fetchData() in affected hooks.
import { getHedgeyContractAddress } from "@/src/features/claim-funds/lib/hedgey-contract";
import { getTenantTheme } from "../theme/config";
import type {
  ClaimGrantsConfig,
  TenantAssets,
  TenantConfig,
  TenantContent,
  TenantId,
  TenantNavigation,
  TenantSeo,
} from "../types/tenant";

function getHedgeyNetwork(defaultNetwork: string): string {
  return process.env.NEXT_PUBLIC_HEDGEY_NETWORK || defaultNetwork;
}

function getClaimGrantsConfigForTenant(tenantId: TenantId): ClaimGrantsConfig {
  if (tenantId === "optimism") {
    const networkName = getHedgeyNetwork("optimism");
    return {
      enabled: true,
      provider: "hedgey",
      providerConfig: {
        type: "hedgey",
        networkName,
        contractAddress: getHedgeyContractAddress(networkName),
      },
    };
  }
  return { enabled: false, provider: "none" };
}

export function getDefaultAssets(): TenantAssets {
  return {
    logo: "/shared/karma/karma-logo-light.svg",
    logoDark: "/shared/karma/karma-logo-dark.svg",
    favicon: "/shared/karma/favicon.png",
    ogImage: "/shared/karma/og-image.png",
  };
}

export function getDefaultContent(): TenantContent {
  return {
    welcomeText: "Welcome to",
    subtitle: "Community Funding Platform",
    openFundingRoundsTitle: "Open Funding Rounds",
  };
}

function getTenantAssets(tenantId: TenantId): TenantAssets {
  const pngLogoTenants = ["optimism", "regen-coordination", "localism-fund"];
  const jpegLogoTenants = ["celo", "celopg", "for-the-world"];

  if (tenantId === "karma") {
    return {
      logo: `/tenants/${tenantId}/logo.svg`,
      logoDark: `/tenants/${tenantId}/logo-dark.svg`,
      favicon: `/tenants/${tenantId}/favicon.ico`,
      ogImage: `/tenants/${tenantId}/og-image.png`,
    };
  }

  let ext = "svg";
  if (pngLogoTenants.includes(tenantId)) ext = "png";
  else if (jpegLogoTenants.includes(tenantId)) ext = "jpeg";

  return {
    logo: `/tenants/${tenantId}/logo.${ext}`,
    favicon: `/tenants/${tenantId}/favicon.ico`,
    ogImage: `/tenants/${tenantId}/og-image.png`,
  };
}

const isDev =
  process.env.NEXT_PUBLIC_VERCEL_ENV === "development" ||
  process.env.NEXT_PUBLIC_VERCEL_ENV === "preview";

export const programsChainId = isDev ? 11155111 : 42161;

const tenantMetadata: Record<
  TenantId,
  { name: string; chainId: number; slug: string; uid: string }
> = {
  optimism: {
    name: "Optimism",
    chainId: programsChainId,
    slug: "optimism",
    uid: "0x1853e9a16f73afccb73a3801127d760cc3ab54d300573ebd4ec6f57119875d39",
  },
  arbitrum: {
    name: "Arbitrum",
    chainId: programsChainId,
    slug: "arbitrum",
    uid: "0x02174fc2f5204bc816aaabc4d82e406e8967381ca490cf4915bdd9b5aae8c2e9",
  },
  celo: {
    name: "Celo",
    chainId: programsChainId,
    slug: "celo",
    uid: "0x67cce5e1bd0851f8c51b2baca9d556ed447efdfe5309e2b1668d92a48fbe1f2d",
  },
  polygon: {
    name: "Polygon",
    chainId: programsChainId,
    slug: "polygon",
    uid: "0x0000000000000000000000000000000000000000000000000000000000000000",
  },
  scroll: {
    name: "Scroll",
    chainId: programsChainId,
    slug: "scroll",
    uid: "0x0000000000000000000000000000000000000000000000000000000000000000",
  },
  karma: {
    name: "Karma",
    chainId: programsChainId,
    slug: "karma",
    uid: "0x0000000000000000000000000000000000000000000000000000000000000000",
  },
  celopg: {
    name: "Celo Public Goods",
    chainId: programsChainId,
    slug: "celopg",
    uid: "0x68689eae8f1e08b7d30be8da301289f8ab8e058a6e472a8cf09efddc8165ccc1",
  },
  "regen-coordination": {
    name: "Regen Coordination",
    chainId: programsChainId,
    slug: "regen-coordination",
    uid: "0xccff29d65d80f9ae4e6bc9b6a09b4e4dd588e47333903aa0f9c8b251cc91d96d",
  },
  "localism-fund": {
    name: "Localism Fund",
    chainId: programsChainId,
    slug: "localism-fund",
    uid: "0x3bbdae9e08429152c53d52cf175921ae6337618e183ddb79fe435fa3038a54fe",
  },
  filecoin: {
    name: "Filecoin",
    chainId: programsChainId,
    slug: "filecoin",
    uid: "0x95473c7b61f12051bb86db06f522518532ea17531f311fe965b863c51df50a65",
  },
  "for-the-world": {
    name: "For the World",
    chainId: programsChainId,
    slug: "for-the-world",
    uid: "0x74b1b5e30ca0ca74c8b238931ce76d9bf3a840c17fdaf48bb32858b9db43a08a",
  },
  default: {
    name: "Community",
    chainId: programsChainId,
    slug: "default",
    uid: "0x0000000000000000000000000000000000000000000000000000000000000000",
  },
};

const tenantNavigation: Record<TenantId, TenantNavigation> = {
  optimism: {
    header: { title: "Grants Council", shouldHaveTitle: true, poweredBy: true },
    items: [
      {
        label: "Grants",
        items: [
          {
            label: "Audit Grants",
            href: "https://atlas.optimism.io/missions/audit-grants",
            isExternal: true,
          },
          {
            label: "Growth Grants",
            href: "https://atlas.optimism.io/missions/growth-grants",
            isExternal: true,
          },
          {
            label: "Retro Funding: Dev Tooling",
            href: "https://atlas.optimism.io/missions/retro-funding-dev-tooling",
            isExternal: true,
          },
          {
            label: "Retro Funding: Onchain Builders",
            href: "https://atlas.optimism.io/missions/retro-funding-onchain-builders",
            isExternal: true,
          },
          {
            label: "Foundation Missions",
            href: "https://atlas.optimism.io/missions/foundation-missions",
            isExternal: true,
          },
        ],
      },
      {
        label: "More",
        items: [
          { label: "Optimism", href: "https://optimism.io/", isExternal: true },
          { label: "Forum", href: "https://gov.optimism.io/", isExternal: true },
          { label: "Delegates", href: "https://vote.optimism.io/delegates", isExternal: true },
        ],
      },
    ],
    claimFundsHref: "/claim-funds",
    socialLinks: {
      twitter: "https://twitter.com/optimism",
      discord: "https://discord.optimism.io",
      github: "https://github.com/ethereum-optimism",
      docs: "https://community.optimism.io",
    },
  },
  arbitrum: {
    header: { title: "Grants Council", shouldHaveTitle: true, poweredBy: true },
    items: [
      { label: "Programs", items: [{ label: "Dashboard", href: "/" }] },
      {
        label: "About",
        items: [
          { label: "About Arbitrum", href: "https://arbitrum.io/", isExternal: true },
          { label: "Documentation", href: "https://docs.arbitrum.io", isExternal: true },
          { label: "Forum", href: "https://forum.arbitrum.foundation/", isExternal: true },
        ],
      },
    ],
    socialLinks: {
      twitter: "https://twitter.com/arbitrum",
      discord: "https://discord.gg/arbitrum",
      github: "https://github.com/OffchainLabs",
      docs: "https://docs.arbitrum.io",
    },
  },
  celo: {
    header: { title: "Grants Council", shouldHaveTitle: true, poweredBy: true },
    items: [],
    socialLinks: {
      twitter: "https://twitter.com/celoorg",
      discord: "https://discord.gg/celo",
      github: "https://github.com/celo-org",
      docs: "https://docs.celo.org",
    },
  },
  polygon: {
    header: { title: "Founder Support", shouldHaveTitle: true, poweredBy: true },
    items: [],
    socialLinks: {
      twitter: "https://twitter.com/0xPolygon",
      discord: "https://discord.gg/polygon",
      github: "https://github.com/maticnetwork",
      docs: "https://docs.polygon.technology",
      telegram: "https://t.me/polygonhq",
    },
  },
  scroll: {
    header: { title: "Grants", shouldHaveTitle: true, poweredBy: true },
    items: [],
    socialLinks: {
      twitter: "https://twitter.com/Scroll_ZKP",
      discord: "https://discord.gg/scroll",
      github: "https://github.com/scroll-tech",
      docs: "https://docs.scroll.io",
    },
  },
  karma: {
    header: {
      logo: { className: "w-[180px] h-auto", width: 180, height: 40 },
      shouldHaveTitle: false,
      poweredBy: false,
    },
    items: [],
    socialLinks: {
      twitter: "https://x.com/karmahq_",
      discord: "https://discord.gg/X4fwgzPReJ",
      telegram: "https://t.me/karmahq",
      paragraph: "https://paragraph.xyz/@karmahq",
    },
  },
  celopg: {
    header: { title: "Grants Council", shouldHaveTitle: true, poweredBy: true },
    items: [],
    socialLinks: { twitter: "https://twitter.com/CeloPublicGoods", docs: "https://www.celopg.eco" },
  },
  "regen-coordination": {
    header: { title: "Grants Council", shouldHaveTitle: true, poweredBy: true },
    items: [],
    socialLinks: {
      twitter: "https://x.com/RegenCoordinate",
      docs: "https://www.regencoordination.xyz/?v=1b22e7251f2f800594c2000c9bb5a316",
      telegram: "https://t.me/+dfOMYhMROdU5YzY0",
    },
  },
  "localism-fund": {
    header: { title: "Grants Council", shouldHaveTitle: true, poweredBy: true },
    items: [],
    socialLinks: {},
  },
  filecoin: {
    header: { title: "Filecoin Community", shouldHaveTitle: true, poweredBy: true },
    showBrowseApplications: false,
    items: [
      {
        label: "ProPGF",
        items: [
          { label: "Overview", href: "https://filpgf.io/propgf", isExternal: true },
          {
            label: "Grants",
            items: [
              {
                label: "Batch 1",
                href: "https://app.filpgf.io/projects?programId=1013",
                isExternal: true,
              },
              {
                label: "Batch 2",
                href: "https://app.filpgf.io/projects?programId=992",
                isExternal: true,
              },
              {
                label: "Batch 2 - Pods Track",
                href: "https://app.filpgf.io/projects?programId=1039",
                isExternal: true,
              },
            ],
          },
          {
            label: "Applications",
            items: [
              {
                label: "Batch 1",
                href: "https://app.filpgf.io/browse-applications?programId=1013",
                isExternal: true,
              },
              {
                label: "Batch 2",
                href: "https://app.filpgf.io/browse-applications?programId=992",
                isExternal: true,
              },
              {
                label: "Batch 2 - Pods Track",
                href: "https://app.filpgf.io/browse-applications?programId=1039",
                isExternal: true,
              },
            ],
          },
          {
            label: "Payout process",
            href: "https://docs.google.com/document/d/1WIyL8zj1ToTEVujRvCV6E4mlle5srwLP3DhEarWn3Ug/edit?usp=sharing",
            isExternal: true,
          },
          { label: "Financials", href: "/community/filecoin/financials" },
        ],
      },
      { label: "RetroPGF", href: "https://www.fil-retropgf.io/", isExternal: true },
      {
        label: "More",
        items: [
          { label: "About Filecoin", href: "https://filecoin.io/", isExternal: true },
          { label: "Upcoming Events", href: "https://fil.org/events/", isExternal: true },
          {
            label: "Forum",
            href: "https://github.com/filecoin-project/community/discussions",
            isExternal: true,
          },
          { label: "Community", href: "https://filecoin.io/community", isExternal: true },
        ],
      },
    ],
    socialLinks: {
      twitter: "https://twitter.com/Filecoin",
      discord: "https://discord.gg/yeQ2hcd2TD",
      github: "https://github.com/filecoin-project",
    },
  },
  "for-the-world": {
    header: { title: "Grants Council", shouldHaveTitle: true, poweredBy: true },
    items: [],
    socialLinks: {
      twitter: "https://x.com/ETHForTheWorld",
      farcaster: "https://farcaster.xyz/ethfortheworld",
    },
  },
  default: {
    header: { title: "Grants Council", shouldHaveTitle: true, poweredBy: true },
    items: [],
    socialLinks: {},
  },
};

const tenantContent: Partial<Record<TenantId, TenantContent>> = {
  optimism: {
    openFundingRoundsTitle: "Open Funding Rounds",
  },
  arbitrum: {
    openFundingRoundsTitle: "Open Funding Rounds",
  },
  celo: {
    openFundingRoundsTitle: "Open Funding Rounds",
  },
  polygon: {
    heroHeading: "Accelerate your project on Polygon",
    heroDescription:
      "Connect with funding opportunities, technical resources, and strategic partnerships designed to help payments-focused founders scale. From prediction market tools to cross-border payment solutions, we provide tailored support for builders driving real-world adoption.",
    heroStats: [
      { value: "1B POL", label: "Foundation treasury for ecosystem growth" },
      { value: "Multiple Programs", label: "Funding, partnerships & technical support" },
      { value: "1000+", label: "Projects supported across all stages" },
    ],
    subtitle: "Founder Support Platform",
    openFundingRoundsTitle: "",
  },
  scroll: { subtitle: "Community Funding Platform", openFundingRoundsTitle: "Open Funding Rounds" },
  karma: {
    openFundingRoundsTitle: "Open Funding Rounds",
  },
  celopg: {
    openFundingRoundsTitle: "Open Funding Rounds",
  },
  "regen-coordination": {
    openFundingRoundsTitle: "Open Funding Rounds",
  },
  "localism-fund": {
    openFundingRoundsTitle: "Open Funding Rounds",
  },
  filecoin: {
    openFundingRoundsTitle: "Open Funding Rounds",
  },
  "for-the-world": {
    openFundingRoundsTitle: "Open Funding Rounds",
  },
  default: {
    openFundingRoundsTitle: "Open Funding Rounds",
  },
};

function getDefaultSeo(tenantName: string): TenantSeo {
  return {
    title: `${tenantName} Funding Platform`,
    description: `Apply for funding from the ${tenantName} ecosystem. Browse open programs, submit applications, and track your grants.`,
    keywords: [tenantName.toLowerCase(), "grants", "funding", "blockchain", "web3", "ecosystem"],
  };
}

const tenantSeo: Partial<Record<TenantId, TenantSeo>> = {
  optimism: {
    title: "Optimism Grants Council",
    description:
      "Apply for grants from the Optimism ecosystem. Browse open funding rounds, submit applications, and track your grant status.",
    keywords: ["optimism", "grants", "funding", "op stack", "superchain", "blockchain", "web3"],
  },
  arbitrum: {
    title: "Arbitrum Grants Council",
    description:
      "Apply for grants from the Arbitrum ecosystem. Browse open funding programs, submit applications, and track your grant status.",
    keywords: ["arbitrum", "grants", "funding", "layer 2", "ethereum", "blockchain", "web3"],
  },
  celo: {
    title: "Celo Grants Council",
    description:
      "Apply for grants from the Celo ecosystem. Browse open funding programs, submit applications, and track your grant status.",
    keywords: ["celo", "grants", "funding", "mobile-first", "blockchain", "web3"],
  },
  polygon: {
    title: "Polygon Founder Support",
    description:
      "Connect with funding opportunities, technical resources, and strategic partnerships in the Polygon ecosystem.",
    keywords: ["polygon", "grants", "funding", "founder support", "blockchain", "web3"],
  },
  scroll: {
    title: "Scroll Grants",
    description:
      "Apply for grants from the Scroll ecosystem. Browse open funding programs, submit applications, and track your grant status.",
    keywords: ["scroll", "grants", "funding", "zk rollup", "ethereum", "blockchain", "web3"],
  },
  karma: {
    title: "Karma Funding Platform",
    description:
      "Explore open funding rounds across blockchain communities. Apply for grants, track applications, and manage your funding.",
    keywords: [
      "karma",
      "grants",
      "funding",
      "blockchain",
      "web3",
      "ecosystem",
      "grantee accountability",
    ],
  },
  celopg: {
    title: "Celo Public Goods",
    description:
      "Apply for public goods funding from the Celo Public Goods ecosystem. Browse open programs and submit applications.",
    keywords: ["celo", "public goods", "grants", "funding", "blockchain", "web3"],
  },
  filecoin: {
    title: "Filecoin Community Grants",
    description:
      "Apply for grants from the Filecoin community. Browse ProPGF and RetroPGF programs, submit applications, and track your grant status.",
    keywords: ["filecoin", "grants", "funding", "decentralized storage", "blockchain", "web3"],
  },
};

function getEnvVar(tenantId: TenantId, key: string): string | undefined {
  const envKey = `${tenantId.toUpperCase()}_${key}`;
  return process.env[envKey];
}

function slugToDisplayName(slug: string): string {
  return slug
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function getTenantConfig(tenantId: TenantId, communitySlug?: string): TenantConfig {
  const metadata = tenantMetadata[tenantId];

  if (!metadata) {
    return getTenantConfig("karma");
  }

  // Handle non-whitelisted communities using karma config with custom name
  if ((tenantId === "default" || tenantId === "karma") && communitySlug) {
    return {
      id: communitySlug,
      name: slugToDisplayName(communitySlug),
      theme: getTenantTheme("karma"),
      assets: getTenantAssets("karma"),
      karmaAssets: getDefaultAssets(),
      navigation: tenantNavigation.karma,
      content: tenantContent.karma || getDefaultContent(),
      seo: getDefaultSeo(slugToDisplayName(communitySlug)),
      chainId: metadata.chainId,
      apiUrl: getEnvVar("karma", "API_URL"),
      rpcUrl: getEnvVar("karma", "RPC_URL"),
      indexerUrl: getEnvVar("karma", "INDEXER_URL"),
      communitySlug,
      communityUID: metadata.uid,
      claimGrants: getClaimGrantsConfigForTenant("karma"),
    };
  }

  return {
    id: tenantId,
    name: metadata.name,
    theme: getTenantTheme(tenantId),
    assets: getTenantAssets(tenantId),
    karmaAssets: getDefaultAssets(),
    navigation: tenantNavigation[tenantId],
    content: tenantContent[tenantId] || getDefaultContent(),
    seo: tenantSeo[tenantId] || getDefaultSeo(metadata.name),
    chainId: metadata.chainId,
    apiUrl: getEnvVar(tenantId, "API_URL"),
    rpcUrl: getEnvVar(tenantId, "RPC_URL"),
    indexerUrl: getEnvVar(tenantId, "INDEXER_URL"),
    communitySlug: metadata.slug,
    communityUID: metadata.uid,
    claimGrants: getClaimGrantsConfigForTenant(tenantId),
  };
}
