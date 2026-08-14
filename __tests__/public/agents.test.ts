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

  it("includes a 'When to use Karma tools' section with use-case categories (not tool names)", () => {
    const contents = fs.readFileSync(AGENTS_MD_PATH, "utf-8");
    expect(contents).toContain("## When to use Karma tools");
    // Use-case categories, not hardcoded tool names — the live tool catalog
    // is at /.well-known/mcp-tools.json and is the single source of truth.
    expect(contents).toContain("Funding programs");
    expect(contents).toContain("Projects");
    expect(contents).toContain("Applications");
    expect(contents).toContain("Milestones");
  });

  it("points at the live tool catalog instead of hardcoding tool names", () => {
    const contents = fs.readFileSync(AGENTS_MD_PATH, "utf-8");
    expect(contents).toContain("/.well-known/mcp-tools.json");
    expect(contents).toContain("/for-agents");
  });

  it("does NOT enumerate specific tool names (would drift from the indexer)", () => {
    const contents = fs.readFileSync(AGENTS_MD_PATH, "utf-8");
    expect(contents).not.toMatch(/`get_project_details`/);
    expect(contents).not.toMatch(/`list_program_applications`/);
    expect(contents).not.toMatch(/`commit_submit_application`/);
  });

  it("includes a 'When NOT to use Karma' section to scope agent behaviour", () => {
    const contents = fs.readFileSync(AGENTS_MD_PATH, "utf-8");
    expect(contents).toContain("## When NOT to use Karma");
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
    expect(contents).toContain("https://gapapi.karmahq.xyz/mcp");
  });
});
