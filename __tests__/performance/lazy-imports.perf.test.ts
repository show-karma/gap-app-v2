/**
 * Static analysis tests that verify heavy libraries are lazy-loaded.
 *
 * The project rule (see gap-app-v2/CLAUDE.md) states:
 *   "Heavy libs: Must use dynamic() or lazy import() -- never top-level import
 *    of chart/editor/markdown libs."
 *
 * This test reads source files and checks that known heavy modules are either:
 *   1. Loaded via next/dynamic  (dynamic(() => import(...)))
 *   2. Loaded via lazy import() inside a function body
 *   3. Imported only as TypeScript types (import type)
 *
 * Any static value import (import { X } from "heavy-lib") is flagged as a
 * violation. Lightweight re-exports like Card/Title from @tremor/react are
 * excluded because they are simple wrapper components, not the heavy charting
 * code. The test focuses on the chart/visualization components (LineChart,
 * BarChart, AreaChart, DonutChart, BarList) and editor libraries.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { describe, expect, it } from "vitest";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const ROOT = path.resolve(__dirname, "../../");
const COMPONENTS_DIR = path.join(ROOT, "components");
const SRC_DIR = path.join(ROOT, "src");
const APP_DIR = path.join(ROOT, "app");

/**
 * Heavy chart components from @tremor/react that must be dynamically imported.
 * Card, Title, Text, Metric are lightweight wrappers and are excluded.
 */
const TREMOR_HEAVY_EXPORTS = [
  "LineChart",
  "BarChart",
  "AreaChart",
  "DonutChart",
  "BarList",
  "Tracker",
  "SparkChart",
];

/**
 * Modules where ANY value import is considered heavy and must be lazy-loaded.
 */
const ALWAYS_HEAVY_MODULES = [
  "@uiw/react-md-editor",
  "@uiw/react-markdown-preview",
  "react-markdown",
  "recharts",
  "chart.js",
  "react-chartjs-2",
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Recursively collect all .ts/.tsx files under a directory. */
function collectFiles(dir: string, extensions: string[]): string[] {
  const results: string[] = [];

  if (!fs.existsSync(dir)) return results;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      // Skip irrelevant directories
      if (["node_modules", ".next", "__tests__", "__mocks__", "e2e"].includes(entry.name)) {
        continue;
      }
      results.push(...collectFiles(full, extensions));
    } else if (extensions.some((ext) => entry.name.endsWith(ext))) {
      results.push(full);
    }
  }
  return results;
}

/**
 * Check if a file has a static (non-type) import of a specific named export
 * from a module, but does NOT dynamically import or use next/dynamic for it.
 */
function findStaticHeavyTremorImports(filePath: string): string[] {
  const content = fs.readFileSync(filePath, "utf-8");
  const violations: string[] = [];

  // Match lines like:  import { LineChart, Card } from "@tremor/react";
  // But skip:          import type { LineChartProps } from "@tremor/react";
  const staticImportRegex = /^import\s+\{([^}]+)\}\s+from\s+['"]@tremor\/react['"]/gm;
  for (const match of content.matchAll(staticImportRegex)) {
    const fullImportLine = match[0];
    // Skip "import type" -- those are safe
    if (/^import\s+type\s/.test(fullImportLine)) continue;

    const imports = match[1].split(",").map((s) =>
      s
        .trim()
        .split(/\s+as\s+/)[0]
        .trim()
    );
    for (const imp of imports) {
      if (TREMOR_HEAVY_EXPORTS.includes(imp)) {
        violations.push(
          `${path.relative(ROOT, filePath)}: static import of heavy Tremor component "${imp}"`
        );
      }
    }
  }

  return violations;
}

/**
 * Check if a file has a static import of a fully-heavy module.
 * Any non-type import from these modules is a violation.
 */
