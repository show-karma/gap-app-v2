/**
 * Mock case study data for funders page tests
 */

export interface MetricCard {
  type: "metric";
  metric: string;
  description: string;
  communitySlugs: string[];
}

export interface TestimonialCard {
  type: "testimonial";
  text: string;
  author: string;
  authorRole: string;
  communitySlug: string;
  link?: string;
  avatar?: string;
}

export interface CaseStudyCard {
  type: "case-study";
  headline: string;
  description: string;
  communitySlug: string;
  link?: string;
  author?: string;
  authorRole?: string;
}

export type CaseStudyCardType = MetricCard | TestimonialCard | CaseStudyCard;

export const mockCaseStudyCards: CaseStudyCardType[] = [
  {
    type: "testimonial",
    text: "Karma isn't just software, they're a true partner. Their AI-driven evaluations cut review time dramatically.",
    author: "Gonna",
    authorRole: "Optimism Grants Council Lead",
    communitySlug: "optimism",
    avatar: "/images/homepage/gonna.png",
  },
  {
    type: "case-study",
    headline: "100+ hours saved on application evaluation",
    description: "Leverage AI to evaluate grant applications at scale.",
    communitySlug: "optimism",
    link: "https://paragraph.com/@karmahq/optimism-grants-partners-with-karma-for-season-8",
  },
  {
    type: "case-study",
    headline: "3,600+ Milestones completed by Celo grant recipients in 10 months",
    description: "Over the past 10 months, Celo has leveraged Karma's platform to track 400+ projects.",
    communitySlug: "celo",
    link: "https://paragraph.com/@karmahq/scaling-ecosystem-success-celo-case-study",
  },
  {
    type: "testimonial",
    text: "Karma has been a valuable partner in helping us grow and support the Celo developer community.",
    author: "Sophia Dew",
    authorRole: "Celo Devrel Lead",
    communitySlug: "celo",
    avatar: "/images/homepage/sophia-dew.png",
  },
];

