import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

// check-design-system is a plain CommonJS Node script (it has to run from the
// bash post-edit hook and from CI without ts-node). Its pure helpers are
// exported so they can be unit tested here, mirroring quality-gate.test.ts.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const designCheck = require("../../../scripts/check-design-system.js") as {
  loadConfig: (configPath?: string) => DesignConfig;
  scanText: (input: { file: string; text: string; config: DesignConfig }) => Finding[];
  parseDiff: (diff: string) => Map<string, Set<number>>;
  isScannable: (file: string, config: DesignConfig) => boolean;
  filterByAddedLines: (findings: Finding[], added: Set<number> | null) => Finding[];
  toPosix: (p: string) => string;
  RULES: Record<string, { id: string; severity: "error" | "warn"; name: string }>;
};

const { loadConfig, scanText, parseDiff, isScannable, filterByAddedLines, toPosix, RULES } =
  designCheck;

interface DesignConfig {
  scanGlobs: string[];
  exclude: string[];
  tokenDefinitionFiles: string[];
  iconGlobs: string[];
  severity: Record<string, "error" | "warn">;
  hints: Record<string, string>;
}

interface Finding {
  rule: string;
  severity: "error" | "warn";
  file: string;
  line: number;
  col: number;
  endLine: number;
  snippet: string;
  message: string;
  hint: string | null;
  waived: boolean;
  waiverLine: number | null;
}

const SCRIPT = path.resolve(__dirname, "../../../scripts/check-design-system.js");
const FIXTURES = path.resolve(__dirname, "fixtures/design-check");

const config = loadConfig();

function fixture(name: string): string {
  return fs.readFileSync(path.join(FIXTURES, "src", name), "utf8");
}

function diffFixture(name: string): string {
  return fs.readFileSync(path.join(FIXTURES, "diffs", name), "utf8");
}

/** Scan a fixture body as if it lived at `file` inside the repo. */
function scanFixture(name: string, file: string): Finding[] {
  return scanText({ file, text: fixture(name), config });
}

function scan(text: string, file = "components/Sample.tsx"): Finding[] {
  return scanText({ file, text, config });
}

function rulesOf(findings: Finding[]): string[] {
  return findings.map((f) => f.rule);
}

function countOf(findings: Finding[], rule: string): number {
  return findings.filter((f) => f.rule === rule).length;
}

// ── rule corpus ─────────────────────────────────────────────────────────────

describe("DS001 arbitrary-color-class", () => {
  it("flags every literal colour form in an arbitrary Tailwind value", () => {
    const findings = scanFixture("ds001.positive.tsx.txt", "components/Positive.tsx");
    expect(countOf(findings, "DS001")).toBe(5);
    expect(findings.every((f) => f.severity === "error")).toBe(true);
  });

  it("does not flag CSS-variable token consumption or palette classes", () => {
    const findings = scanFixture("ds001.negative.tsx.txt", "components/Negative.tsx");
    expect(countOf(findings, "DS001")).toBe(0);
  });

  it.each([
    ['className="bg-[#123456]"', "hex"],
    ['className="fill-[rgba(0,0,0,0.4)]"', "rgba"],
    ['className="ring-[hsla(10,10%,10%,0.2)]"', "hsla"],
    ['className="divide-[#abc]"', "short hex"],
    ['className="shadow-[0_1px_2px_rgba(16,24,40,0.05)]"', "shadow with rgba"],
  ])("flags %s (%s)", (snippet) => {
    expect(countOf(scan(`const x = <div ${snippet} />;`), "DS001")).toBe(1);
  });

  it.each([
    'className="bg-[rgb(var(--c))]"',
    'className="text-[var(--fg)]"',
    'className="border-[hsl(var(--h)/0.5)]"',
    'className="bg-[url(/img/hero.png)]"',
    'className="shadow-[0_1px_2px_var(--shadow)]"',
  ])("does not flag %s", (snippet) => {
    expect(countOf(scan(`const x = <div ${snippet} />;`), "DS001")).toBe(0);
  });

  it("attaches a curated hint when the literal is a known brand colour", () => {
    const [finding] = scan('const x = <div className="bg-[#2ed1a8]" />;').filter(
      (f) => f.rule === "DS001"
    );
    expect(finding.hint).toBeTruthy();
  });

  it("reports the line of the offending class", () => {
    const findings = scan(
      ["const a = 1;", 'const x = <div className="bg-[#123456]" />;'].join("\n")
    );
    expect(findings[0].line).toBe(2);
  });
});

describe("DS002 raw-color-literal", () => {
  it("flags hex, rgb and hsl literals in strings, templates and JSX attributes", () => {
    const findings = scanFixture("ds002.positive.tsx.txt", "components/Positive.tsx");
    expect(countOf(findings, "DS002")).toBe(4);
  });

  it("does not flag anchors, url(#id), var() fallbacks or comments", () => {
    const findings = scanFixture("ds002.negative.tsx.txt", "components/Negative.tsx");
    expect(countOf(findings, "DS002")).toBe(0);
  });

  it("never scans comments", () => {
    const text = ["// Closes #1312", "/* palette was #2ed1a8 */", "const x = 1;"].join("\n");
    expect(scan(text)).toEqual([]);
  });

  it("is exempt inside components/Icons (SVG assets are not design tokens)", () => {
    const text = 'export const Icon = () => <path fill="#101828" />;';
    expect(countOf(scan(text, "components/Icons/Foo.tsx"), "DS002")).toBe(0);
    expect(countOf(scan(text, "components/Shared/Foo.tsx"), "DS002")).toBe(1);
  });

  it("still applies DS001 inside components/Icons", () => {
    const text = 'export const Icon = () => <path className="fill-[#101828]" />;';
    expect(countOf(scan(text, "components/Icons/Foo.tsx"), "DS001")).toBe(1);
  });
});

