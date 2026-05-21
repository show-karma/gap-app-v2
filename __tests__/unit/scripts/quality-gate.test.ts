import { describe, expect, it } from "vitest";

// The quality-gate script is a CommonJS Node script with no runtime deps;
// it exposes its pure helpers via module.exports so they can be unit tested.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { compare, matchGlob, countLines } = require("../../../scripts/quality-gate.js") as {
  compare: (current: any, baseline: any) => { regressions: string[]; improvements: string[] };
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
