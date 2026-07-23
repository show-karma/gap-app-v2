import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { PAGES } from "@/utilities/pages";

describe("nonprofit research persona routes", () => {
  it("uses Persona terminology in canonical list and detail URLs", () => {
    expect(PAGES.DONOR_RESEARCH.PERSONAS).toBe("/nonprofit-research/personas");
    expect(PAGES.DONOR_RESEARCH.PERSONA("handle-1")).toBe("/nonprofit-research/personas/handle-1");
  });

  it("permanently redirects legacy Client URLs to Persona URLs", () => {
    const configPath = path.resolve(__dirname, "../../../next.config.ts");
    const source = readFileSync(configPath, "utf8");
    const redirect =
      /\{\s*source:\s*["']\/nonprofit-research\/clients\/:path\*["']\s*,\s*destination:\s*["']\/nonprofit-research\/personas\/:path\*["']\s*,\s*permanent:\s*true\s*,?\s*\}/;

    expect(source).toMatch(redirect);
  });
});