describe("DS003 inline-style-literal", () => {
  it("flags literal colour and size values on visual keys", () => {
    const findings = scanFixture("ds003.positive.tsx.txt", "components/Positive.tsx");
    expect(countOf(findings, "DS003")).toBe(4);
  });

  it("does not flag tokens, expressions, custom properties or layout keys", () => {
    const findings = scanFixture("ds003.negative.tsx.txt", "components/Negative.tsx");
    expect(countOf(findings, "DS003")).toBe(0);
  });

  it("flags only the offending key when a style object mixes keys", () => {
    const findings = scan('const x = <div style={{ width: "100%", color: "#fff", zIndex: 2 }} />;');
    expect(countOf(findings, "DS003")).toBe(1);
    expect(findings[0].snippet).toContain("color");
  });

  it("ignores style objects spread from a variable", () => {
    expect(scan("const x = <div style={styles.card} />;")).toEqual([]);
  });
});

describe("DS004 important-prefix", () => {
  it("flags bare and variant-prefixed important utilities", () => {
    const findings = scanFixture("ds004.positive.tsx.txt", "components/Positive.tsx");
    expect(countOf(findings, "DS004")).toBe(3);
  });

  it("does not flag negations or exclamation marks in prose", () => {
    const findings = scanFixture("ds004.negative.tsx.txt", "components/Negative.tsx");
    expect(countOf(findings, "DS004")).toBe(0);
  });

  it.each(['"!bg-red-500"', '"hover:!p-2"', '"lg:dark:!text-white"'])("flags %s", (snippet) => {
    expect(countOf(scan(`const c = ${snippet};`), "DS004")).toBe(1);
  });

  it.each(['"Hello!"', '"Wow! amazing"', '"!"'])("does not flag %s", (snippet) => {
    expect(countOf(scan(`const c = ${snippet};`), "DS004")).toBe(0);
  });
});

describe("DS005 raw-primitive", () => {
  it("flags raw interactive primitives, including type=file", () => {
    const findings = scanFixture("ds005.positive.tsx.txt", "components/Positive.tsx");
    expect(countOf(findings, "DS005")).toBe(5);
    expect(findings.filter((f) => f.rule === "DS005").every((f) => f.severity === "error")).toBe(
      true
    );
  });

  it("does not flag shadcn primitives or type=hidden", () => {
    const findings = scanFixture("ds005.negative.tsx.txt", "components/Negative.tsx");
    expect(countOf(findings, "DS005")).toBe(0);
  });

  it("is not applied inside components/ui", () => {
    const text = "export const Raw = () => <button />;";
    expect(countOf(scan(text, "components/ui/button.tsx"), "DS005")).toBe(1 - 1);
    expect(countOf(scan(text, "components/Shared/Raw.tsx"), "DS005")).toBe(1);
  });

  it("suggests the shadcn replacement in the hint", () => {
    const [finding] = scan("export const Raw = () => <button />;").filter(
      (f) => f.rule === "DS005"
    );
    expect(finding.hint).toContain("components/ui/button");
  });
});

describe("DS006 arbitrary-scale", () => {
  it("flags arbitrary numeric spacing and type values as warnings", () => {
    const findings = scanFixture("ds006.positive.tsx.txt", "components/Positive.tsx");
    expect(countOf(findings, "DS006")).toBe(5);
    expect(findings.filter((f) => f.rule === "DS006").every((f) => f.severity === "warn")).toBe(
      true
    );
  });

  it("does not flag calc, tokens, z-index, grid templates or layout percentages", () => {
    const findings = scanFixture("ds006.negative.tsx.txt", "components/Negative.tsx");
    expect(countOf(findings, "DS006")).toBe(0);
  });
});

describe("DS007 css-color-literal", () => {
  it("flags literal colours in stylesheets", () => {
    const findings = scanText({
      file: "styles/card.scss",
      text: fixture("ds007.positive.scss.txt"),
      config,
    });
    expect(countOf(findings, "DS007")).toBe(3);
  });

  it("does not flag var() consumption or comments", () => {
    const findings = scanText({
      file: "styles/card.scss",
      text: fixture("ds007.negative.scss.txt"),
      config,
    });
    expect(countOf(findings, "DS007")).toBe(0);
  });

  it("exempts token definition files", () => {
    const text = ":root { --brand: #2ed1a8; }";
    expect(countOf(scanText({ file: "styles/globals.css", text, config }), "DS007")).toBe(0);
    expect(countOf(scanText({ file: "styles/other.css", text, config }), "DS007")).toBe(1);
  });

  it("does not mistake an id selector for a colour", () => {
    const text = "#app { color: var(--fg); }";
    expect(countOf(scanText({ file: "styles/other.css", text, config }), "DS007")).toBe(0);
  });
});

