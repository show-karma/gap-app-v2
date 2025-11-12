/**
 * Mock offering/pricing tier data for funders page tests
 */

import type { PricingTier } from "@/src/features/funders/components/offering-section";

export const mockPricingTiers: PricingTier[] = [
  {
    name: "Starter",
    description: "Start your accountability journey with limited distribution capabilities",
    features: [
      "Track up to 100 projects & 25 grants",
      "Milestone tracking with onchain attestations",
      "Full API access + 3 integrations (GitHub, Dune, CSV)",
      "Email support (48hr response)",
    ],
    mostPopular: false,
  },
  {
    name: "Pro",
    description: "Scale to unlimited funding rounds with full platform capabilities",
    features: [
      "Track up to 500 projects with unlimited grants",
      "AI application review & impact assessment",
      "8 integrations + Web3 bundle (Discord, Telegram)",
      "Dedicated Telegram support (24hr) + monthly check-ins",
    ],
    mostPopular: true,
  },
  {
    name: "Enterprise",
    description: "Continuous grant operations with custom deployment options",
    features: [
      "Track 2,000+ projects with unlimited grants & API usage",
      "All AI automation + full ecosystem intelligence",
      "Multi-chain deployments with white-label branding",
      "Dedicated success manager + 4-hour critical SLA",
      "Custom agentic grants council",
    ],
    mostPopular: false,
  },
];

