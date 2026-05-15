import { AGENT_FAQS, CURATED_TOOLS, USE_CASES } from "@/components/Pages/ForAgents/content";

describe("AGENT_FAQS content", () => {
  it("provides at least four entries", () => {
    expect(AGENT_FAQS.length).toBeGreaterThanOrEqual(4);
  });

  it("has a question and answer for every entry", () => {
    for (const entry of AGENT_FAQS) {
      expect(entry.question).toMatch(/\?$/);
      expect(entry.answer.length).toBeGreaterThan(0);
    }
  });
});

describe("USE_CASES content", () => {
  it("provides exactly three use cases (matches the 3-card grid)", () => {
    expect(USE_CASES).toHaveLength(3);
  });

  it("includes triage, milestone audit, and discovery use cases", () => {
    const titles = USE_CASES.map((u) => u.title).join(" ");
    expect(titles.toLowerCase()).toMatch(/triage|application/);
    expect(titles.toLowerCase()).toMatch(/milestone/);
    expect(titles.toLowerCase()).toMatch(/discover|funding/);
  });
});

describe("CURATED_TOOLS content", () => {
  it("provides at least six tools", () => {
    expect(CURATED_TOOLS.length).toBeGreaterThanOrEqual(6);
  });

  it("uses snake_case names consistent with MCP tool naming", () => {
    for (const tool of CURATED_TOOLS) {
      expect(tool.name).toMatch(/^[a-z]+(_[a-z]+)+$/);
    }
  });
});
