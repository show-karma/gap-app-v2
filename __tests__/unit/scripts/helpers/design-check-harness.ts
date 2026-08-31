import fs from "node:fs";
import path from "node:path";

// Shared harness for the design-check suites. `check-design-system` is a plain
// CommonJS Node script (it has to run from the pre-commit hook, the post-edit
// hook and CI without ts-node), so its pure helpers are exported for testing,
// mirroring quality-gate.test.ts.

export interface DesignConfig {
  scanGlobs: string[];
  exclude: string[];
  tokenDefinitionFiles: string[];
  scaleDefinitionFiles: string[];
  iconGlobs: string[];
  inlineStyleExemptGlobs: string[];
  inlineStyleExemptImports: string[];
  severity: Record<string, "error" | "warn">;
  hints: Record<string, string>;
}

export interface Finding {
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
  waiverReason: string | null;
  waiverRules: string | null;
  waiverAdded: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-require-imports
export const designCheck = require("../../../../scripts/check-design-system.js") as {
  loadConfig: (configPath?: string) => DesignConfig;
  scanText: (input: { file: string; text: string; config: DesignConfig }) => Finding[];
  parseDiff: (diff: string) => Map<string, Set<number>>;
  isScannable: (file: string, config: DesignConfig) => boolean;
  filterByAddedLines: (findings: Finding[], added: Set<number> | null) => Finding[];
  toPosix: (p: string) => string;
  inRanges: (pos: number, ranges: number[][], sorted?: boolean) => boolean;
  truncateForDisplay: (
    findings: Finding[],
    perFileCap?: number
  ) => { shown: Finding[]; truncated: number };
  run: (argv: string[]) => number;
  RULES: Record<string, { id: string; severity: "error" | "warn"; name: string }>;
};

export const { loadConfig, scanText, parseDiff, isScannable, filterByAddedLines, toPosix, RULES } =
  designCheck;

/** Absolute path to the script under test, for the subprocess-mode suites. */
export const SCRIPT = path.resolve(__dirname, "../../../../scripts/check-design-system.js");
export const FIXTURES = path.resolve(__dirname, "../fixtures/design-check");

export const config = loadConfig();

export function fixture(name: string): string {
  return fs.readFileSync(path.join(FIXTURES, "src", name), "utf8");
}

export function diffFixture(name: string): string {
  return fs.readFileSync(path.join(FIXTURES, "diffs", name), "utf8");
}

/** Scan a fixture body as if it lived at `file` inside the repo. */
export function scanFixture(name: string, file: string): Finding[] {
  return scanText({ file, text: fixture(name), config });
}

export function scan(text: string, file = "components/Sample.tsx"): Finding[] {
  return scanText({ file, text, config });
}

export function rulesOf(findings: Finding[]): string[] {
  return findings.map((f) => f.rule);
}

export function countOf(findings: Finding[], rule: string): number {
  return findings.filter((f) => f.rule === rule).length;
}
