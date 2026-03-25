/**
 * Unit tests for the FAQSection component (/funders page)
 *
 * Tests cover:
 * - Section heading and subtitle rendering
 * - All FAQ questions are passed to the accordion component
 * - Correct number of FAQ items rendered
 * - Semantic structure (section, heading hierarchy)
 *
 * Note: FAQAccordion is mocked in the funders setup, so expand/collapse
 * behavior is tested in the FAQAccordion's own test suite.
 */

import { screen, within } from "@testing-library/react";
import { FAQSection } from "@/src/features/funders/components/faq-section";
import { renderWithProviders } from "../utils/test-helpers";

// Ensure FAQAccordion mock renders testable items (supplements setup mock)
vi.mock("@/src/components/shared/faq-accordion", () => ({
  FAQAccordion: ({ items }: any) => (
    <div data-testid="faq-accordion">
      {items?.map((item: any, idx: number) => (
        <div key={idx} data-testid={`faq-item-${idx}`}>
          {item.question}
        </div>
      ))}
    </div>
  ),
}));

const EXPECTED_FAQ_QUESTIONS = [
  "What is Karma and how does it help funders?",
  "Can we migrate data from other platforms?",
  "Can I try out the platform before committing to it?",
  "Can I run my program on another platform and use Karma just for accountability and impact measurement?",
  "How does Karma ensure accountability and transparency?",
  "Can I integrate my existing funding or evaluation mechanisms?",
  "Can I generate reports and measure impact?",
  "Can Karma integrate with our existing tools or platforms?",
  "Can we launch a whitelabel version of Karma for our ecosystem?",
];

describe("FAQSection Component", () => {
  describe("section structure", () => {
    it("renders a section element with an h2 heading and subtitle", () => {
      const { container } = renderWithProviders(<FAQSection />);

      const section = container.querySelector("section");
      expect(section).toBeInTheDocument();

      const heading = screen.getByRole("heading", { level: 2 });
      expect(heading).toHaveTextContent("Frequently asked questions");

      expect(
        screen.getByText(/Everything you need to know about the product and billing/i)
      ).toBeInTheDocument();
    });
  });

  describe("FAQ content completeness", () => {
    it("renders all 9 FAQ questions via the accordion", () => {
      renderWithProviders(<FAQSection />);

      // The mock FAQAccordion renders each item's question as text
      for (const question of EXPECTED_FAQ_QUESTIONS) {
        expect(screen.getByText(question)).toBeInTheDocument();
      }
    });

    it("passes exactly 9 items to the accordion (one per faq-item testid)", () => {
      renderWithProviders(<FAQSection />);

      const accordion = screen.getByTestId("faq-accordion");
      const items = within(accordion).getAllByTestId(/^faq-item-/);
      expect(items).toHaveLength(9);
    });
  });

  describe("question categories coverage", () => {
    it("includes questions about platform basics, migration, trials, and accountability", () => {
      renderWithProviders(<FAQSection />);

      // Platform basics
      expect(screen.getByText(/What is Karma and how does it help funders/i)).toBeInTheDocument();
      // Migration
      expect(screen.getByText(/Can we migrate data from other platforms/i)).toBeInTheDocument();
      // Trial
      expect(screen.getByText(/Can I try out the platform before committing/i)).toBeInTheDocument();
      // Accountability
      expect(
        screen.getByText(/How does Karma ensure accountability and transparency/i)
      ).toBeInTheDocument();
    });

    it("includes questions about integrations, reports, and whitelabel", () => {
      renderWithProviders(<FAQSection />);

      expect(
        screen.getByText(/Can I integrate my existing funding or evaluation mechanisms/i)
      ).toBeInTheDocument();
      expect(screen.getByText(/Can I generate reports and measure impact/i)).toBeInTheDocument();
      expect(
        screen.getByText(/Can Karma integrate with our existing tools or platforms/i)
      ).toBeInTheDocument();
      expect(screen.getByText(/Can we launch a whitelabel version of Karma/i)).toBeInTheDocument();
    });
  });
});
