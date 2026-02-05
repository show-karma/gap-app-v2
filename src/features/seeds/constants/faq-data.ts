import type { FAQItem } from "@/src/components/shared/faq-accordion";

export const seedsFAQs: FAQItem[] = [
  {
    id: "what-are-karma-seeds",
    question: "What are Karma Seeds?",
    answer:
      "Karma Seeds are $1 receipts. For every dollar you contribute to a project, you receive one Seed—an ERC-20 token that lives in your wallet as proof of support. They're markers of early belief, not speculative investments.",
  },
  {
    id: "price-maintained",
    question: "How is the $1 price maintained?",
    answer:
      "Seeds are purchased directly through project's contract at a fixed 1:1 rate. There's no secondary market trading built in—Seeds are receipts of support, not trading assets.",
  },
  {
    id: "holding-benefits",
    question: "What do I get for holding Seeds?",
    answer:
      "Seeds in your wallet prove you supported a project early. Projects (if they choose to) can reward Seed holders with early access, rev share, or future token allocations.",
  },
  {
    id: "transfer-sell",
    question: "Can I transfer my Seeds?",
    answer:
      "Yes. Seeds are standard ERC-20 tokens, so they can be transferred like any other token. They're designed as support receipts—portable and composable.",
  },
  {
    id: "launch-seeds",
    question: "How do projects launch Seeds?",
    answer:
      "Any project on Karma can launch Seeds. Go to your project dashboard, click 'Launch Seeds', set your treasury address, and you're ready to accept support from your community.",
  },
  {
    id: "real-token-launch",
    question: "What if a project launches a token later?",
    answer:
      "This is up to each project. Many use Seeds as a foundation—later launching a full token and allocating a portion to Seed holders. Seeds keep this option open without forcing a decision.",
  },
  {
    id: "fees",
    question: "What are the fees?",
    answer:
      "There's a 3% platform fee that goes to Karma. The rest goes directly to the project's treasury address.",
  },
];
