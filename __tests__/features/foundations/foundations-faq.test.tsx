import { render, screen } from "@testing-library/react";
import { FoundationsFaqSection } from "@/src/features/foundations/components/foundations-faq-section";
import { FOUNDATION_FAQS } from "@/src/features/foundations/content";

describe("FOUNDATION_FAQS content", () => {
  it("has a question and a non-empty answer for every entry", () => {
    // Union of the pre-existing JSON-LD set (8), the two accordion-only
    // questions, and the four new lifecycle answers.
    expect(FOUNDATION_FAQS).toHaveLength(14);
    const questions = FOUNDATION_FAQS.map((f) => f.question);
    expect(new Set(questions).size).toBe(questions.length);
    for (const entry of FOUNDATION_FAQS) {
      expect(entry.question).toMatch(/\?$/);
      expect(entry.answer.length).toBeGreaterThan(0);
    }
  });

  it("keeps every pre-existing question (union, not replacement)", () => {
    const questions = FOUNDATION_FAQS.map((f) => f.question);
    for (const legacy of [
      "What is Karma?",
      "Who is Karma for?",
      "What is Karma for foundations?",
      "How is Karma different from other grant management tools?",
      "How do AI agents work in Karma?",
      "Can we migrate from our current setup?",
      "Do we have to use everything?",
      "Do I still need a grants team?",
      "Do we get reports for our board?",
      "Can we run it under our own brand?",
    ]) {
      expect(questions).toContain(legacy);
    }
  });

  it("answers grantee tracking and impact reporting (P002/P027)", () => {
    const tracking = FOUNDATION_FAQS.find((f) =>
      f.question.includes("grantee tracking and impact reporting")
    );
    expect(tracking?.answer).toContain("project profile");
    expect(tracking?.answer).toContain("proof of work");
    expect(tracking?.answer).toContain("board-ready");
  });

  it("answers milestone-gated payments (P010) from the disbursement model", () => {
    const payments = FOUNDATION_FAQS.find((f) =>
      f.question.includes("before releasing the next payment")
    );
    expect(payments?.answer).toMatch(/^Yes\./);
    expect(payments?.answer).toContain("per-milestone breakdown");
    expect(payments?.answer).toContain("Safe multisig");
  });

  it("answers AI-assisted review without an unverifiable time-saved figure (P015/P019/P047)", () => {
    const review = FOUNDATION_FAQS.find((f) => f.question.includes("AI-assisted application"));
    expect(review?.answer).toContain("rubric");
    expect(review?.answer).toContain("Bulk evaluation");
    // No made-up efficiency stat: the repo has no verifiable number.
    expect(review?.answer).not.toMatch(/\d+\s*(%|percent|hours|x)/i);
  });

  it("compares to other platforms without naming competitors (P001/P006/P008)", () => {
    const comparison = FOUNDATION_FAQS.find((f) => f.question.includes("different from other"));
    expect(comparison).toBeDefined();
    for (const competitor of ["Fluxx", "Submittable", "Foundant", "Sopact", "Blackbaud"]) {
      for (const entry of FOUNDATION_FAQS) {
        expect(entry.answer).not.toContain(competitor);
      }
    }
    expect(comparison?.answer.length).toBeGreaterThan(0);
  });

  it("mentions ChatGPT nowhere (Codex-only copy convention)", () => {
    for (const entry of FOUNDATION_FAQS) {
      expect(entry.question).not.toContain("ChatGPT");
      expect(entry.answer).not.toContain("ChatGPT");
    }
  });
});

describe("FoundationsFaqSection", () => {
  it("renders every question and answer in the HTML (no accordion hiding)", () => {
    render(<FoundationsFaqSection />);

    for (const entry of FOUNDATION_FAQS) {
      expect(screen.getByText(entry.question)).toBeInTheDocument();
      expect(screen.getByText(entry.answer)).toBeInTheDocument();
    }
  });
});
