/**
 * Mock FAQ Data for Homepage Tests
 */

export interface MockFAQItem {
  id: string;
  question: string;
  answer: string;
}

export const mockFAQItems: MockFAQItem[] = [
  {
    id: "what-is-karma",
    question: "What is Karma and how can it help my project?",
    answer: "Karma is a modular funding and impact platform that helps you **showcase your work, attract funding, and build your onchain reputation**. You can share progress, complete milestones, and receive endorsements that boost your credibility across ecosystems.",
  },
  {
    id: "program-requirement",
    question: "Do I need to be part of a specific program or community to use Karma?",
    answer: "No, you can create your project profile anytime. Think of your project profile as a resume. If your project is part of a grant program, hackathon, or ecosystem that partners with Karma, it will appear automatically. If not, you can easily add your grant by following the steps in our guide.",
  },
  {
    id: "project-profile-info",
    question: "What kind of information should I include in my project profile?",
    answer: "Your profile is your public, onchain portfolio. Include: A clear description of your project and goals, Milestones or deliverables you plan to achieve, Updates on your progress (with links, screenshots, or metrics), Any impact results or endorsements you receive. The more complete your profile, the easier it is for funders and collaborators to discover and trust your work.",
  },
  {
    id: "track-verify-progress",
    question: "How does Karma track and verify project progress?",
    answer: "Karma lets you post **updates, complete milestones, and attach evidence** (documents, links, metrics, attestations). These are reviewed or automatically verified depending on your program setup. Verified milestones strengthen your project's credibility and onchain impact record.",
  },
  {
    id: "receive-funding",
    question: "Can I receive funding or donations directly through Karma?",
    answer: "**Yes.** You can log in and enable donations to accept **fiat or crypto** across multiple networks. Karma also functions as a **funding platform**. If your project is part of a program hosted on Karma, you can receive **direct payments** from that program or community.",
  },
  {
    id: "data-reputation",
    question: "What happens to my data and reputation after my program ends?",
    answer: "Your project's profile and verified impact remain **permanently available onchain**. This means your history travels with you, helping you qualify faster for future funding, collaborations, or opportunities across other ecosystems using Karma.",
  },
  {
    id: "metrics-display",
    question: "How do I make my metrics show up on my profile impact page?",
    answer: "Once you create your profile, you can link your github and onchain contracts. We will automatically fetch and display those metrics. You can also input your metrics manually.",
  },
  {
    id: "gas-fees",
    question: "Do I need to pay gas fees to update my project or post progress?",
    answer: "**Yes, for now.** Since all project data is stored onchain, you'll need to pay a small gas fee when updating your project or posting progress. We're actively working on **gasless transactions**, so soon you'll be able to update your project **without paying gas or holding crypto** in your wallet.",
  },
];

/**
 * Create a mock FAQ item
 */
export const createMockFAQItem = (overrides: Partial<MockFAQItem> = {}): MockFAQItem => ({
  id: overrides.id || `faq-${Math.random().toString(36).substr(2, 9)}`,
  question: overrides.question || "Test FAQ question?",
  answer: overrides.answer || "Test FAQ answer with some details.",
});

/**
 * Get a specific number of FAQ items
 */
export const getMockFAQItems = (count: number): MockFAQItem[] => {
  return mockFAQItems.slice(0, count);
};

/**
 * Get FAQ item by ID
 */
export const getFAQItemById = (id: string): MockFAQItem | undefined => {
  return mockFAQItems.find((item) => item.id === id);
};