describe("DS000 bad-waiver", () => {
  it("accepts a well-formed waiver and marks the finding waived", () => {
    const findings = scanFixture("ds000.waivers.tsx.txt", "components/Waivers.tsx");
    const waived = findings.filter((f) => f.waived);
    expect(waived).toHaveLength(1);
    expect(waived[0].rule).toBe("DS001");
    expect(waived[0].waiverLine).toBe(4);
  });

  it("reports a bare waiver, a too-short reason and an orphan waiver", () => {
    const findings = scanFixture("ds000.waivers.tsx.txt", "components/Waivers.tsx");
    expect(countOf(findings, "DS000")).toBe(3);
    const messages = findings.filter((f) => f.rule === "DS000").map((f) => f.message);
    expect(messages.some((m) => /rule id/i.test(m))).toBe(true);
    expect(messages.some((m) => /reason/i.test(m))).toBe(true);
    expect(messages.some((m) => /orphan|no .*finding/i.test(m))).toBe(true);
  });

  it("does not waive a different rule than the one named", () => {
    const text = [
      "// design-check-ignore: DS006 waived the wrong rule on purpose here",
      'const c = "bg-[#123456]";',
    ].join("\n");
    const findings = scan(text);
    expect(findings.find((f) => f.rule === "DS001")?.waived).toBe(false);
    expect(countOf(findings, "DS000")).toBe(1);
  });

  it("supports the JSX comment form", () => {
    const text = [
      "export const A = () => (",
      "  <div>",
      "    {/* design-check-ignore: DS001 tenant swatch supplied by the customer */}",
      '    <span className="bg-[#123456]" />',
      "  </div>",
      ");",
    ].join("\n");
    const findings = scan(text);
    expect(findings.find((f) => f.rule === "DS001")?.waived).toBe(true);
    expect(countOf(findings, "DS000")).toBe(0);
  });
});

// ── precedence ──────────────────────────────────────────────────────────────

describe("precedence", () => {
  it("reports a colour inside a Tailwind candidate once, as DS001", () => {
    const findings = scanFixture("precedence.tsx.txt", "components/Precedence.tsx");
    expect(countOf(findings, "DS001")).toBe(1);
    expect(countOf(findings, "DS003")).toBe(1);
    expect(countOf(findings, "DS002")).toBe(0);
  });

  it("reports a colour inside an inline style once, as DS003", () => {
    const findings = scan('const x = <div style={{ color: "#fff" }} />;');
    expect(rulesOf(findings)).toEqual(["DS003"]);
  });
});

describe("multi-defect candidates and multi-rule waivers", () => {
  const findings = () => scanFixture("multi-rule.tsx.txt", "components/MultiRule.tsx");

  it("reports both defects of `!bg-[#123456]` — precedence only dedupes colour literals", () => {
    const onLine4 = findings().filter((f) => f.line === 4);
    expect(onLine4.map((f) => f.rule).sort()).toEqual(["DS001", "DS004"]);
  });

  it("accepts one comma-separated waiver covering both rules", () => {
    const onLine6 = findings().filter((f) => f.line === 6);
    expect(onLine6.map((f) => f.rule).sort()).toEqual(["DS001", "DS004"]);
    expect(onLine6.every((f) => f.waived)).toBe(true);
    expect(onLine6.every((f) => f.waiverLine === 5)).toBe(true);
  });

  it("stamps every finding of a multi-rule waiver with the same sorted rule set", () => {
    const onLine6 = findings().filter((f) => f.line === 6);
    expect(new Set(onLine6.map((f) => f.waiverRules))).toEqual(new Set(["DS001,DS004"]));
  });

  it("raises DS000 for a listed rule that matches nothing on the next line", () => {
    const orphans = findings().filter((f) => f.rule === "DS000");
    expect(orphans).toHaveLength(1);
    expect(orphans[0].message).toContain("DS006");
    // The id that did match is still waived.
    const waivedOnLine8 = findings().filter((f) => f.line === 8 && f.rule === "DS001");
    expect(waivedOnLine8[0].waived).toBe(true);
  });

  it("tolerates spaces around the comma", () => {
    const text = [
      "// design-check-ignore: DS001, DS004 tenant swatch forced over a vendor sheet",
      'const c = "!bg-[#123456]";',
    ].join("\n");
    const result = scan(text);
    expect(result.filter((f) => f.waived)).toHaveLength(2);
    expect(countOf(result, "DS000")).toBe(0);
  });

  it("keeps a single-rule waiver's rule set to that one rule", () => {
    const text = [
      "// design-check-ignore: DS001 tenant swatch supplied by the customer",
      'const c = "bg-[#123456]";',
    ].join("\n");
    expect(scan(text).find((f) => f.rule === "DS001")?.waiverRules).toBe("DS001");
  });
});

describe("DS006 excludes sizing utilities (Tester D3)", () => {
  it("does not flag any layout dimension", () => {
    const findings = scanFixture("ds006.sizing.tsx.txt", "components/Sizing.tsx");
    expect(countOf(findings, "DS006")).toBe(0);
  });

  it.each([
    "w-[420px]",
    "h-[34px]",
    "min-w-[12rem]",
    "min-h-[400px]",
    "max-w-[16rem]",
    "max-h-[80px]",
    "size-[18px]",
    "basis-[240px]",
    "inset-[3px]",
    "top-[7px]",
    "right-[7px]",
    "bottom-[7px]",
    "left-[9px]",
    "translate-x-[13px]",
  ])("does not flag %s", (cls) => {
    expect(countOf(scan(`const c = "${cls}";`), "DS006")).toBe(0);
  });

  it.each([
    "p-[13px]",
    "px-[18px]",
    "mt-[7px]",
    "gap-[5px]",
    "space-y-[3px]",
    "text-[13px]",
    "leading-[22px]",
    "tracking-[0.14em]",
    "rounded-[7px]",
    "indent-[4px]",
  ])("still flags the spacing/typography utility %s", (cls) => {
    expect(countOf(scan(`const c = "${cls}";`), "DS006")).toBe(1);
  });
});

