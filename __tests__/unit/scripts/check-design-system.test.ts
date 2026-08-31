import { describe, expect, it } from "vitest";
import {
  config,
  countOf,
  fixture,
  rulesOf,
  scan,
  scanFixture,
  scanText,
} from "./helpers/design-check-harness";

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

  // Rival R3: requiring a dash after the `!` missed utilities this repo really
  // uses — ApplicationsFullView.tsx:147 `!flex`, sidebar-below-navbar.ts:14
  // `md:!absolute`, narrative-block.tsx:43 `!underline`.
  it.each([
    ["!flex", "no-dash utility"],
    ["!underline", "no-dash utility"],
    ["md:!absolute", "no-dash utility behind a variant"],
    ["!-mt-2", "negative utility"],
    ["![color:red]", "arbitrary property"],
    ["!hidden", "no-dash utility"],
    ["lg:hover:!block", "no-dash utility behind stacked variants"],
  ])("flags %s (%s)", (cls) => {
    expect(countOf(scan(`const c = "${cls}";`), "DS004")).toBe(1);
  });

  it.each(['"!"', '"!!"', '"!1"', '"! spaced"'])(
    "does not treat %s as an important utility",
    (snippet) => {
      expect(countOf(scan(`const c = ${snippet};`), "DS004")).toBe(0);
    }
  );

  it("does not flag a negated identifier, which is code and not a string", () => {
    expect(countOf(scan("const c = !selected ? a : b;"), "DS004")).toBe(0);
  });

  it("counts every important utility in one class string", () => {
    const text = 'const c = "font-medium !text-brand !underline !decoration-brand/40";';
    expect(countOf(scan(text), "DS004")).toBe(3);
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

  // Tester N3: widget/ became a scan root in F1, and it carries its own
  // Tailwind theme — a token definition by nature.
  it("exempts widget/tailwind.config.ts, which defines the widget's tokens", () => {
    expect(config.tokenDefinitionFiles).toContain("widget/tailwind.config.ts");
    const text = 'module.exports = { theme: { colors: { brand: "#2ed1a8" } } };';
    expect(countOf(scanText({ file: "widget/tailwind.config.ts", text, config }), "DS002")).toBe(0);
    expect(countOf(scanText({ file: "widget/other.ts", text, config }), "DS002")).toBe(1);
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

  // Tester N2: matching a well-formed prefix let a malformed list waive the
  // part that parsed and swallow the rest into the reason.
  it.each(["DS001,,DS004", "DS001,", ",DS001", "DS001 ,, DS004", "DS001,,", "DS001,DS004,"])(
    "raises DS000 and waives nothing for the malformed list %s",
    (list) => {
      const text = [
        `// design-check-ignore: ${list} tenant swatch forced over a vendor sheet`,
        'const c = "!bg-[#123456]";',
      ].join("\n");
      const result = scan(text);
      expect(countOf(result, "DS000")).toBe(1);
      expect(result.filter((f) => f.waived)).toHaveLength(0);
    }
  );

  it("names the malformed list in the DS000 message", () => {
    const text = [
      "// design-check-ignore: DS001,,DS004 tenant swatch forced over a vendor sheet",
      'const c = "bg-[#123456]";',
    ].join("\n");
    const [bad] = scan(text).filter((f) => f.rule === "DS000");
    expect(bad.message).toContain("DS001,,DS004");
    expect(bad.message).toMatch(/malformed/i);
  });

  it.each(["DS001,DS004", "DS001, DS004", "DS001 , DS004"])(
    "still accepts the well-formed list %s",
    (list) => {
      const text = [
        `// design-check-ignore: ${list} tenant swatch forced over a vendor sheet`,
        'const c = "!bg-[#123456]";',
      ].join("\n");
      const result = scan(text);
      expect(countOf(result, "DS000")).toBe(0);
      expect(result.filter((f) => f.waived)).toHaveLength(2);
    }
  );

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
