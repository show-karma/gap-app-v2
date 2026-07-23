import * as fs from "node:fs";
import * as path from "node:path";

const PRICING_MD_PATH = path.resolve(__dirname, "../../public/pricing.md");

describe("public/pricing.md", () => {
  it("exists at the apex /pricing.md path on the marketing domain", () => {
    expect(fs.existsSync(PRICING_MD_PATH)).toBe(true);
  });

  it("opens with the Karma pricing header", () => {
    const contents = fs.readFileSync(PRICING_MD_PATH, "utf-8");
    expect(contents).toMatch(/^# Karma pricing/);
  });

  it("documents a free tier for builders and program admins", () => {
    const contents = fs.readFileSync(PRICING_MD_PATH, "utf-8");
    expect(contents).toContain("## Free tier");
    expect(contents).toContain("Free for all individual builders and program administrators");
  });

  it("documents the ecosystem / enterprise tier and points to the sales email", () => {
    const contents = fs.readFileSync(PRICING_MD_PATH, "utf-8");
    expect(contents).toContain("## Ecosystem / enterprise");
    expect(contents).toContain("info@karmahq.xyz");
  });

  it("documents free API access under fair-use rate limits", () => {
    const contents = fs.readFileSync(PRICING_MD_PATH, "utf-8");
    expect(contents).toContain("## API access");
    expect(contents).toContain("fair-use rate limits");
    expect(contents).toContain("https://gapapi.karmahq.xyz/mcp");
  });

  it("includes a Last updated section pointing back to the apex marketing URL", () => {
    const contents = fs.readFileSync(PRICING_MD_PATH, "utf-8");
    expect(contents).toContain("## Last updated");
    expect(contents).toContain("https://www.karmahq.xyz");
  });
});