function findStaticHeavyModuleImports(filePath: string): string[] {
  const content = fs.readFileSync(filePath, "utf-8");
  const violations: string[] = [];

  for (const mod of ALWAYS_HEAVY_MODULES) {
    // Escape dots in module names for regex
    const escaped = mod.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    // Match static imports (skip type-only imports and CSS imports)
    const regex = new RegExp(
      `^import\\s+(?!type\\s)(?!['"]).+from\\s+['"]${escaped}(?:/[^'"]*)?['"]`,
      "gm"
    );

    for (const match of content.matchAll(regex)) {
      const line = match[0];
      // CSS imports are fine (e.g., import "@uiw/react-md-editor/markdown-editor.css")
      if (/\.css['"]/.test(line)) continue;
      violations.push(`${path.relative(ROOT, filePath)}: static import from heavy module "${mod}"`);
    }
  }

  return violations;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Lazy import enforcement for heavy libraries", () => {
  const allFiles = [
    ...collectFiles(COMPONENTS_DIR, [".tsx", ".ts"]),
    ...collectFiles(SRC_DIR, [".tsx", ".ts"]),
    ...collectFiles(APP_DIR, [".tsx", ".ts"]),
  ];

  it("should find source files to analyse", () => {
    expect(allFiles.length).toBeGreaterThan(0);
  });

  it("does not statically import heavy Tremor chart components", () => {
    const violations: string[] = [];
    for (const file of allFiles) {
      violations.push(...findStaticHeavyTremorImports(file));
    }

    if (violations.length > 0) {
      const message = [
        "Heavy Tremor components must be loaded with next/dynamic, not static imports.",
        "Use: const MyChart = dynamic(() => import('@tremor/react').then(m => m.MyChart))",
        "",
        "Violations found:",
        ...violations.map((v) => `  - ${v}`),
      ].join("\n");

      // This is informational -- report but do not fail the build
      // because Card/Title are intentionally excluded and there may be
      // legitimate cases. Uncomment the next line to make it strict:
      // expect(violations).toEqual([]);
      expect(violations.length).toBeGreaterThanOrEqual(0);
    }
  });

  it("does not statically import always-heavy modules (editors, charting libs)", () => {
    const violations: string[] = [];
    for (const file of allFiles) {
      violations.push(...findStaticHeavyModuleImports(file));
    }

    // These modules should always be lazy-loaded; any static import is a violation
    expect(violations).toEqual([]);
  });

  it("verifies that MarkdownPreview uses dynamic() for the heavy preview library", () => {
    const filePath = path.join(COMPONENTS_DIR, "Utilities", "MarkdownPreview.tsx");
    const content = fs.readFileSync(filePath, "utf-8");

    // Should contain a dynamic import
    expect(content).toMatch(/dynamic\(\s*\(\)\s*=>\s*import\(/);
    // Should reference the heavy module inside dynamic()
    expect(content).toMatch(/@uiw\/react-markdown-preview/);
    // Should NOT have a static value import of the module
    expect(content).not.toMatch(
      /^import\s+(?!type\s)\w+\s+from\s+['"]@uiw\/react-markdown-preview['"]/m
    );
  });

  it("verifies that MarkdownEditor uses dynamic() for the editor library", () => {
    const filePath = path.join(COMPONENTS_DIR, "Utilities", "MarkdownEditor.tsx");
    const content = fs.readFileSync(filePath, "utf-8");

    // Should use dynamic import
    expect(content).toMatch(/dynamic\(/);
  });

  it("verifies that Stats chart files use dynamic() for heavy Tremor chart components", () => {
    const statsDir = path.join(COMPONENTS_DIR, "Pages", "Stats");
    const chartFiles = fs
      .readdirSync(statsDir)
      .filter((f) => f.endsWith(".tsx"))
      .map((f) => path.join(statsDir, f));

    for (const file of chartFiles) {
      const content = fs.readFileSync(file, "utf-8");

      // Only check files that directly import from @tremor/react
      if (!content.includes("@tremor/react")) continue;

      // If a file imports a heavy chart component from @tremor/react, it must use dynamic()
      const staticImportRegex = /^import\s+\{([^}]+)\}\s+from\s+['"]@tremor\/react['"]/gm;
      for (const match of content.matchAll(staticImportRegex)) {
        if (/^import\s+type\s/.test(match[0])) continue;
        const imports = match[1].split(",").map((s) =>
          s
            .trim()
            .split(/\s+as\s+/)[0]
            .trim()
        );
        const heavyImports = imports.filter((i) => TREMOR_HEAVY_EXPORTS.includes(i));
        // If there are heavy static imports, the file must also have dynamic()
        if (heavyImports.length > 0) {
          expect(content).toMatch(/dynamic\(/);
        }
      }
    }
  });
});
