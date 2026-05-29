import { isKnownTenant, type KnownTenantId } from "@/src/infrastructure/types/tenant";
import type { AskKarmaConfig } from "./types";

const DEFAULT_CONFIG: AskKarmaConfig = {
  heading: "Ask Karma",
  subheading: "Learn how funding works, track project progress, and discover ecosystem insights.",
  inputPlaceholder: "Questions? Ask the Karma Assistant",
  examplesIntro: "Some examples to get the juices flowing:",
  exampleQuestions: [
    "How do I submit a milestone update for my project?",
    "Why can't I access the project I am reviewing?",
    "Which metrics matter most when evaluating project impact?",
    "What is the typical payment timeline after invoice submission?",
    "Are there retrospective reports from previous funding rounds?",
    "How do I apply to an open funding round?",
  ],
  featuredTopicsHeading: "Check out these featured topics",
  featuredTopics: [
    {
      icon: "dollar",
      title: "Open Funding Rounds",
      description: "Browse active programs accepting applications",
      links: [
        // TODO(ask-karma): replace placeholder hrefs with real destinations
        { label: "View open rounds", href: "/funding-opportunities" },
        { label: "How applications work", href: "/" },
      ],
    },
    {
      icon: "trending-up",
      title: "Track Active Projects",
      description: "Review the progress of funded projects",
      cta: { label: "View Funded Projects", href: "/projects" },
    },
    {
      icon: "settings",
      title: "Project Management",
      links: [
        // TODO(ask-karma): replace placeholder hrefs with real destinations
        { label: "Submit a milestone update", href: "/my-projects" },
        { label: "Update project profile", href: "/my-projects" },
        { label: "FAQs", href: "/" },
      ],
    },
  ],
  assistantTitle: "Karma Assistant",
  assistantSubtitle: "Here to help 24/7",
};

// Tenant-specific configs override DEFAULT_CONFIG. Shared boilerplate fields
// (assistantTitle, subheading, etc.) flow through the spread so future
// per-tenant configs stay minimal — override only what differs.
const TENANT_CONFIGS: Partial<Record<KnownTenantId, AskKarmaConfig>> = {
  filecoin: {
    ...DEFAULT_CONFIG,
    exampleQuestions: [
      "How do I submit a milestone update for my project?",
      "Why can't I access the project I am reviewing?",
      "What is the typical payment timeline after invoice submission?",
      "Are there retrospective reports from previous funding rounds?",
    ],
    featuredTopics: [
      {
        icon: "dollar",
        title: "The Next ProPGF Round (General Track)",
        links: [
          // No href → renders as "coming soon" (muted, non-interactive)
          { label: "Round 3 Announcement" },
          { label: "Selection Committee" },
          {
            label: "Retro from previous rounds",
            href: "https://www.filecoin.io/blog/reflections-from-propgf-batch-1-what-we-learned-about-funding-impact-in-the-filecoin-ecosystem",
            isExternal: true,
          },
        ],
      },
      {
        icon: "trending-up",
        title: "Track Active Projects",
        description: "Review the progress of funded projects in ProPGF",
        // Community-scoped path so users stay inside Filecoin's project list
        // regardless of which domain they're on (whitelabel rewrites the
        // /community/filecoin prefix away automatically).
        cta: { label: "View Funded Projects", href: "/community/filecoin/projects" },
      },
      {
        icon: "settings",
        title: "Navigate filpgf.io",
        links: [
          {
            label: "ProPGF Grantee Guide",
            href: "https://docs.gap.karmahq.xyz/how-to-guides/partners/filecoin/propgf-grantee-guide",
            isExternal: true,
          },
          {
            label: "Milestone Reviewer Guide",
            href: "https://docs.gap.karmahq.xyz/how-to-guides/partners/filecoin/milestone-reviewer-guide",
            isExternal: true,
          },
        ],
      },
      {
        icon: "document",
        title: "Focus Areas",
        links: [
          {
            label: "Filecoin Onchain Cloud",
            href: "https://filecoin.cloud/",
            isExternal: true,
          },
          { label: "Fil.one", href: "https://fil.one/", isExternal: true },
        ],
      },
      {
        icon: "chart",
        title: "Metrics and Strategy",
        links: [
          {
            label: "2026 Network Strategy",
            href: "https://www.filecoin.io/blog/the-2026-filecoin-network-strategy",
            isExternal: true,
          },
          {
            label: "Filecoin Data Portal",
            href: "https://filecoindataportal.xyz/",
            isExternal: true,
          },
        ],
      },
      {
        icon: "back",
        title: "RetroPGF",
        links: [
          { label: "About RetroPGF", href: "https://www.fil-retropgf.io/", isExternal: true },
          {
            label: "Past rounds",
            href: "https://www.fil-retropgf.io/archive/round-2/",
            isExternal: true,
          },
        ],
      },
    ],
  },
};

/**
 * Resolve the ask-karma config for a tenant. Accepts either a known tenant
 * id or an arbitrary community slug — falls through to DEFAULT_CONFIG when
 * the lookup key isn't a known tenant. The `isKnownTenant` type guard keeps
 * the table lookup type-safe without an `as` cast.
 */
export function getAskKarmaConfig(lookupKey?: string | null): AskKarmaConfig {
  if (lookupKey && isKnownTenant(lookupKey)) {
    return TENANT_CONFIGS[lookupKey] ?? DEFAULT_CONFIG;
  }
  return DEFAULT_CONFIG;
}
