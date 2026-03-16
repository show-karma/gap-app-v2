export interface SolutionFAQ {
  question: string;
  answer: string;
}

export interface ComparisonRow {
  feature: string;
  karma: string;
  competitors: string;
}

export interface Step {
  title: string;
  description: string;
}

export interface Testimonial {
  quote: string;
  author: string;
  role: string;
  organization: string;
}

export interface SolutionPage {
  slug: string;
  title: string;
  metaDescription: string;
  heading: string;
  tldr: string;
  problem: {
    heading: string;
    description: string;
  };
  solution: {
    heading: string;
    description: string;
  };
  capabilities: string[];
  faqs: SolutionFAQ[];
  ctaText: string;
  ctaHref: string;

  /** Optional: "Who This Is For" audience bullets */
  idealFor?: string[];

  /** Optional: comparison table for alternative/comparison pages */
  comparisonTable?: {
    headers: [string, string, string];
    rows: ComparisonRow[];
  };

  /** Optional: step-by-step process for guide pages */
  steps?: Step[];

  /** Optional: testimonial for social proof */
  testimonial?: Testimonial;

  /** Optional: secondary CTA with different destination */
  secondaryCta?: {
    text: string;
    href: string;
  };

  /** Optional: publication date for freshness signals (ISO string) */
  datePublished?: string;
}
