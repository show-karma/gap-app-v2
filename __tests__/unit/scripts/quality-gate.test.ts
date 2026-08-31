import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

// Minimal shapes for the metric snapshots the gate compares. Deliberately
// partial: every field is optional because the collectors legitimately return
// null when skipped, and a baseline written before a metric existed omits it.
interface DesignMetric {
  total?: number;
  byRule?: Record<string, number>;
  failed?: boolean;
}

interface Violations {
  biome?: number;
  knipUnusedFiles?: number;
  knipUnusedExports?: number;
  knipUnusedTypes?: number;
  knipUnusedDeps?: number;
  knipDuplicates?: number;
  design?: DesignMetric;
}

interface OversizedFile {
  lines: number;
  bytes: number;
}

interface Metrics {
  $schema?: string;
  generatedAt?: string;
  generatedFromCommit?: string;
  coverage?: { lines: number; statements: number; functions: number; branches: number };
  duplication?: { percent: number; fragments: number };
  violations?: Violations;
  oversizedFiles?: Record<string, OversizedFile>;
  reactDoctor?: { score: number; errors: number; warnings: number };
}

interface CompareResult {
  regressions: string[];
  improvements: string[];
  notes: string[];
}

// The quality-gate script is a CommonJS Node script with no runtime deps;
// it exposes its pure helpers via module.exports so they can be unit tested.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const qualityGate = require("../../../scripts/quality-gate.js") as {
  compare: (current: Metrics, baseline: Metrics) => CompareResult;
  matchGlob: (path: string, glob: string) => boolean;
  countLines: (abs: string) => number;
  mergeDesignBaseline: (baseline: Metrics, design: DesignMetric) => Metrics;
  assertUsableBaseline: (baseline: unknown, label: string) => Metrics;
  updateDesignBaseline: (input: {
    baselinePath: string;
    design: DesignMetric;
    fs?: {
      readFileSync: (p: string, enc: string) => string;
      writeFileSync: (p: string, data: string) => void;
      renameSync: (from: string, to: string) => void;
      unlinkSync: (p: string) => void;
    };
    label?: string;
  }) => Metrics;
  writeJsonAtomic: (targetPath: string, contents: string) => void;
  parseUpdateBaselineScope: (argv: string[]) => string | null;
  render: (input: {
    status: string;
    current: Metrics;
    baseline: Metrics;
    regressions: string[];
    improvements: string[];
    notes?: string[];
  }) => string;
};

const { compare, matchGlob, countLines } = qualityGate;

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
// Rival R4: compare() correctly skipped an absent baseline, but the renderer
// synthesised `{ total: 0 }` and printed every rule as a fresh regression —
// a passing gate whose report claimed thousands of new violations.
describe("quality-gate render() — absent design baseline (Rival R4)", () => {
  const { render } = qualityGate;

  const current: Metrics = {
    ...emptyMetrics,
    violations: {
      ...emptyMetrics.violations,
      design: { total: 2799, byRule: { DS001: 173, DS006: 1164 } },
    },
  };

  const renderWith = (baseline: Metrics, notes: string[] = []) =>
    render({ status: "pass", current, baseline, regressions: [], improvements: [], notes });

  it("prints 'not measured' instead of a zero baseline", () => {
    const out = renderWith(emptyMetrics);
    expect(out).toContain("not measured");
    expect(out).not.toMatch(/Design system\s*\|\s*0\s*\|/);
  });

  it("prints no delta when there is nothing to compare against", () => {
    const out = renderWith(emptyMetrics);
    const row = out.split("\n").find((l) => l.includes("Design system")) ?? "";
    expect(row).not.toMatch(/\+\d/);
    expect(row).toContain("—");
  });

  it("shows every per-rule baseline as not measured, with no delta", () => {
    const out = renderWith(emptyMetrics);
    const ds001 = out.split("\n").find((l) => l.trimStart().startsWith("| DS001")) ?? "";
    expect(ds001).toContain("not measured");
    expect(ds001).not.toMatch(/\+\d/);
  });

  it("tells the reader how to seed the baseline", () => {
    expect(renderWith(emptyMetrics)).toContain("--update-baseline=design");
  });

  it("renders real numbers and deltas once a baseline exists", () => {
    const baseline: Metrics = {
      ...emptyMetrics,
      violations: {
        ...emptyMetrics.violations,
        design: { total: 2796, byRule: { DS001: 170, DS006: 1164 } },
      },
    };
    const out = renderWith(baseline);
    expect(out).not.toContain("not measured");
    expect(out).toContain("+3");
  });

  it("shows the collector failure rather than a count", () => {
    const failed: Metrics = {
      ...emptyMetrics,
      violations: { ...emptyMetrics.violations, design: { failed: true } },
    };
    const out = render({
      status: "fail",
      current: failed,
      baseline: emptyMetrics,
      regressions: ["design collector failed"],
      improvements: [],
      notes: [],
    });
    expect(out).toContain("collector failed");
  });

  it("renders the notes section when compare() produced one", () => {
    const out = renderWith(emptyMetrics, ["design: no baseline yet — run it"]);
    expect(out).toContain("## Notes");
    expect(out).toContain("design: no baseline yet");
  });
});

