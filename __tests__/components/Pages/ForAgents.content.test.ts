import { AGENT_FAQS, STATIC_FALLBACK_TOOLS, USE_CASES } from "@/components/Pages/ForAgents/content";
import { CATEGORY_LABELS } from "@/components/Pages/ForAgents/types";

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

describe("STATIC_FALLBACK_TOOLS content", () => {
  it("provides a small representative fallback (5-6 tools)", () => {
    expect(STATIC_FALLBACK_TOOLS.length).toBeGreaterThanOrEqual(5);
    expect(STATIC_FALLBACK_TOOLS.length).toBeLessThanOrEqual(8);
  });

  it("uses snake_case names consistent with MCP tool naming", () => {
    for (const tool of STATIC_FALLBACK_TOOLS) {
      expect(tool.name).toMatch(/^[a-z]+(_[a-z]+)+$/);
    }
  });

  it("marks every fallback tool as anonymous (requiresAuth=false)", () => {
    for (const tool of STATIC_FALLBACK_TOOLS) {
      expect(tool.requiresAuth).toBe(false);
    }
  });

  it("uses categories that exist in CATEGORY_LABELS", () => {
    for (const tool of STATIC_FALLBACK_TOOLS) {
      expect(CATEGORY_LABELS[tool.category]).toBeDefined();
    }
  });

  it("has a non-empty description for every tool", () => {
    for (const tool of STATIC_FALLBACK_TOOLS) {
      expect(tool.description.length).toBeGreaterThan(0);
    }
  });

  it("covers more than one category for visual variety", () => {
    const categories = new Set(STATIC_FALLBACK_TOOLS.map((t) => t.category));
    expect(categories.size).toBeGreaterThan(1);
  });
});