describe("DS003 is skipped for next/og image routes (Tester D5/D6)", () => {
  it("skips a file importing from next/og", () => {
    const findings = scanText({
      file: "app/api/metadata/knowledge/route.tsx",
      text: fixture("og-route.tsx.txt"),
      config,
    });
    expect(countOf(findings, "DS003")).toBe(0);
  });

  it("still applies every other rule inside an exempt file", () => {
    const findings = scanText({
      file: "app/api/metadata/knowledge/route.tsx",
      text: fixture("og-route.tsx.txt"),
      config,
    });
    expect(countOf(findings, "DS001")).toBe(1);
  });

  it("does not leak the exemption to a file that only mentions next/og", () => {
    const findings = scanText({
      file: "components/NotOg.tsx",
      text: fixture("og-route.tsx.txt").replace('from "next/og"', 'from "./local-og"'),
      config,
    });
    expect(countOf(findings, "DS003")).toBe(3);
  });

  it.each(["@vercel/og"])("also exempts an import from %s", (mod) => {
    const text = `import { ImageResponse } from "${mod}";\nexport const A = () => <div style={{ color: "#fff" }} />;`;
    expect(countOf(scan(text, "components/Og.tsx"), "DS003")).toBe(0);
  });

  it.each(["app/opengraph-image.tsx", "app/blog/[slug]/twitter-image.tsx", "app/api/og/route.tsx"])(
    "exempts %s by glob even without the import",
    (file) => {
      const text = 'export const A = () => <div style={{ color: "#fff" }} />;';
      expect(countOf(scanText({ file, text, config }), "DS003")).toBe(0);
    }
  );

  it("gives a followable hint naming the Tailwind utility and the exemption", () => {
    const [finding] = scan('const x = <div style={{ color: "#fff" }} />;');
    expect(finding.message).toContain("text-*");
    expect(finding.message).toContain('color: "var(--token)"');
    expect(finding.message).toContain("next/og");
  });

  it("keeps DS002 suppressed inside an exempt style object (precedence holds)", () => {
    const findings = scanText({
      file: "app/api/og/route.tsx",
      text: 'export const A = () => <div style={{ color: "#fff" }} />;',
      config,
    });
    expect(findings).toEqual([]);
  });
});

describe("waiver edge cases (Tester D7/D8/D9)", () => {
  const findings = () => scanFixture("waiver-edge.tsx.txt", "components/Edge.tsx");

  it("waives every finding of the listed rule on the next line, not just the first", () => {
    const onLine6 = findings().filter((f) => f.line === 6 && f.rule === "DS001");
    expect(onLine6).toHaveLength(2);
    expect(onLine6.every((f) => f.waived)).toBe(true);
  });

  it("recognises the keyword and rule id case-insensitively", () => {
    const onLine8 = findings().filter((f) => f.line === 8 && f.rule === "DS001");
    expect(onLine8).toHaveLength(1);
    expect(onLine8[0].waived).toBe(true);
    expect(onLine8[0].waiverRules).toBe("DS001");
  });

  it("still raises DS000 for a malformed waiver whatever its case", () => {
    const bad = findings().filter((f) => f.rule === "DS000");
    expect(bad).toHaveLength(1);
    expect(bad[0].line).toBe(9);
    expect(bad[0].message).toMatch(/rule id/i);
  });

  it("never treats the phrase inside a string literal as a waiver", () => {
    // Line 1 is a plain string constant, not a comment.
    expect(findings().some((f) => f.rule === "DS000" && f.line === 1)).toBe(false);
  });

  it("does not waive from a string literal either", () => {
    const text = [
      'const doc = "design-check-ignore: DS001 explaining the waiver syntax in docs";',
      'const c = "bg-[#123456]";',
    ].join("\n");
    const result = scan(text);
    expect(countOf(result, "DS000")).toBe(0);
    expect(result.find((f) => f.rule === "DS001")?.waived).toBe(false);
  });

  it("honours a waiver in a block comment and in a line comment", () => {
    const block = [
      "/* design-check-ignore: DS001 tenant swatch from the payload */",
      'const c = "bg-[#123456]";',
    ].join("\n");
    const line = [
      "// design-check-ignore: DS001 tenant swatch from the payload",
      'const c = "bg-[#123456]";',
    ].join("\n");
    expect(scan(block).find((f) => f.rule === "DS001")?.waived).toBe(true);
    expect(scan(line).find((f) => f.rule === "DS001")?.waived).toBe(true);
  });

  it("honours a waiver in a stylesheet comment but not in a CSS string", () => {
    const waived = [
      "/* design-check-ignore: DS007 legacy palette pending tokens */",
      ".a { color: #123456; }",
    ].join("\n");
    const inContent = ['.a::after { content: "design-check-ignore: DS007 not a comment"; }'].join(
      "\n"
    );
    expect(
      scanText({ file: "styles/x.scss", text: waived, config }).find((f) => f.rule === "DS007")
        ?.waived
    ).toBe(true);
    expect(countOf(scanText({ file: "styles/x.scss", text: inContent, config }), "DS000")).toBe(0);
  });
});

describe("scaleDefinitionFiles (F7)", () => {
  const SCALE_FILES = [
    "components/Pages/Dashboard/v3/soft-classes.ts",
    "src/features/donor-research/components/report-brief/table-classes.ts",
  ];

  it("lists both scale-definition files in the shipped config", () => {
    expect(config.scaleDefinitionFiles).toEqual(SCALE_FILES);
  });

  it.each(SCALE_FILES)("exempts %s from DS006", (file) => {
    const findings = scanText({ file, text: fixture("scale-definition.ts.txt"), config });
    expect(countOf(findings, "DS006")).toBe(0);
  });

  it.each(SCALE_FILES)("still scans %s for the colour and override rules", (file) => {
    const findings = scanText({ file, text: fixture("scale-definition.ts.txt"), config });
    expect(countOf(findings, "DS001")).toBe(1);
    expect(countOf(findings, "DS004")).toBe(1);
  });

  it("still reports DS006 in a file that is not exempt", () => {
    const findings = scanText({
      file: "components/Other/classes.ts",
      text: fixture("scale-definition.ts.txt"),
      config,
    });
    expect(countOf(findings, "DS006")).toBe(2);
  });

  it("keeps DS002 active in a scale-definition file", () => {
    const findings = scanText({
      file: SCALE_FILES[0],
      text: 'export const C = "#2ed1a8";',
      config,
    });
    expect(countOf(findings, "DS002")).toBe(1);
  });

  it("exempts DS006 only — DS005 still fires in an exempt .tsx", () => {
    const exempt = { ...config, scaleDefinitionFiles: ["components/Exempt.tsx"] };
    const text = 'export const R = () => <input className="p-[13px]" placeholder="#2ed1a8" />;';
    const findings = scanText({ file: "components/Exempt.tsx", text, config: exempt });
    expect(countOf(findings, "DS006")).toBe(0);
    expect(countOf(findings, "DS005")).toBe(1);
    expect(countOf(findings, "DS002")).toBe(1);
  });
});

