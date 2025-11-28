/**
 * Mock platform card data for funders page tests
 */

import type { PlatformCard } from "@/src/features/funders/components/platform-section";

export const mockPlatformCards: PlatformCard[] = [
  {
    subtitle: "Application Evaluation",
    title: "Smarter decisions with AI-powered evaluation",
    description:
      "Leverage AI to evaluate grant applications at scale. Get instant scoring, risk assessments, and funding recommendations based on historical performance, cross-ecosystem reputation, and proposal quality—so you can review and approve funding with confidence.",
    image: "/images/homepage/funder-benefit-01.png",
  },
  {
    subtitle: "Public Registry",
    title: "One place for all projects and their progress",
    description:
      "A public registry of every project in your ecosystem with complete visibility into funding, milestones, and updates. Track project progress in real-time as grantees submit milestone updates with proof of work.",
    image: "/images/homepage/funder-benefit-02.png",
  },
  {
    subtitle: "Impact",
    title: "Measure what matters with real-time insights",
    description:
      "Track project metrics automatically through GitHub, Dune, and custom integrations. Apply the industry-leading 'Common Approach' framework to measure impact, evaluate performance in real time, and continuously improve your funding program.",
    image: "/images/homepage/funder-benefit-03.png",
  },
  {
    subtitle: "Distribution",
    title: "Funding methods to meet your needs",
    description:
      "Support projects smarter: issue direct grants with AI-driven evaluations and milestone-based funding, then scale impact with our retro funding platform.",
    image: "/images/homepage/funder-benefit-04.png",
  },
];

/**
 * Factory function to create a mock platform card with custom properties
 */
export function createMockPlatformCard(overrides: Partial<PlatformCard> = {}): PlatformCard {
  return {
    subtitle: "Test Feature",
    title: "Test Platform Feature",
    description: "A test platform feature for unit testing.",
    image: "/images/test-feature.png",
    ...overrides,
  };
}
