/**
 * Misconfiguration path for the /for-agents MCP instructions.
 *
 * Lives in its own file because it has to mock envVars before the content
 * module is imported — the URL is resolved at module load, which is exactly
 * what makes a bad value fail the build rather than reach a user.
 *
 * Both importers of content.ts (`app/for-agents/page.tsx` and
 * `fetchToolCatalog.ts`) are server-side, so throwing here surfaces at build
 * time instead of publishing something like "undefined/mcp" as the official
 * endpoint in visible copy and in FAQPage JSON-LD.
 */

const indexerUrl = vi.hoisted(() => ({ value: "" }));

vi.mock("@/utilities/enviromentVars", () => ({
  envVars: {
    get NEXT_PUBLIC_GAP_INDEXER_URL() {
      return indexerUrl.value;
    },
  },
}));

const importContent = async () => {
  vi.resetModules();
  return import("@/components/Pages/ForAgents/content");
};

describe("MCP instructions with a missing or malformed indexer URL", () => {
  it.each([
    ["unset", ""],
    ["whitespace only", "   "],
    ["not a URL", "gapapi.karmahq.org"],
    ["carrying a query string", "https://api.karmahq.org?tenant=x"],
  ])("refuses to build the page when the value is %s", async (_label, value) => {
    indexerUrl.value = value;

    await expect(importContent()).rejects.toThrow(/NEXT_PUBLIC_GAP_INDEXER_URL/);
  });

  it("never lets a degenerate value reach the published copy", async () => {
    indexerUrl.value = "";

    await expect(importContent()).rejects.toThrow();

    // The failure mode this guards: importing anyway and rendering the string.
    indexerUrl.value = "https://api.karmahq.org";
    const { AGENT_FAQS } = await importContent();

    for (const entry of AGENT_FAQS) {
      expect(entry.answer).not.toContain("undefined");
    }
  });

  it("keeps the static fallback importable while the config is broken", async () => {
    // fetchToolCatalog's resilience contract is to catch the thrown error and
    // serve STATIC_FALLBACK_TOOLS. That only works while the fallback lives
    // outside content.ts — co-locating them made the fallback unreachable in
    // exactly the situation it exists for.
    indexerUrl.value = "";

    vi.resetModules();
    const { STATIC_FALLBACK_TOOLS } = await import("@/components/Pages/ForAgents/fallbackTools");

    expect(STATIC_FALLBACK_TOOLS.length).toBeGreaterThan(0);
  });
});
