/**
 * Audience switcher content + hash routing tables.
 *
 * Kept separate from the AudienceSwitcher component so copy edits don't
 * touch interaction logic, and so the donors panel can share its canonical
 * copy with /donor-advisors (see src/features/donor-advisors/content.ts).
 */

import {
  donorResearchBriefPreview,
  donorResearchFeatures,
  type MarketingFeature,
} from "@/src/features/donor-advisors/content";
import { PAGES } from "@/utilities/pages";
import { SOCIALS } from "@/utilities/socials";

export type AudienceKey = "foundations" | "donors" | "nonprofits";

export const KEY_TO_HASH: Record<AudienceKey, string> = {
  foundations: "foundations",
  donors: "donors-advisors",
  nonprofits: "nonprofits",
};

const HASH_TO_KEY: Record<string, AudienceKey> = {
  foundations: "foundations",
  "donors-advisors": "donors",
  donors: "donors",
  nonprofits: "nonprofits",
};

export function readAudienceFromHash(): AudienceKey | null {
  if (typeof window === "undefined") return null;
  const raw = window.location.hash.replace(/^#/, "");
  return HASH_TO_KEY[raw] ?? null;
}

export interface PreviewImage {
  src: string;
  alt: string;
  width: number;
  height: number;
  caption?: string;
}

export interface LayeredPreview {
  /** Omit front/back to use LayeredScreenshots' default product shots. */
  front?: { src: string; alt: string; width: number; height: number };
  back?: { src: string; alt: string; width: number; height: number };
  caption?: string;
}

export interface AudiencePanel {
  key: AudienceKey;
  tabLabel: string;
  headline: string;
  subhead: string;
  features: MarketingFeature[];
  primaryCta: { label: string; href: string; external?: boolean };
  /** Optional: some panels have only a single primary action. */
  secondaryCta?: { label: string; href: string; external?: boolean };
  /** Use `layeredPreview` for the two-screenshot composition; otherwise
      pass a single `preview` image. The render path picks layered first. */
  preview?: PreviewImage;
  layeredPreview?: LayeredPreview;
}

export const PANELS: AudiencePanel[] = [
  {
    key: "foundations",
    tabLabel: "Foundations",
    headline: "AI-powered funding software that does the work for you.",
    subhead:
      "Run grants, hackathons, and RFPs with a lean team. Karma's AI agents handle evaluation, milestone tracking, and impact reporting, so your team focuses on funding outcomes, not data entry.",
    features: [
      {
        label: "AI evaluation",
        title: "Cut review time by 70%",
        description:
          "Agents score every application against your rubric, flag risks, and surface the strongest proposals. Your team focuses on decisions, not reading.",
      },
      {
        label: "Automated milestone tracking",
        title: "Accountability that runs itself",
        description:
          "Grantees submit milestone updates with proof of work. Karma's agents check them against your criteria and flag what needs attention.",
      },
      {
        label: "Continuous impact reporting",
        title: "Board-ready reports, always current",
        description:
          "Agents aggregate outcomes across your portfolio and keep impact reports up to date. No quarterly scramble.",
      },
      {
        label: "Bring your own agent",
        title: "Use Karma from ChatGPT, Claude, or your own AI",
        description:
          "Connect any AI agent to your Karma instance via MCP to generate reports, query applications, and track milestones from the chat you already use.",
      },
    ],
    primaryCta: { label: "See how foundations use Karma", href: PAGES.FOUNDATIONS },
    secondaryCta: { label: "Schedule a demo", href: SOCIALS.PARTNER_FORM },
    // front/back omitted: LayeredScreenshots' defaults are these exact shots.
    layeredPreview: {
      caption: "Application evaluation and project registry.",
    },
  },
  {
    key: "donors",
    tabLabel: "Donors & Advisors",
    headline: "A research brief for every gift, ready in 10 minutes.",
    subhead:
      "Karma's Donor Research scans thousands of 501(c)(3)s against your cause, geography, and grant size, then returns a ranked brief with compliance verified, activity scored, and mission matched. You move from “I want to give” to “here's the shortlist” in one session, not three weeks.",
    features: donorResearchFeatures,
    primaryCta: { label: "Try Donor Research", href: PAGES.DONOR_RESEARCH },
    secondaryCta: { label: "Talk to our team", href: SOCIALS.DONOR_PARTNER_FORM },
    preview: donorResearchBriefPreview,
  },
  {
    key: "nonprofits",
    tabLabel: "Nonprofits",
    headline: "Just share your website. We'll do the rest.",
    subhead:
      "Karma indexes your site to build a funder-facing profile, then keeps it current by pulling your latest from your blog, socials, and press. Free for nonprofits. Funders pay us, not you.",
    features: [
      {
        label: "Drop your URL",
        title: "We build the profile from your website",
        description:
          "Karma indexes your site to surface your mission, work, impact stories, and team. A funder-facing profile ships in minutes. We email you if anything is missing.",
      },
      {
        label: "Always current",
        title: "Latest blogs, socials, and press, automatically",
        description:
          "Karma watches your public web. New blog posts, social updates, and press mentions flow into your profile so funders see what you're doing right now.",
      },
      {
        label: "Funders find you",
        title: "Live profile in front of active funders",
        description:
          "Karma is where foundations and donors search for grantees. A current, complete profile puts your work in their results.",
      },
    ],
    primaryCta: { label: "Add your nonprofit free", href: PAGES.NONPROFITS },
    preview: {
      src: "/images/homepage/karma-nonprofit-public-profile.png",
      alt: "Karma nonprofit public profile for Greenaction for Health & Environmental Justice, showing 501(c)(3) verification, latest public updates pulled from blogs and press, public data freshness score 96/100, compliance checks, and potential funder fits",
      width: 1797,
      height: 875,
      caption: "Funder-facing profile, assembled from your website.",
    },
  },
];
