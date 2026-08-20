import { COMMITMENTS_AND_DISBURSEMENTS } from "@/utilities/community-nav";
import type { TenantId, TenantNavigation } from "../types/tenant";

/**
 * Report-config ids for the Filecoin community, as returned by
 * `GET /v2/communities/filecoin/reports/published` (`reportConfigId`). The
 * labels below are the `reportConfigName` each id resolves to — verified
 * against that endpoint, and the reason these are named rather than inlined:
 * a bare id in an href literal cannot be checked against anything.
 *
 * Linking by type (rather than to a dated report) always lands on the latest
 * report of that type, so these never need a manual date bump.
 * `PublicReportListPage` reads `?type=` via nuqs and matches it against
 * `report.reportConfigId`.
 *
 * Mirrored on the marketing site in `filecoin-grants/src/data/site.ts`
 * (REPORT_TYPES) — the two live in different repos, so a new report type has
 * to be added in both.
 */

const FILECOIN_REPORT_CONFIG_IDS = {
  /** "Filecoin ProPGF Monthly" — the programme-wide monthly. */
  propgfMonthly: "69e70e9a641448585f44e961",
  /** "Monthly Pods Report" — the Pods track's own monthly. */
  monthlyPods: "6a23268272df01209256e5b9",
  /** "Bi-Weekly Progress Report" */
  biweeklyProgress: "6a233d04e82a77f23c7838f7",
} as const;

/** Latest Filecoin report of one type. Whitelabel-relative — see the nav below. */
const filecoinReportHref = (type: keyof typeof FILECOIN_REPORT_CONFIG_IDS) =>
  `/reports?type=${FILECOIN_REPORT_CONFIG_IDS[type]}`;

export const tenantNavigation: Record<TenantId, TenantNavigation> = {
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
    header: {
      title: "Filecoin Community",
      shouldHaveTitle: true,
      poweredBy: true,
      wordmark: {
        prefix: "fil",
        accent: "pgf",
        suffix: ".io",
        href: "https://filpgf.io",
        // The filecoin tenant also serves grants.filecoin.io, which is not the
        // filpgf.io brand — it keeps the logo + title brand linking to the app.
        domains: ["app.filpgf.io"],
        // Light accent matches the landing site brand color; the dark accent is
        // the filecoin tenant primary, for contrast on the dark navbar.
        accentColor: "#1a5fd0",
        accentColorDark: "#0090ff",
        ariaLabel: "filpgf.io home",
      },
    },
    showBrowseApplications: false,
    items: [
      {
        label: "Funding",
        items: [
          { label: "Overview", href: "https://filpgf.io/propgf/", isExternal: true },
          // Whitelabel-only navbar, so the clean path is safe here and saves the
          // /community/filecoin/* -> / redirect hop.
          { label: COMMITMENTS_AND_DISBURSEMENTS, href: "/financials" },
          { label: "RetroPGF", href: "https://www.fil-retropgf.io/", isExternal: true },
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
                label: "Batch 3",
                href: "https://app.filpgf.io/projects?programId=1479",
                isExternal: true,
              },
              {
                label: "Pods Track",
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
                label: "Batch 3",
                href: "https://app.filpgf.io/browse-applications?programId=1479",
                isExternal: true,
              },
              {
                label: "Pods Track",
                href: "https://app.filpgf.io/browse-applications?programId=1039",
                isExternal: true,
              },
            ],
          },
        ],
      },
      {
        label: "Reports",
        // Labels are the config names the reports API returns for these ids —
        // see FILECOIN_REPORT_CONFIG_IDS.
        items: [
          { label: "Filecoin ProPGF Monthly", href: filecoinReportHref("propgfMonthly") },
          { label: "Monthly Pods Report", href: filecoinReportHref("monthlyPods") },
          { label: "Bi-Weekly Progress Report", href: filecoinReportHref("biweeklyProgress") },
          { label: "All reports", href: "/reports" },
        ],
      },
      { label: "Blog", href: "https://filpgf.io/blog/", isExternal: true },
      {
        label: "About",
        items: [
          { label: "Filecoin", href: "https://www.filecoin.io/learn", isExternal: true },
          { label: "Upcoming Events", href: "https://fil.org/events/", isExternal: true },
        ],
      },
    ],
    /* This tenant calls the social-links menu "Connect", not "Resources". */
    socialLinksLabel: "Connect",
    socialLinks: {
      twitter: "https://twitter.com/Filecoin",
      discord: "https://discord.gg/yeQ2hcd2TD",
      github: "https://github.com/filecoin-project",
    },
    socialLinkLabels: {
      twitter: "Social",
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
