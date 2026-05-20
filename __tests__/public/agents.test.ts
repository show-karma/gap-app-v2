import * as fs from "node:fs";
import * as path from "node:path";

const AGENTS_MD_PATH = path.resolve(__dirname, "../../public/agents.md");

describe("public/agents.md", () => {
  it("exists at the apex /agents.md path on the marketing domain", () => {
    expect(fs.existsSync(AGENTS_MD_PATH)).toBe(true);
  });

  it("opens with the Karma agent-instructions header", () => {
    const contents = fs.readFileSync(AGENTS_MD_PATH, "utf-8");
    expect(contents).toMatch(/^# Karma — agent instructions/);
  });

  it("includes a 'When to use Karma tools' section with tool guidance", () => {
    const contents = fs.readFileSync(AGENTS_MD_PATH, "utf-8");
    expect(contents).toContain("## When to use Karma tools");
    expect(contents).toContain("`discover`");
    expect(contents).toContain("`submit_application`");
  });

  it("includes a 'When NOT to use Karma tools' section to scope agent behaviour", () => {
    const contents = fs.readFileSync(AGENTS_MD_PATH, "utf-8");
    expect(contents).toContain("## When NOT to use Karma tools");
  });

  it("documents both OAuth and x-api-key authentication paths", () => {
    const contents = fs.readFileSync(AGENTS_MD_PATH, "utf-8");
    expect(contents).toContain("## Authentication");
    expect(contents).toContain("OAuth required");
    expect(contents).toContain("`x-api-key`");
  });

  it("lists supported MCP clients with the protocol version", () => {
    const contents = fs.readFileSync(AGENTS_MD_PATH, "utf-8");
    expect(contents).toContain("## Supported clients");
    expect(contents).toMatch(/MCP 2025-11-25\+/);
  });

  it("points at the canonical MCP endpoint on the indexer", () => {
    const contents = fs.readFileSync(AGENTS_MD_PATH, "utf-8");
    expect(contents).toContain("https://gapapi.karmahq.xyz/v2/mcp");
  });
});
