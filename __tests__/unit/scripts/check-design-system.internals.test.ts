import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  config,
  type DesignConfig,
  designCheck,
  diffFixture,
  type Finding,
  filterByAddedLines,
  isScannable,
  loadConfig,
  parseDiff,
  scan,
  scanText,
  toPosix,
} from "./helpers/design-check-harness";

describe("configured severities (Rival R7)", () => {
  const writeConfig = (severity: unknown): string => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "design-cfg-"));
    const file = path.join(dir, "design-check.config.json");
    fs.writeFileSync(file, JSON.stringify({ ...config, severity }));
    return file;
  };

  it("applies a configured override instead of the built-in level", () => {
    const escalated = { ...config, severity: { ...config.severity, DS006: "error" as const } };
    const [finding] = scanText({
      file: "components/A.tsx",
      text: 'const c = "p-[13px]";',
      config: escalated,
    });
    expect(finding.rule).toBe("DS006");
    expect(finding.severity).toBe("error");
  });

  it("can also relax a rule to a warning", () => {
    const relaxed = { ...config, severity: { ...config.severity, DS001: "warn" as const } };
    const [finding] = scanText({
      file: "components/A.tsx",
      text: 'const c = "bg-[#123456]";',
      config: relaxed,
    });
    expect(finding.severity).toBe("warn");
  });

  it("falls back to the built-in level when a rule is not configured", () => {
    const { severity: _dropped, ...withoutSeverity } = config as Record<string, unknown>;
    const [finding] = scanText({
      file: "components/A.tsx",
      text: 'const c = "p-[13px]";',
      config: withoutSeverity as DesignConfig,
    });
    expect(finding.severity).toBe("warn");
  });

  it("rejects an unknown rule id rather than silently ignoring it", () => {
    expect(() => loadConfig(writeConfig({ DS999: "error" }))).toThrow(/unknown rule/i);
  });

  it("rejects an unknown severity value", () => {
    expect(() => loadConfig(writeConfig({ DS001: "fatal" }))).toThrow(/expected "error" or "warn"/);
  });

  it("rejects a severity block that is not an object", () => {
    expect(() => loadConfig(writeConfig(["DS001"]))).toThrow(/must be an object/);
  });

  it("fails closed on a config that is not valid JSON", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "design-cfg-"));
    const file = path.join(dir, "broken.json");
    fs.writeFileSync(file, "{ not json");
    expect(() => loadConfig(file)).toThrow(/not valid JSON/);
  });

  it("fails closed on a missing config file", () => {
    expect(() => loadConfig(path.join(os.tmpdir(), "definitely-absent.json"))).toThrow(
      /cannot read/i
    );
  });
});

describe("pathological input stays bounded (Rival R6)", () => {
  it("handles a literal with many var() spans and colour hits in well under 2 s", () => {
    // O(N²) range checking made this quadratic: every colour hit rescanned the
    // whole var() list. 2 000 of each is ~4 M comparisons the old way.
    const chunks: string[] = [];
    for (let i = 0; i < 2000; i++) {
      chunks.push(`var(--token-${i})`, `#${(i % 0x1000000).toString(16).padStart(6, "0")}`);
    }
    const text = `const c = "${chunks.join(" ")}";`;
    const started = Date.now();
    const findings = scan(text);
    const elapsed = Date.now() - started;
    expect(findings.length).toBeGreaterThan(0);
    expect(elapsed).toBeLessThan(2000);
  });

  it("keeps errors and waived findings when truncating the displayed list", () => {
    const base = {
      file: "components/A.tsx",
      col: 1,
      endLine: 1,
      snippet: "x",
      message: "m",
      hint: null,
      waiverLine: null,
      waiverReason: null,
      waiverRules: null,
      waiverAdded: false,
    };
    const findings = [
      ...Array.from({ length: 10 }, (_, i) => ({
        ...base,
        rule: "DS006",
        severity: "warn" as const,
        line: i + 1,
        waived: false,
      })),
      { ...base, rule: "DS001", severity: "error" as const, line: 50, waived: false },
      { ...base, rule: "DS002", severity: "error" as const, line: 60, waived: true },
    ];
    const { shown, truncated } = designCheck.truncateForDisplay(findings, 3);
    expect(truncated).toBe(9);
    expect(shown).toHaveLength(3);
    expect(shown.map((f) => f.rule).sort()).toEqual(["DS001", "DS002", "DS006"]);
  });

  it("truncates per file, not across the whole run", () => {
    const make = (file: string, n: number) =>
      Array.from({ length: n }, (_, i) => ({
        file,
        rule: "DS006",
        severity: "warn" as const,
        line: i + 1,
        col: 1,
        endLine: i + 1,
        snippet: "x",
        message: "m",
        hint: null,
        waived: false,
        waiverLine: null,
        waiverReason: null,
        waiverRules: null,
        waiverAdded: false,
      }));
    const { shown, truncated } = designCheck.truncateForDisplay(
      [...make("a.tsx", 5), ...make("b.tsx", 2)],
      3
    );
    expect(truncated).toBe(2);
    expect(shown.filter((f) => f.file === "a.tsx")).toHaveLength(3);
    expect(shown.filter((f) => f.file === "b.tsx")).toHaveLength(2);
  });

  it("binary-searches sorted ranges and still answers correctly", () => {
    const ranges = Array.from({ length: 64 }, (_, i) => [i * 10, i * 10 + 5]);
    for (let pos = 0; pos < 640; pos++) {
      expect(designCheck.inRanges(pos, ranges)).toBe(pos % 10 < 5);
    }
  });

  it("agrees with the linear scan on an unsorted list", () => {
    const ranges = [
      [100, 110],
      [10, 20],
      [50, 60],
    ];
    expect(designCheck.inRanges(15, ranges, false)).toBe(true);
    expect(designCheck.inRanges(105, ranges, false)).toBe(true);
    expect(designCheck.inRanges(30, ranges, false)).toBe(false);
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
