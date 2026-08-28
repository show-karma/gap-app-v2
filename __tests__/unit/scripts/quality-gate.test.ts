import { describe, expect, it } from "vitest";

// The quality-gate script is a CommonJS Node script with no runtime deps;
// it exposes its pure helpers via module.exports so they can be unit tested.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { compare, matchGlob, countLines } = require("../../../scripts/quality-gate.js") as {
  compare: (
    current: any,
    baseline: any
  ) => { regressions: string[]; improvements: string[]; notes: string[] };
  matchGlob: (path: string, glob: string) => boolean;
  countLines: (abs: string) => number;
};

const emptyMetrics = {
  coverage: { lines: 80, statements: 80, functions: 80, branches: 80 },
  duplication: { percent: 1, fragments: 10 },
  violations: {
    biome: 0,
    knipUnusedFiles: 0,
    knipUnusedExports: 0,
    knipUnusedTypes: 0,
    knipUnusedDeps: 0,
    knipDuplicates: 0,
  },
  oversizedFiles: {},
  reactDoctor: { score: 90, errors: 0, warnings: 0 },
};

describe("quality-gate compare()", () => {
  it("returns no regressions when current matches baseline", () => {
    const { regressions, improvements } = compare(emptyMetrics, emptyMetrics);
    expect(regressions).toEqual([]);
    expect(improvements).toEqual([]);
  });

  it("flags coverage drops as regressions", () => {
    const current = {
      ...emptyMetrics,
      coverage: { lines: 70, statements: 80, functions: 80, branches: 80 },
    };
    const { regressions } = compare(current, emptyMetrics);
    expect(regressions.some((r) => r.includes("Coverage.lines"))).toBe(true);
  });

  it("treats coverage gains as improvements", () => {
    const current = {
      ...emptyMetrics,
      coverage: { lines: 85, statements: 80, functions: 80, branches: 80 },
    };
    const { regressions, improvements } = compare(current, emptyMetrics);
    expect(regressions).toEqual([]);
    expect(improvements.some((i) => i.includes("Coverage.lines"))).toBe(true);
  });

  it("flags duplication increases", () => {
    const current = { ...emptyMetrics, duplication: { percent: 2, fragments: 12 } };
    const { regressions } = compare(current, emptyMetrics);
    expect(regressions.some((r) => r.includes("Duplication"))).toBe(true);
  });

  it("flags new biome violations", () => {
    const current = {
      ...emptyMetrics,
      violations: { ...emptyMetrics.violations, biome: 5 },
    };
    const { regressions } = compare(current, emptyMetrics);
    expect(regressions.some((r) => r.startsWith("biome"))).toBe(true);
  });

  it("flags knip unused-types growth distinctly from unused-exports", () => {
    const current = {
      ...emptyMetrics,
      violations: { ...emptyMetrics.violations, knipUnusedTypes: 3 },
    };
    const { regressions } = compare(current, emptyMetrics);
    expect(regressions.some((r) => r.startsWith("knipUnusedTypes"))).toBe(true);
    expect(regressions.some((r) => r.startsWith("knipUnusedExports"))).toBe(false);
  });

  it("flags an oversized file that grew in line count", () => {
    const baseline = {
      ...emptyMetrics,
      oversizedFiles: { "src/big.ts": { lines: 700, bytes: 30000 } },
    };
    const current = {
      ...emptyMetrics,
      oversizedFiles: { "src/big.ts": { lines: 750, bytes: 30001 } },
    };
    const { regressions } = compare(current, baseline);
    expect(regressions.some((r) => r.includes("src/big.ts") && r.includes("grew"))).toBe(true);
  });

  it("does not flag oversized files when only byte count grows (formatting noise)", () => {
    const baseline = {
      ...emptyMetrics,
      oversizedFiles: { "src/big.ts": { lines: 700, bytes: 30000 } },
    };
    const current = {
      ...emptyMetrics,
      oversizedFiles: { "src/big.ts": { lines: 700, bytes: 31000 } },
    };
    const { regressions } = compare(current, baseline);
    expect(regressions).toEqual([]);
  });

  it("flags brand-new oversized files not present in baseline", () => {
    const current = {
      ...emptyMetrics,
      oversizedFiles: { "src/new-bloat.ts": { lines: 800, bytes: 40000 } },
    };
    const { regressions } = compare(current, emptyMetrics);
    expect(regressions.some((r) => r.includes("src/new-bloat.ts"))).toBe(true);
  });

  it("flags React Doctor health regressions", () => {
    const current = {
      ...emptyMetrics,
      reactDoctor: { score: 80, errors: 1, warnings: 0 },
    };
    const { regressions } = compare(current, emptyMetrics);
    expect(regressions.some((r) => r.includes("health score"))).toBe(true);
    expect(regressions.some((r) => r.includes("errors"))).toBe(true);
  });
});

