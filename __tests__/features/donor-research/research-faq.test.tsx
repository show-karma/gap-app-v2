import { render, screen } from "@testing-library/react";
import { ResearchFaqSection } from "@/src/features/donor-research/components/common/ResearchFaqSection";
import { RESEARCH_FAQS } from "@/src/features/donor-research/content";

describe("RESEARCH_FAQS content", () => {
  it("has a question and a non-empty answer for every entry", () => {
    expect(RESEARCH_FAQS.length).toBeGreaterThanOrEqual(6);
    for (const entry of RESEARCH_FAQS) {
      expect(entry.question).toMatch(/\?$/);
      expect(entry.answer.length).toBeGreaterThan(0);
    }
  });

  it("answers the compliance-check question with the four real checks (P004)", () => {
    const compliance = RESEARCH_FAQS.find((f) => f.question.includes("IRS Pub 78"));
    expect(compliance?.answer).toContain("IRS Publication 78");
    expect(compliance?.answer).toContain("last three years");
    expect(compliance?.answer).toContain("California Attorney General");
    expect(compliance?.answer).toContain("governance");
  });

  it("keeps the state-registry claim scoped to the California AG registry", () => {
    // The product checks exactly one state registry (compliance-checks.ts).
    // Broadening this to \"all states\" would be an unverifiable claim.
    for (const entry of RESEARCH_FAQS) {
      expect(entry.answer).not.toMatch(/all (50 )?states|every state/i);
    }
  });

  it("answers the ranked-shortlist question with the five real dimensions (P003/P042)", () => {
    const shortlist = RESEARCH_FAQS.find((f) => f.question.includes("ranked nonprofit shortlist"));
    expect(shortlist?.answer).toMatch(/^Yes\./);
    for (const dimension of [
      "match with the donor's criteria",
      "compliance",
      "impact recency",
      "online presence",
      "social presence",
    ]) {
      expect(shortlist?.answer).toContain(dimension);
    }
  });

  it("answers the old-990 activity question (P034)", () => {
    const activity = RESEARCH_FAQS.find((f) => f.question.includes("still active"));
    expect(activity?.answer).toContain("Filings lag reality");
  });

  it("positions against Candid/Charity Navigator without describing their products (P009/P041)", () => {
    const comparison = RESEARCH_FAQS.find((f) => f.question.includes("Candid"));
    expect(comparison).toBeDefined();
    // Positioning is about Karma's workflow only — no claims about what
    // competitors do or lack.
    expect(comparison?.answer).not.toMatch(/Candid (does|doesn|lacks|only)/i);
    expect(comparison?.answer).toContain("shortlist");
  });

  it("mentions ChatGPT nowhere (Codex-only copy convention)", () => {
    for (const entry of RESEARCH_FAQS) {
      expect(entry.question).not.toContain("ChatGPT");
      expect(entry.answer).not.toContain("ChatGPT");
    }
  });
});

describe("ResearchFaqSection", () => {
  it("renders every question and answer in the HTML", () => {
    render(<ResearchFaqSection />);

    for (const entry of RESEARCH_FAQS) {
      expect(screen.getByText(entry.question)).toBeInTheDocument();
      expect(screen.getByText(entry.answer)).toBeInTheDocument();
    }
  });
});
