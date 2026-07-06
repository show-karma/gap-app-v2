import { isKnownTenant, type KnownTenantId } from "@/src/infrastructure/types/tenant";
import { PAGES } from "@/utilities/pages";
import type { AskKarmaConfig, AskKarmaPersona } from "./types";

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
  exampleQuestionsByPersona: {
    visitor: [
      "What is Karma GAP?",
      "What types of projects receive funding?",
      "How do I apply or get involved?",
      "When does the next funding round open?",
      "How does the funding process work?",
    ],
    reviewer: [
      "Why can't I access the project I am reviewing?",
      "What milestones or proposals are pending my review?",
      "Which metrics matter most when evaluating project impact?",
      "What is the review process for grant proposals?",
    ],
    grantee: [
      "Why can't I submit project updates?",
      "How do I submit a milestone update for my project?",
      "When will my invoice be processed?",
      "When are my milestone updates due?",
      "What should I include in my milestone update?",
    ],
  },
  featuredTopicsHeading: "Check out these featured topics",
  featuredTopics: [
    {
      icon: "dollar",
      title: "Open Funding Rounds",
      description: "Browse active programs accepting applications",
      links: [
        { label: "View open rounds", href: PAGES.REGISTRY.ROOT },
        { label: "How applications work", href: "/knowledge/grant-lifecycle" },
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
        { label: "Submit a milestone update", href: PAGES.MY_PROJECTS },
        { label: "Update project profile", href: PAGES.MY_PROJECTS },
        { label: "FAQs", href: "/knowledge/project-updates-and-reputation" },
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
    exampleQuestionsByPersona: {
      visitor: [
        "What is ProPGF?",
        "What is RetroPGF?",
        "What types of projects receive funding?",
        "How do I apply or get involved?",
        "When does the next funding round open?",
      ],
      reviewer: [
        "How come I don't have reviewer access for a project?",
        "What milestones or proposals are pending my review?",
        "What is the criteria for Batch 3 General Track proposals?",
        "What is the review process for Batch 3 Grant proposals?",
      ],
      grantee: [
        "How come I don't have access to submit project updates?",
        "How do I submit a milestone update for my project?",
        "When will my invoice be processed?",
        "When are my milestone updates due?",
        "What should I include in my milestone update?",
      ],
    },
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

// A reviewer is usually a grantee too, so their prompts lead with the
// review-focused set and top up with grantee questions. Capped so the chip
// row stays scannable rather than turning into a wall of suggestions.
const REVIEWER_PROMPT_LIMIT = 6;

/**
 * Pick the start-screen prompts for a persona. Tenants that don't define
 * `exampleQuestionsByPersona` (or omit a given persona) fall back to the flat
 * `exampleQuestions` list, so this is safe for every config.
 *
 * Reviewers get a blended list — their review prompts first, then grantee
 * prompts to fill out the row — because a reviewer is typically a grantee as
 * well and benefits from both.
 */
export function selectAskKarmaQuestions(
  config: AskKarmaConfig,
  persona: AskKarmaPersona
): string[] {
  const byPersona = config.exampleQuestionsByPersona;
  if (!byPersona) return config.exampleQuestions;

  if (persona === "visitor") return byPersona.visitor ?? config.exampleQuestions;
  if (persona === "grantee") return byPersona.grantee ?? config.exampleQuestions;

  // Reviewer: lead with review prompts, then fill from grantee prompts.
  const reviewer = byPersona.reviewer ?? [];
  if (reviewer.length === 0) return byPersona.grantee ?? config.exampleQuestions;

  const blended = [...reviewer];
  const seen = new Set(reviewer);
  for (const question of byPersona.grantee ?? []) {
    if (blended.length >= REVIEWER_PROMPT_LIMIT) break;
    if (!seen.has(question)) {
      seen.add(question);
      blended.push(question);
    }
  }
  return blended;
}