// Rival R5: a scoped update merges into the existing baseline and rewrites the
// whole file, so an incomplete one must be rejected and the write must be
// atomic. The path and the filesystem are injected — no test touches the
// tracked quality-baseline.json.
describe("quality-gate updateDesignBaseline() (Rival R5)", () => {
  const { updateDesignBaseline, assertUsableBaseline, writeJsonAtomic } = qualityGate;

  const DESIGN: DesignMetric = { total: 2789, byRule: { DS001: 173 } };

  const completeBaseline = (): Metrics => ({
    $schema: "./scripts/quality-baseline.schema.json",
    generatedAt: "2026-08-26T14:36:55.036Z",
    generatedFromCommit: "6f74e15",
    coverage: { lines: 1, statements: 2, functions: 3, branches: 4 },
    duplication: { percent: 1.06, fragments: 68 },
    violations: { biome: 1151 },
    oversizedFiles: { "a.ts": { lines: 900, bytes: 1 } },
    reactDoctor: { score: 0, errors: 64, warnings: 3213 },
  });

  /** A throwaway baseline file in its own temp directory. */
  const withTempBaseline = <T>(contents: string | null, fn: (baselinePath: string) => T): T => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "quality-baseline-"));
    const baselinePath = path.join(dir, "quality-baseline.json");
    if (contents !== null) fs.writeFileSync(baselinePath, contents);
    try {
      return fn(baselinePath);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  };

  it("updates only violations.design in a complete baseline", () => {
    withTempBaseline(JSON.stringify(completeBaseline()), (baselinePath) => {
      updateDesignBaseline({ baselinePath, design: DESIGN });
      const written = JSON.parse(fs.readFileSync(baselinePath, "utf8")) as Metrics;
      expect(written.violations?.design).toEqual(DESIGN);
      expect(written.violations?.biome).toBe(1151);
      expect(written.coverage).toEqual(completeBaseline().coverage);
      expect(written.oversizedFiles).toEqual(completeBaseline().oversizedFiles);
      expect(written.reactDoctor).toEqual(completeBaseline().reactDoctor);
    });
  });

  it("rejects an empty object, which is valid JSON but not a baseline", () => {
    withTempBaseline("{}", (baselinePath) => {
      expect(() => updateDesignBaseline({ baselinePath, design: DESIGN })).toThrow(
        /missing required section/i
      );
      expect(fs.readFileSync(baselinePath, "utf8")).toBe("{}");
    });
  });

  it.each(["coverage", "duplication", "violations", "oversizedFiles", "reactDoctor"])(
    "rejects a baseline missing %s",
    (section) => {
      const partial = completeBaseline() as Record<string, unknown>;
      delete partial[section];
      withTempBaseline(JSON.stringify(partial), (baselinePath) => {
        expect(() => updateDesignBaseline({ baselinePath, design: DESIGN })).toThrow(
          new RegExp(section)
        );
      });
    }
  );

  it("rejects a section that is present but not an object", () => {
    const broken = { ...completeBaseline(), coverage: 42 };
    withTempBaseline(JSON.stringify(broken), (baselinePath) => {
      expect(() => updateDesignBaseline({ baselinePath, design: DESIGN })).toThrow(/coverage/);
    });
  });

  it("rejects a malformed baseline", () => {
    withTempBaseline("{ not json at all", (baselinePath) => {
      expect(() => updateDesignBaseline({ baselinePath, design: DESIGN })).toThrow(
        /not valid JSON/i
      );
    });
  });

  it("rejects an absent baseline", () => {
    withTempBaseline(null, (baselinePath) => {
      expect(() => updateDesignBaseline({ baselinePath, design: DESIGN })).toThrow(
        /missing or not valid JSON/i
      );
    });
  });

  it("rejects a JSON array", () => {
    withTempBaseline('["not", "a", "baseline"]', (baselinePath) => {
      expect(() => updateDesignBaseline({ baselinePath, design: DESIGN })).toThrow(
        /not a baseline object/i
      );
    });
  });

  it("refuses to write a failed collector", () => {
    withTempBaseline(JSON.stringify(completeBaseline()), (baselinePath) => {
      const before = fs.readFileSync(baselinePath, "utf8");
      expect(() => updateDesignBaseline({ baselinePath, design: { failed: true } })).toThrow(
        /failed design collector/i
      );
      expect(fs.readFileSync(baselinePath, "utf8")).toBe(before);
    });
  });

  // The write failure is real: an injected fs throws from writeFileSync.
  it("propagates a write failure and leaves the baseline untouched", () => {
    withTempBaseline(JSON.stringify(completeBaseline()), (baselinePath) => {
      const before = fs.readFileSync(baselinePath, "utf8");
      const failing = {
        readFileSync: fs.readFileSync,
        writeFileSync: () => {
          throw new Error("ENOSPC: no space left on device");
        },
        renameSync: fs.renameSync,
        unlinkSync: fs.unlinkSync,
      };
      expect(() => updateDesignBaseline({ baselinePath, design: DESIGN, fs: failing })).toThrow(
        /ENOSPC/
      );
      expect(fs.readFileSync(baselinePath, "utf8")).toBe(before);
    });
  });

  it("propagates a rename failure and cleans up the temp file", () => {
    withTempBaseline(JSON.stringify(completeBaseline()), (baselinePath) => {
      const before = fs.readFileSync(baselinePath, "utf8");
      const failing = {
        readFileSync: fs.readFileSync,
        writeFileSync: fs.writeFileSync,
        renameSync: () => {
          throw new Error("EPERM: operation not permitted");
        },
        unlinkSync: fs.unlinkSync,
      };
      expect(() => updateDesignBaseline({ baselinePath, design: DESIGN, fs: failing })).toThrow(
        /EPERM/
      );
      expect(fs.readFileSync(baselinePath, "utf8")).toBe(before);
      // No stray temp file next to the baseline.
      const leftovers = fs
        .readdirSync(path.dirname(baselinePath))
        .filter((n) => n.endsWith(".tmp"));
      expect(leftovers).toEqual([]);
    });
  });

  it("writes through a temp file and renames it into place", () => {
    withTempBaseline(JSON.stringify(completeBaseline()), (baselinePath) => {
      const order: string[] = [];
      const spy = {
        readFileSync: fs.readFileSync,
        writeFileSync: (p: string, data: string) => {
          order.push(`write:${path.basename(p)}`);
          fs.writeFileSync(p, data);
        },
        renameSync: (from: string, to: string) => {
          order.push(`rename:${path.basename(from)}→${path.basename(to)}`);
          fs.renameSync(from, to);
        },
        unlinkSync: fs.unlinkSync,
      };
      updateDesignBaseline({ baselinePath, design: DESIGN, fs: spy });
      expect(order).toHaveLength(2);
      expect(order[0]).toMatch(/^write:\..*\.tmp$/);
      expect(order[1]).toMatch(/^rename:.*→quality-baseline\.json$/);
    });
  });

  it("assertUsableBaseline accepts a complete baseline", () => {
    expect(() => assertUsableBaseline(completeBaseline(), "test")).not.toThrow();
  });

  it("writeJsonAtomic leaves no temp file behind on success", () => {
    withTempBaseline("{}", (baselinePath) => {
      writeJsonAtomic(baselinePath, '{"ok":true}\n');
      expect(JSON.parse(fs.readFileSync(baselinePath, "utf8"))).toEqual({ ok: true });
      expect(fs.readdirSync(path.dirname(baselinePath))).toEqual(["quality-baseline.json"]);
    });
  });
});

describe("quality-gate parseUpdateBaselineScope() (F3)", () => {
  const { parseUpdateBaselineScope } = qualityGate;

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
  const { mergeDesignBaseline } = qualityGate;

  const baseline: Metrics = {
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