describe("quality-gate compare() — design system (DEV-557)", () => {
  const withDesign = (byRule: Record<string, number>) => ({
    ...emptyMetrics,
    violations: {
      ...emptyMetrics.violations,
      design: { total: Object.values(byRule).reduce((a, b) => a + b, 0), byRule },
    },
  });

  const baseline = withDesign({ DS001: 173, DS005: 1056, DS006: 2086 });

  it("returns no regressions when the design counts match", () => {
    const { regressions, improvements } = compare(baseline, baseline);
    expect(regressions).toEqual([]);
    expect(improvements).toEqual([]);
  });

  it("flags a per-rule increase like a biome counter", () => {
    const current = withDesign({ DS001: 174, DS005: 1056, DS006: 2086 });
    const { regressions } = compare(current, baseline);
    expect(regressions.some((r) => r.startsWith("design.DS001"))).toBe(true);
    expect(regressions.some((r) => r.startsWith("design.DS005"))).toBe(false);
  });

  it("treats a per-rule decrease as an improvement", () => {
    const current = withDesign({ DS001: 170, DS005: 1056, DS006: 2086 });
    const { regressions, improvements } = compare(current, baseline);
    expect(regressions).toEqual([]);
    expect(improvements.some((i) => i.startsWith("design.DS001"))).toBe(true);
  });

  it("flags a rule that is new since the snapshot", () => {
    const current = withDesign({ DS001: 173, DS005: 1056, DS006: 2086, DS007: 4 });
    const { regressions } = compare(current, baseline);
    expect(regressions.some((r) => r.startsWith("design.DS007"))).toBe(true);
  });

  it("does not mix design counters with the biome counter", () => {
    const current = withDesign({ DS001: 300, DS005: 1056, DS006: 2086 });
    const { regressions } = compare(current, baseline);
    expect(regressions.some((r) => r.startsWith("biome"))).toBe(false);
  });

  it("reports a collector failure as a regression, never as zero findings", () => {
    const current = {
      ...emptyMetrics,
      violations: { ...emptyMetrics.violations, design: { failed: true } },
    };
    const { regressions } = compare(current, baseline);
    expect(regressions.some((r) => /design collector failed/i.test(r))).toBe(true);
    // A crashed collector must not read as "every rule went to zero".
    expect(regressions.some((r) => r.startsWith("design.DS001"))).toBe(false);
  });

  it("ignores design entirely when neither side reports it", () => {
    const { regressions } = compare(emptyMetrics, emptyMetrics);
    expect(regressions.some((r) => r.startsWith("design"))).toBe(false);
  });

  // F4: an absent baseline key is "not measured yet", never 0. Treating it as
  // 0 would fail the very PR that introduces the checker with thousands of
  // bogus regressions.
  it("does not compare at all when the baseline has no design section", () => {
    const current = withDesign({ DS001: 173, DS005: 1056 });
    const { regressions, improvements } = compare(current, emptyMetrics);
    expect(regressions.some((r) => r.startsWith("design"))).toBe(false);
    expect(improvements.some((i) => i.startsWith("design"))).toBe(false);
  });

  it("notes how to seed the baseline when the design section is absent", () => {
    const { notes } = compare(withDesign({ DS001: 173 }), emptyMetrics);
    expect(notes).toContain(
      "design: no baseline yet — run pnpm quality --update-baseline=design on a PR labelled quality-baseline"
    );
  });

  it("emits no note once the baseline has a design section", () => {
    const { notes } = compare(baseline, baseline);
    expect(notes.some((n: string) => n.startsWith("design: no baseline"))).toBe(false);
  });

  it("treats an absent violations object on the baseline the same way", () => {
    const { regressions, notes } = compare(withDesign({ DS001: 3 }), {});
    expect(regressions.some((r) => r.startsWith("design"))).toBe(false);
    expect(notes.some((n: string) => n.startsWith("design: no baseline"))).toBe(true);
  });

  it("still reports a collector failure even with no baseline to compare against", () => {
    const current = {
      ...emptyMetrics,
      violations: { ...emptyMetrics.violations, design: { failed: true } },
    };
    const { regressions } = compare(current, emptyMetrics);
    expect(regressions.some((r) => /design collector failed/i.test(r))).toBe(true);
  });
});

