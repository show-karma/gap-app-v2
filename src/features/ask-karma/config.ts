import type { TenantId } from "@/src/infrastructure/types/tenant";
import type { AskKarmaConfig } from "./types";

const DEFAULT_CONFIG: AskKarmaConfig = {
  heading: "Ask us anything",
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
        { label: "Submit a milestone update", href: "/my-projects" },
        { label: "Update project profile", href: "/my-projects" },
        { label: "FAQs", href: "/" },
      ],
    },
  ],
  assistantTitle: "Karma Assistant",
  assistantSubtitle: "Here to help 24/7",
};

const TENANT_CONFIGS: Partial<Record<TenantId, AskKarmaConfig>> = {
  filecoin: {
    heading: "Ask us anything",
    subheading: "Learn how funding works, track project progress, and discover ecosystem insights.",
    inputPlaceholder: "Questions? Ask the Karma Assistant",
    examplesIntro: "Some examples to get the juices flowing:",
    exampleQuestions: [
      "How do I submit a milestone update for my project?",
      "Why can't I access the project I am reviewing?",
      "Which metrics matter most when evaluating project impact?",
      "How is ProPGF currently supporting fil.one?",
      "What is the typical payment timeline after invoice submission?",
      "Are there retrospective reports from previous funding rounds?",
    ],
    featuredTopicsHeading: "Check out these featured topics",
    featuredTopics: [
      {
        icon: "dollar",
        title: "The Next ProPGF Round (General Track)",
        links: [
          { label: "Round 3 Announcement", href: "https://filpgf.io/propgf", isExternal: true },
          { label: "Selection Committee", href: "https://filpgf.io/propgf", isExternal: true },
          {
            label: "Retro from previous rounds",
            href: "https://filpgf.io/propgf",
            isExternal: true,
          },
        ],
      },
      {
        icon: "trending-up",
        title: "Track Active Projects",
        description: "Review the progress of funded projects in ProPGF",
        cta: { label: "View Funded Projects", href: "/projects" },
      },
      {
        icon: "settings",
        title: "Navigate filpgf.io",
        links: [
          { label: "ProPGF Grantee Guide", href: "https://filpgf.io/propgf", isExternal: true },
          { label: "Milestone Reviewer Guide", href: "https://filpgf.io/propgf", isExternal: true },
          { label: "FAQs", href: "https://filpgf.io/propgf", isExternal: true },
        ],
      },
      {
        icon: "document",
        title: "Focus Areas",
        links: [
          { label: "Large Data Onboarding", href: "https://filpgf.io/propgf", isExternal: true },
          { label: "Filecoin Onchain Cloud", href: "https://filpgf.io/propgf", isExternal: true },
          { label: "Fil.one", href: "https://filpgf.io/propgf", isExternal: true },
        ],
      },
      {
        icon: "chart",
        title: "Metrics and Strategy",
        links: [
          { label: "2026 Network Strategy", href: "https://filpgf.io/propgf", isExternal: true },
          { label: "ProPGF Project Impact", href: "https://filpgf.io/propgf", isExternal: true },
        ],
      },
      {
        icon: "back",
        title: "RetroPGF",
        links: [
          { label: "About RetroPGF", href: "https://www.fil-retropgf.io/", isExternal: true },
          { label: "Past rounds", href: "https://www.fil-retropgf.io/", isExternal: true },
        ],
      },
    ],
    assistantTitle: "Karma Assistant",
    assistantSubtitle: "Here to help 24/7",
  },
};

export function getAskKarmaConfig(
  tenantId?: TenantId | string | null,
  _communitySlug?: string | null
): AskKarmaConfig {
  if (tenantId && TENANT_CONFIGS[tenantId as TenantId]) {
    return TENANT_CONFIGS[tenantId as TenantId] as AskKarmaConfig;
  }
  return DEFAULT_CONFIG;
}
