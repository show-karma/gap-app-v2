import { AGENT_FAQS, USE_CASES } from "@/components/Pages/ForAgents/content";
import { STATIC_FALLBACK_TOOLS } from "@/components/Pages/ForAgents/fallbackTools";
import { CATEGORY_LABELS } from "@/components/Pages/ForAgents/types";
import { CANONICAL_ORIGIN, LEGACY_ROOT_DOMAINS } from "@/utilities/domains";
import { getIndexerBaseUrl } from "@/utilities/wellKnown";

// Derived exactly as content.ts derives them. Pinning literals here is what let
// the .xyz -> .org migration ship with a stale MCP host on /for-agents: a
// repo-wide sweep for the old domain was held back by a green assertion.
const MCP_SERVER_URL = `${getIndexerBaseUrl()}/mcp`;
const MCP_CONNECT_URL = `${CANONICAL_ORIGIN}/mcp/connect`;

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

  it("states the MCP endpoint and supported clients as a direct answer", () => {
    const clients = AGENT_FAQS.find((f) => f.question.includes("Which AI apps"));
    expect(clients?.answer).toContain(MCP_SERVER_URL);
    expect(clients?.answer).toContain("Claude");
    expect(clients?.answer).toContain("Codex");
  });

  it("advertises absolute URLs for both the MCP endpoint and the setup guide", () => {
    // A bare hostname breaks copy-paste into an MCP client and does not
    // identify a canonical URL in the FAQPage JSON-LD.
    expect(MCP_SERVER_URL).toMatch(/^https?:\/\/[^/]+\/mcp$/);
    expect(MCP_CONNECT_URL).toMatch(/^https:\/\/[^/]+\/mcp\/connect$/);
  });

  it("never advertises a legacy host in copy that is also emitted as JSON-LD", () => {
    for (const entry of AGENT_FAQS) {
      for (const legacyRoot of LEGACY_ROOT_DOMAINS) {
        expect(entry.answer).not.toContain(legacyRoot);
      }
    }
  });

  it("answers which operations need authentication", () => {
    const auth = AGENT_FAQS.find((f) => f.question.includes("require authentication"));
    expect(auth?.answer).toContain("Every tool call requires a signed-in session");
    expect(auth?.answer).toContain("x-api-key");
  });

  it("answers connecting from Claude with the guide location", () => {
    const connect = AGENT_FAQS.find((f) => f.question.includes("connect Karma to Claude"));
    expect(connect?.answer).toContain(MCP_SERVER_URL);
    expect(connect?.answer).toContain(MCP_CONNECT_URL);
  });

  it("answers whether an agent can draft and submit an application", () => {
    const drafting = AGENT_FAQS.find((f) =>
      f.question.includes("draft and submit a grant application")
    );
    expect(drafting?.answer).toMatch(/^Yes, with your permission/);
  });

  it("positions against conventional grant platforms without naming competitors", () => {
    const comparison = AGENT_FAQS.find((f) => f.question.includes("compare"));
    expect(comparison?.answer).toContain("Conventional grants-management platforms");
    for (const competitor of ["Fluxx", "Submittable", "Candid", "Instrumentl", "Blackbaud"]) {
      expect(comparison?.answer).not.toContain(competitor);
    }
  });

  it("mentions ChatGPT nowhere in the page copy (reviewer decision: Codex only)", () => {
    for (const entry of AGENT_FAQS) {
      expect(entry.question).not.toContain("ChatGPT");
      expect(entry.answer).not.toContain("ChatGPT");
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
