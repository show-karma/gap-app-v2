import { CONNECT_STEPS, MCP_FAQS } from "@/components/Pages/McpConnect/content";

describe("MCP_FAQS content", () => {
  it("provides at least four entries (FAQ rich snippet sweet spot)", () => {
    expect(MCP_FAQS.length).toBeGreaterThanOrEqual(4);
  });

  it("has a question and a non-empty answer for every entry", () => {
    for (const entry of MCP_FAQS) {
      expect(entry.question).toMatch(/\?$/);
      expect(entry.answer.length).toBeGreaterThan(0);
    }
  });

  it("covers the supported AI clients", () => {
    const flat = MCP_FAQS.map((f) => `${f.question} ${f.answer}`).join(" ");
    expect(flat).toMatch(/Cursor/);
    expect(flat).toMatch(/Claude Desktop/);
    expect(flat).toMatch(/Codex/);
  });
});

describe("CONNECT_STEPS content", () => {
  it("provides exactly four ordered setup steps", () => {
    expect(CONNECT_STEPS).toHaveLength(4);
  });

  it("has a name and a non-empty text for every step", () => {
    for (const step of CONNECT_STEPS) {
      expect(step.name.length).toBeGreaterThan(0);
      expect(step.text.length).toBeGreaterThan(0);
    }
  });
});