describe("non-tsx sources", () => {
  it("scans .ts constant files holding class strings", () => {
    const findings = scanText({
      file: "src/helper/theme.ts",
      text: fixture("ts-constant.ts.txt"),
      config,
    });
    expect(countOf(findings, "DS001")).toBe(2);
  });
});

// ── scannability ────────────────────────────────────────────────────────────

describe("isScannable", () => {
  it.each([
    "components/Foo.tsx",
    "app/page.tsx",
    "src/features/x/y.ts",
    "pages/api/z.js",
    "styles/globals.css",
    "components/Pages/Dashboard/v3/dashboard-soft.css",
    // F1: scan roots are the tailwind content globs plus these — widget/ ships
    // through `pnpm build:widget`, so its classes reach users too.
    "utilities/whitelabel-config.ts",
    "hooks/useCommunityAccent.ts",
    "widget/src/App.tsx",
    "widget/widget.css",
  ])("includes %s", (file) => {
    expect(isScannable(file, config)).toBe(true);
  });

  it.each([
    "node_modules/pkg/index.js",
    ".next/static/chunk.js",
    "__tests__/unit/scripts/check-design-system.test.ts",
    "__mocks__/@sentry/nextjs.ts",
    "components/Foo.stories.tsx",
    "src/stories/Configure.mdx",
    "src/stories/Button.tsx",
    ".storybook/preview.ts",
    "scripts/quality-gate.js",
    "types/global.d.ts",
    "docs/standards/ui-ux-best-practices.md",
    "app/page.mdx",
  ])("excludes %s", (file) => {
    expect(isScannable(file, config)).toBe(false);
  });

  it("accepts Windows-style paths", () => {
    expect(toPosix("components\\Pages\\Foo.tsx")).toBe("components/Pages/Foo.tsx");
    expect(isScannable("components\\Pages\\Foo.tsx", config)).toBe(true);
  });
});

// ── diff parsing ────────────────────────────────────────────────────────────

describe("parseDiff", () => {
  it("treats every line of a new file as added", () => {
    const parsed = parseDiff(diffFixture("new-file.diff"));
    expect([...(parsed.get("components/New.tsx") ?? [])]).toEqual([1, 2, 3]);
  });

  it("skips deletions entirely", () => {
    const parsed = parseDiff(diffFixture("deletion.diff"));
    expect(parsed.has("components/Gone.tsx")).toBe(false);
  });

  it("yields no added lines for a pure rename", () => {
    const parsed = parseDiff(diffFixture("rename-only.diff"));
    expect(parsed.get("components/Renamed.tsx")?.size ?? 0).toBe(0);
  });

  it("uses the new path for a rename with edits", () => {
    const parsed = parseDiff(diffFixture("rename-with-edit.diff"));
    expect(parsed.has("components/Old.tsx")).toBe(false);
    expect([...(parsed.get("components/Renamed.tsx") ?? [])]).toEqual([5, 6]);
  });

  it("unquotes C-escaped paths", () => {
    const parsed = parseDiff(diffFixture("quoted-path.diff"));
    expect([...parsed.keys()]).toEqual(["components/Café Card.tsx"]);
  });

  it("tolerates CRLF diff output", () => {
    const parsed = parseDiff(diffFixture("crlf.diff"));
    expect([...(parsed.get("components/Crlf.tsx") ?? [])]).toEqual([11, 12]);
  });

  it("collects every hunk across every file", () => {
    const parsed = parseDiff(diffFixture("multi-hunk.diff"));
    expect([...(parsed.get("components/A.tsx") ?? [])]).toEqual([3, 21, 22, 23]);
    expect([...(parsed.get("styles/b.scss") ?? [])]).toEqual([8]);
  });

  it("records no added lines for a removal-only hunk", () => {
    const parsed = parseDiff(diffFixture("empty-hunk.diff"));
    expect(parsed.get("components/OnlyRemovals.tsx")?.size ?? 0).toBe(0);
  });

  it("returns an empty map for empty input", () => {
    expect(parseDiff("").size).toBe(0);
  });
});

describe("filterByAddedLines", () => {
  const base: Finding = {
    rule: "DS001",
    severity: "error",
    file: "components/A.tsx",
    line: 10,
    col: 3,
    endLine: 12,
    snippet: "bg-[#fff]",
    message: "m",
    hint: null,
    waived: false,
    waiverLine: null,
  };

  it("keeps a finding whose range intersects an added line", () => {
    expect(filterByAddedLines([base], new Set([11]))).toHaveLength(1);
  });

  it("drops a finding entirely outside the added lines", () => {
    expect(filterByAddedLines([base], new Set([1, 30]))).toHaveLength(0);
  });

  it("keeps a pre-existing finding whose waiver line was added", () => {
    const waived = { ...base, waived: true, waiverLine: 9 };
    expect(filterByAddedLines([waived], new Set([9]))).toHaveLength(1);
  });

  it("keeps everything when there is no line filter", () => {
    expect(filterByAddedLines([base], null)).toHaveLength(1);
  });
});

