/**
 * Mock statistics data for funders page tests
 */

export interface Statistic {
  number: string;
  title: string;
  description: string;
}

export const mockStatistics: Statistic[] = [
  {
    number: "30+",
    title: "Ecosystems supported",
    description: "From Optimism to Celo, we've helped leading ecosystems run high-impact funding programs",
  },
  {
    number: "4k",
    title: "Projects tracked",
    description: "Builders using Karma to share progress, milestones, and impact",
  },
  {
    number: "50k",
    title: "Onchain attestations",
    description: "Verified milestones, endorsements, and evaluations across programs",
  },
  {
    number: "4x faster",
    title: "Program Launch Time",
    description: "Ecosystems go from idea to live funding in under 48 hours with our modular infrastructure",
  },
];

/**
 * Factory function to create a mock statistic with custom properties
 */
export function createMockStatistic(overrides: Partial<Statistic> = {}): Statistic {
  return {
    number: "100+",
    title: "Test Metric",
    description: "A test statistic for unit testing.",
    ...overrides,
  };
}

