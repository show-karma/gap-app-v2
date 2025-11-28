/**
 * Mock FAQ data for funders page tests
 */

import type { FAQItem } from "@/src/components/shared/faq-accordion";

export const mockFAQItems: FAQItem[] = [
  {
    id: "what-is-karma",
    question: "What is Karma and how does it help funders?",
    answer:
      "Karma is a **modular funding and impact infrastructure** that helps you design, launch, and manage funding programs in days.",
  },
  {
    id: "migrate-data",
    question: "Can we migrate data from other platforms?",
    answer:
      "If you were using another funding platform in the past, we will help you import all the historical data into Karma's funding platform.",
  },
  {
    id: "try-out-platform",
    question: "Can I try out the platform before committing to it?",
    answer:
      "Absolutely. Just [reach out to us](https://tally.so/r/3NKZEl) and we can help you get started right away.",
  },
];