// ── CLI modes (real git repository) ─────────────────────────────────────────

describe("CLI modes", () => {
  let repo: string;
  let baseSha: string;

  const run = (args: string[]) => {
    try {
      const stdout = execFileSync(process.execPath, [SCRIPT, "--root", repo, ...args], {
        cwd: repo,
        encoding: "utf8",
      });
      return { status: 0, stdout };
    } catch (err) {
      const e = err as { status: number; stdout: string; stderr: string };
      return { status: e.status, stdout: e.stdout ?? "", stderr: e.stderr ?? "" };
    }
  };

  const runJson = (args: string[]) => {
    const res = run([...args, "--json"]);
    return { status: res.status, json: JSON.parse(res.stdout) };
  };

  const git = (...args: string[]) =>
    execFileSync("git", args, { cwd: repo, encoding: "utf8" }).trim();

  const write = (rel: string, body: string) => {
    const abs = path.join(repo, rel);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, body);
  };

  beforeAll(() => {
    repo = fs.mkdtempSync(path.join(os.tmpdir(), "design-check-"));
    git("init", "-q", "-b", "main");
    git("config", "user.email", "dev@example.com");
    git("config", "user.name", "Dev");
    // Legacy debt that must never block a PR that does not touch it.
    write(
      "components/Legacy.tsx",
      [
        "export const Legacy = () => (",
        '  <span className="bg-[#111111]">a</span>',
        '  <span className="bg-[#222222]">b</span>',
        ");",
      ].join("\n")
    );
    git("add", "-A");
    git("commit", "-qm", "seed");
    baseSha = git("rev-parse", "HEAD");
  });

  afterAll(() => {
    fs.rmSync(repo, { recursive: true, force: true });
  });

  it("full mode reports the whole repository and exits 1 on errors", () => {
    const { status, json } = runJson([]);
    expect(status).toBe(1);
    expect(json.mode).toBe("full");
    expect(json.summary.byRule.DS001).toBe(2);
  });

  it("--report never exits non-zero", () => {
    const { status, json } = runJson(["--report"]);
    expect(status).toBe(0);
    expect(json.summary.error).toBe(2);
  });

  it("--changed ignores legacy debt in an untouched region", () => {
    write(
      "components/Clean.tsx",
      'export const Clean = () => <span className="bg-brand">ok</span>;\n'
    );
    git("add", "-A");
    git("commit", "-qm", "clean");
    const { status, json } = runJson(["--changed", "--base", baseSha]);
    expect(status).toBe(0);
    expect(json.findings).toEqual([]);
  });

  it("--changed blocks on a violation on an added line", () => {
    write(
      "components/Dirty.tsx",
      'export const Dirty = () => <span className="bg-[#123456]">no</span>;\n'
    );
    git("add", "-A");
    git("commit", "-qm", "dirty");
    const { status, json } = runJson(["--changed", "--base", baseSha]);
    expect(status).toBe(1);
    expect(json.summary.byRule.DS001).toBe(1);
    expect(json.findings[0].file).toBe("components/Dirty.tsx");
  });

  it("--changed uses a three-dot diff so an advanced base is ignored", () => {
    const head = git("rev-parse", "HEAD");
    // Advance the base branch with an unrelated violating commit.
    git("checkout", "-q", "-b", "other", baseSha);
    write("components/Unrelated.tsx", 'export const U = () => <b className="bg-[#999999]" />;\n');
    git("add", "-A");
    git("commit", "-qm", "unrelated");
    const advanced = git("rev-parse", "HEAD");
    git("checkout", "-q", "main");
    expect(git("rev-parse", "HEAD")).toBe(head);

    const { json } = runJson(["--changed", "--base", advanced]);
    expect(json.findings.map((f: Finding) => f.file)).toEqual(["components/Dirty.tsx"]);
  });

  it("exits 2 when the base cannot be resolved", () => {
    const res = run(["--changed", "--base", "0000000000000000000000000000000000000000"]);
    expect(res.status).toBe(2);
  });

  it("exits 2 when --changed is given no base", () => {
    expect(run(["--changed"]).status).toBe(2);
  });

  it("exits 2 when there is no merge base with the given commit", () => {
    const orphan = execFileSync(
      "git",
      ["-C", repo, "commit-tree", "-m", "orphan", `${baseSha}^{tree}`],
      { encoding: "utf8" }
    ).trim();
    expect(run(["--changed", "--base", orphan]).status).toBe(2);
  });

  it("--staged only looks at the index", () => {
    write("components/Staged.tsx", 'export const S = () => <b className="bg-[#abcdef]" />;\n');
    git("add", "components/Staged.tsx");
    write("components/Unstaged.tsx", 'export const U = () => <b className="bg-[#fedcba]" />;\n');
    const { status, json } = runJson(["--staged"]);
    expect(status).toBe(1);
    expect(json.findings.map((f: Finding) => f.file)).toEqual(["components/Staged.tsx"]);
    git("reset", "-q");
  });

  it("--staged covers stylesheets, not just TypeScript", () => {
    write("styles/staged.scss", ".x { color: #123456; }\n");
    git("add", "styles/staged.scss");
    const { status, json } = runJson(["--staged"]);
    expect(status).toBe(1);
    expect(json.summary.byRule.DS007).toBe(1);
    git("reset", "-q");
  });

  it("--worktree treats an untracked file as fully added", () => {
    const { status, json } = runJson(["--worktree", "components/Unstaged.tsx"]);
    expect(status).toBe(1);
    expect(json.findings.map((f: Finding) => f.rule)).toEqual(["DS001"]);
  });

  it("--worktree ignores untouched legacy debt", () => {
    const { status, json } = runJson(["--worktree", "components/Legacy.tsx"]);
    expect(status).toBe(0);
    expect(json.findings).toEqual([]);
  });

  it("--worktree accepts an absolute Windows-style path", () => {
    const abs = path.join(repo, "components", "Unstaged.tsx");
    const { json } = runJson(["--worktree", abs]);
    expect(json.findings).toHaveLength(1);
  });

  it("--files scans whole files but never blocks", () => {
    const { status, json } = runJson(["--files", "components/Legacy.tsx"]);
    expect(status).toBe(0);
    expect(json.mode).toBe("files");
    expect(json.summary.byRule.DS001).toBe(2);
  });

  it("emits the documented JSON envelope", () => {
    const { json } = runJson(["--report"]);
    expect(Object.keys(json).sort()).toEqual(["base", "findings", "mode", "summary"]);
    expect(Object.keys(json.summary).sort()).toEqual(["byRule", "error", "waived", "warn"]);
  });

  it("prints a human table without --json", () => {
    const res = run(["--report"]);
    expect(res.stdout).toContain("DS001");
    expect(res.stdout).toContain("components/Legacy.tsx");
  });

  // D1: `git diff --cached` compares HEAD to the index, so the content that
  // its line numbers refer to is the index blob — not the working copy the
  // developer keeps editing after `git add`.
  it("--staged blocks a staged violation even when the worktree already fixes it", () => {
    write("components/Drift.tsx", 'export const D = () => <b className="bg-[#BADBAD]" />;\n');
    git("add", "components/Drift.tsx");
    write("components/Drift.tsx", 'export const D = () => <b className="bg-brand" />;\n');
    const { status, json } = runJson(["--staged"]);
    expect(status).toBe(1);
    expect(json.findings.map((f: Finding) => f.rule)).toEqual(["DS001"]);
    git("reset", "-q");
    fs.rmSync(path.join(repo, "components/Drift.tsx"));
  });

  it("--staged passes a clean staged change even when the worktree is dirty", () => {
    write("components/Clean2.tsx", 'export const C = () => <b className="bg-brand" />;\n');
    git("add", "components/Clean2.tsx");
    write("components/Clean2.tsx", 'export const C = () => <b className="bg-[#DEAD00]" />;\n');
    const { status, json } = runJson(["--staged"]);
    expect(status).toBe(0);
    expect(json.findings).toEqual([]);
    git("reset", "-q");
    fs.rmSync(path.join(repo, "components/Clean2.tsx"));
  });

  it("--staged applies index line numbers to index content after an insertion", () => {
    // Stage a violation on line 2, then insert a line above it in the worktree
    // so the two revisions disagree about where line 2 is.
    write(
      "components/Shift.tsx",
      ["export const S = () => (", '  <b className="bg-[#C0FFEE]" />', ");", ""].join("\n")
    );
    git("add", "components/Shift.tsx");
    write(
      "components/Shift.tsx",
      [
        "// an unstaged comment pushes everything down",
        "export const S = () => (",
        '  <b className="bg-[#C0FFEE]" />',
        ");",
        "",
      ].join("\n")
    );
    const { status, json } = runJson(["--staged"]);
    expect(status).toBe(1);
    expect(json.findings).toHaveLength(1);
    expect(json.findings[0].line).toBe(2);
    git("reset", "-q");
    fs.rmSync(path.join(repo, "components/Shift.tsx"));
  });

  it("--staged treats a staged new file as fully added", () => {
    write("components/Fresh.tsx", 'export const F = () => <b className="bg-[#0FF1CE]" />;\n');
    git("add", "components/Fresh.tsx");
    const { status, json } = runJson(["--staged"]);
    expect(status).toBe(1);
    expect(json.findings.map((f: Finding) => f.file)).toEqual(["components/Fresh.tsx"]);
    git("reset", "-q");
    fs.rmSync(path.join(repo, "components/Fresh.tsx"));
  });

  it("--changed reads content from HEAD, not from a dirty worktree", () => {
    const head = git("rev-parse", "HEAD");
    write("components/Legacy.tsx", 'export const L = () => <b className="bg-[#FADED0]" />;\n');
    const { json } = runJson(["--changed", "--base", head]);
    expect(json.findings).toEqual([]);
    git("checkout", "--", "components/Legacy.tsx");
  });

  it("counts a waived finding under waived, not error", () => {
    write(
      "components/Waived.tsx",
      [
        "// design-check-ignore: DS001 tenant supplied swatch, migration tracked in DEV-999",
        'export const W = () => <b className="bg-[#123456]" />;',
        "",
      ].join("\n")
    );
    const { status, json } = runJson(["--worktree", "components/Waived.tsx"]);
    expect(status).toBe(0);
    expect(json.summary.error).toBe(0);
    expect(json.summary.waived).toBe(1);
  });
});