// F3: `pnpm quality:baseline` passes the bare flag; the design refresh passes
// a scoped one. Both must parse, and an unknown scope must not silently
// refresh everything.
describe("quality-gate parseUpdateBaselineScope() (F3)", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { parseUpdateBaselineScope } = require("../../../scripts/quality-gate.js") as {
    parseUpdateBaselineScope: (argv: string[]) => string | null;
  };

  it("returns null when the flag is absent", () => {
    expect(parseUpdateBaselineScope([])).toBeNull();
    expect(parseUpdateBaselineScope(["--report-only", "--ci"])).toBeNull();
  });

  it("reads the bare flag as a full refresh (pnpm quality:baseline)", () => {
    expect(parseUpdateBaselineScope(["--update-baseline"])).toBe("all");
    expect(parseUpdateBaselineScope(["--ci", "--update-baseline"])).toBe("all");
  });

  it("reads the scoped flag as a design-only refresh", () => {
    expect(parseUpdateBaselineScope(["--update-baseline=design"])).toBe("design");
    expect(parseUpdateBaselineScope(["--update-baseline=design", "--ci"])).toBe("design");
  });

  it("rejects an unknown scope instead of refreshing everything", () => {
    expect(() => parseUpdateBaselineScope(["--update-baseline=coverage"])).toThrow(/scope/i);
    expect(() => parseUpdateBaselineScope(["--update-baseline="])).toThrow(/scope/i);
  });

  it("is not confused by a similarly named flag", () => {
    expect(parseUpdateBaselineScope(["--update-baselines"])).toBeNull();
  });
});

describe("quality-gate mergeDesignBaseline() (--update-baseline=design)", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { mergeDesignBaseline } = require("../../../scripts/quality-gate.js") as {
    mergeDesignBaseline: (baseline: any, design: any) => any;
  };

  const baseline = {
    $schema: "./scripts/quality-baseline.schema.json",
    generatedAt: "2026-08-26T14:36:55.036Z",
    generatedFromCommit: "6f74e15",
    coverage: { lines: 1, statements: 2, functions: 3, branches: 4 },
    duplication: { percent: 1.06, fragments: 68 },
    violations: { biome: 1151, knipUnusedFiles: 208 },
    oversizedFiles: { "a.ts": { lines: 900, bytes: 1 } },
    reactDoctor: { score: 0, errors: 64, warnings: 3213 },
  };

  it("changes only violations.design", () => {
    const design = { total: 3748, byRule: { DS001: 173 } };
    const next = mergeDesignBaseline(baseline, design);
    expect(next.violations.design).toEqual(design);
    expect(next.violations.biome).toBe(1151);
    expect(next.violations.knipUnusedFiles).toBe(208);
    expect(next.coverage).toEqual(baseline.coverage);
    expect(next.duplication).toEqual(baseline.duplication);
    expect(next.oversizedFiles).toEqual(baseline.oversizedFiles);
    expect(next.reactDoctor).toEqual(baseline.reactDoctor);
    expect(next.generatedAt).toBe(baseline.generatedAt);
    expect(next.generatedFromCommit).toBe(baseline.generatedFromCommit);
    expect(next.$schema).toBe(baseline.$schema);
  });

  it("does not mutate the baseline it was given", () => {
    mergeDesignBaseline(baseline, { total: 1, byRule: { DS001: 1 } });
    expect(baseline.violations).not.toHaveProperty("design");
  });

  it("refuses to write a failed collector into the baseline", () => {
    expect(() => mergeDesignBaseline(baseline, { failed: true })).toThrow();
  });
});

describe("quality-gate matchGlob()", () => {
  it("matches simple star within a single segment", () => {
    expect(matchGlob("src/foo.ts", "src/*.ts")).toBe(true);
    expect(matchGlob("src/sub/foo.ts", "src/*.ts")).toBe(false);
  });

  it("matches double-star across segments", () => {
    expect(matchGlob("src/a/b/c/foo.ts", "src/**/foo.ts")).toBe(true);
    expect(matchGlob("src/foo.ts", "src/**/foo.ts")).toBe(true);
  });

  it("matches brace alternation", () => {
    expect(matchGlob("src/foo.ts", "src/foo.{ts,tsx}")).toBe(true);
    expect(matchGlob("src/foo.tsx", "src/foo.{ts,tsx}")).toBe(true);
    expect(matchGlob("src/foo.js", "src/foo.{ts,tsx}")).toBe(false);
  });

  it("anchors patterns (no partial matches)", () => {
    expect(matchGlob("notsrc/foo.ts", "src/*.ts")).toBe(false);
  });

  it("escapes regex metacharacters in literal segments", () => {
    expect(matchGlob("a.b.ts", "a.b.ts")).toBe(true);
    expect(matchGlob("axbxts", "a.b.ts")).toBe(false);
  });
});

describe("quality-gate countLines()", () => {
  it("returns 0 for missing files", () => {
    expect(countLines("/this/path/does/not/exist.txt")).toBe(0);
  });
});