// The CLI-mode block above shells out, which proves the real exit codes but
// hides the CLI half from in-process coverage. `run()` returns the exit code
// instead of calling process.exit, so it can also be driven directly.
describe("run() in process", () => {
  let repo: string;

  const git = (...args: string[]) =>
    execFileSync("git", args, { cwd: repo, encoding: "utf8" }).trim();

  const write = (rel: string, body: string) => {
    const abs = path.join(repo, rel);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, body);
  };

  /** Runs the CLI in this process, capturing stdout. */
  const capture = (args: string[]) => {
    const chunks: string[] = [];
    const original = process.stdout.write;
    process.stdout.write = ((chunk: string | Uint8Array) => {
      chunks.push(String(chunk));
      return true;
    }) as typeof process.stdout.write;
    try {
      const code = designCheck.run(["--root", repo, ...args]);
      return { code, out: chunks.join("") };
    } finally {
      process.stdout.write = original;
    }
  };

  beforeAll(() => {
    repo = fs.mkdtempSync(path.join(os.tmpdir(), "design-run-"));
    git("init", "-q", "-b", "main");
    git("config", "user.email", "dev@example.com");
    git("config", "user.name", "Dev");
    write(
      "components/Palette.tsx",
      [
        "export const Palette = () => (",
        '  <span className="bg-[#2ed1a8]">brand</span>',
        '  <span className="p-[13px]">scale</span>',
        ");",
        "",
      ].join("\n")
    );
    write("styles/theme.scss", ".a { color: #123456; }\n");
    git("add", "-A");
    git("commit", "-qm", "seed");
  });

  afterAll(() => {
    fs.rmSync(repo, { recursive: true, force: true });
  });

  it("prints the help text and exits 0", () => {
    const { code, out } = capture(["--help"]);
    expect(code).toBe(0);
    expect(out).toContain("Usage: node scripts/check-design-system.js");
    expect(out).toContain("--worktree");
  });

  it("renders a human table with the curated hint and exits 1", () => {
    const { code, out } = capture([]);
    expect(code).toBe(1);
    expect(out).toContain("components/Palette.tsx:2");
    expect(out).toContain("DS001");
    expect(out).toContain("→ bg-brand");
    expect(out).toContain("2 error(s), 1 warning(s), 0 waived");
  });

  it("says so plainly when a scan is clean", () => {
    const { code, out } = capture(["--files", "components/Nope.tsx"]);
    expect(code).toBe(0);
    expect(out).toContain("no design-system findings");
  });

  it("emits JSON when asked and never exits 1 under --report", () => {
    const { code, out } = capture(["--report", "--json"]);
    expect(code).toBe(0);
    const json = JSON.parse(out);
    expect(json.mode).toBe("full");
    expect(json.base).toBeNull();
    expect(json.summary.byRule).toEqual({ DS001: 1, DS006: 1, DS007: 1 });
  });

  it("throws rather than reporting zero when --changed has no base", () => {
    expect(() => capture(["--changed"])).toThrow(/--base/);
  });

  it("throws on an unknown option", () => {
    expect(() => capture(["--nope"])).toThrow(/unknown option/);
  });

  it("throws on a stray positional argument", () => {
    expect(() => capture(["oops.tsx"])).toThrow(/unexpected argument/);
  });

  it("accepts an explicit --config path", () => {
    const configPath = path.resolve(__dirname, "../../../scripts/design-check.config.json");
    const { code } = capture(["--report", "--json", "--config", configPath]);
    expect(code).toBe(0);
  });

  it("reports nothing for a tracked file with no local edits", () => {
    const { code, out } = capture(["--worktree", "components/Palette.tsx", "--json"]);
    expect(code).toBe(0);
    expect(JSON.parse(out).findings).toEqual([]);
  });

  it("reports the added lines of an edited tracked file", () => {
    write(
      "components/Palette.tsx",
      [
        "export const Palette = () => (",
        '  <span className="bg-[#2ed1a8]">brand</span>',
        '  <span className="p-[13px]">scale</span>',
        '  <span className="text-[#ff0000]">added</span>',
        ");",
        "",
      ].join("\n")
    );
    const { code, out } = capture(["--worktree", "components/Palette.tsx", "--json"]);
    expect(code).toBe(1);
    const json = JSON.parse(out);
    expect(json.findings).toHaveLength(1);
    expect(json.findings[0].line).toBe(4);
    git("checkout", "--", "components/Palette.tsx");
  });

  it("reports nothing staged when the index is clean", () => {
    const { code, out } = capture(["--staged", "--json"]);
    expect(code).toBe(0);
    expect(JSON.parse(out).findings).toEqual([]);
  });

  // D10: the untracked branch of --worktree had subprocess-only coverage.
  it("treats an untracked file as fully added", () => {
    write("components/Untracked.tsx", 'export const U = () => <b className="bg-[#BEEFED}" />;\n');
    write("components/Untracked.tsx", 'export const U = () => <b className="bg-[#BEEFED]" />;\n');
    const { code, out } = capture(["--worktree", "components/Untracked.tsx", "--json"]);
    expect(code).toBe(1);
    const json = JSON.parse(out);
    expect(json.findings).toHaveLength(1);
    expect(json.findings[0].line).toBe(1);
    fs.rmSync(path.join(repo, "components/Untracked.tsx"));
  });

  it("skips an untracked path that does not exist on disk", () => {
    const { code, out } = capture(["--worktree", "components/Ghost.tsx", "--json"]);
    expect(code).toBe(0);
    expect(JSON.parse(out).findings).toEqual([]);
  });

  it("reads --staged content from the index in process too", () => {
    write("components/Idx.tsx", 'export const I = () => <b className="bg-[#123456]" />;\n');
    git("add", "components/Idx.tsx");
    write("components/Idx.tsx", "export const I = () => null;\n");
    const { code, out } = capture(["--staged", "--json"]);
    expect(code).toBe(1);
    expect(JSON.parse(out).findings[0].file).toBe("components/Idx.tsx");
    git("reset", "-q");
    fs.rmSync(path.join(repo, "components/Idx.tsx"));
  });
});

describe("RULES table", () => {
  it("exposes every documented rule with its severity", () => {
    expect(Object.keys(RULES).sort()).toEqual([
      "DS000",
      "DS001",
      "DS002",
      "DS003",
      "DS004",
      "DS005",
      "DS006",
      "DS007",
    ]);
    expect(RULES.DS006.severity).toBe("warn");
    expect(RULES.DS005.severity).toBe("error");
  });
});
