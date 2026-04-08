/**
 * Tests that Tremor chart components are dynamically imported (not statically imported)
 * across all files that use them. This prevents @tremor/react from being included in
 * the main bundle, improving initial page load performance.
 *
 * These tests read the source files and verify the import patterns.
 */
import * as fs from "node:fs";
import * as path from "node:path";

const COMPONENTS_DIR = path.resolve(__dirname, "../../components");

/**
 * Helper to read a component file and return its content.
 */
function readComponent(relativePath: string): string {
  const fullPath = path.join(COMPONENTS_DIR, relativePath);
  return fs.readFileSync(fullPath, "utf-8");
}

/**
 * Checks that a given component name is NOT in a static import from @tremor/react.
 * Static imports look like: import { Foo, Bar } from "@tremor/react";
 */
function hasStaticImport(source: string, componentName: string): boolean {
  // Match static named imports from @tremor/react
  const staticImportRegex = /import\s+\{([^}]+)\}\s+from\s+["']@tremor\/react["']/g;
  let match: RegExpExecArray | null = staticImportRegex.exec(source);
  while (match !== null) {
    const importedNames = match[1].split(",").map((s) => s.trim());
    if (importedNames.includes(componentName)) {
      return true;
    }
    // Handle aliased imports like "LineChart as TremorLineChart"
    if (
      importedNames.some(
        (name) => name.startsWith(`${componentName} as`) || name.startsWith(`${componentName}\n`)
      )
    ) {
      return true;
    }
    match = staticImportRegex.exec(source);
  }
  return false;
}

/**
 * Checks that a component is dynamically imported via next/dynamic.
 */
function hasDynamicImport(source: string, componentName: string): boolean {
  // Match: const ComponentName = dynamic(() => import("@tremor/react").then(...)
  const dynamicRegex = new RegExp(`const\\s+${componentName}\\s*=\\s*dynamic\\s*\\(`);
  return dynamicRegex.test(source);
}

/**
 * Checks that the file imports next/dynamic.
 */
function importsNextDynamic(source: string): boolean {
  return /import\s+dynamic\s+from\s+["']next\/dynamic["']/.test(source);
}

/**
 * Checks that the file imports ChartSkeleton.
 */
function importsChartSkeleton(source: string): boolean {
  return /import\s+\{[^}]*ChartSkeleton[^}]*\}\s+from\s+["']@\/components\/Utilities\/ChartSkeleton["']/.test(
    source
  );
}

/**
 * Checks that a dynamic import has ssr: false.
 */
function hasSsrFalse(source: string, componentName: string): boolean {
  // Find the dynamic import block for this component and check for ssr: false
  // Use [\s\S] to match across multiple lines including nested parens
  const regex = new RegExp(
    `const\\s+${componentName}\\s*=\\s*dynamic\\([\\s\\S]*?ssr:\\s*false[\\s\\S]*?\\}\\);`
  );
  return regex.test(source);
}

describe("Tremor chart components use dynamic imports", () => {
  describe("Pages/Stats/LineChart.tsx", () => {
    let source: string;

    beforeAll(() => {
      source = readComponent("Pages/Stats/LineChart.tsx");
    });

    it("should NOT have a static import of LineChart from @tremor/react", () => {
      // The component aliases it as TremorLineChart, so check for "LineChart"
      expect(hasStaticImport(source, "LineChart")).toBe(false);
      expect(hasStaticImport(source, "LineChart as TremorLineChart")).toBe(false);
    });

    it("should dynamically import TremorLineChart", () => {
      expect(hasDynamicImport(source, "TremorLineChart")).toBe(true);
    });

    it("should import next/dynamic", () => {
      expect(importsNextDynamic(source)).toBe(true);
    });

    it("should import ChartSkeleton", () => {
      expect(importsChartSkeleton(source)).toBe(true);
    });

    it("should have ssr: false on dynamic import", () => {
      expect(hasSsrFalse(source, "TremorLineChart")).toBe(true);
    });

    it("should still have static imports for Card and Title", () => {
      expect(hasStaticImport(source, "Card")).toBe(true);
      expect(hasStaticImport(source, "Title")).toBe(true);
    });

    it("should keep type imports as import type", () => {
      expect(source).toMatch(
        /import\s+type\s+\{[^}]*LineChartProps[^}]*\}\s+from\s+["']@tremor\/react["']/
      );
    });
  });

  describe("Pages/Stats/WeeklyActiveUsersChart.tsx", () => {
    let source: string;

    beforeAll(() => {
      source = readComponent("Pages/Stats/WeeklyActiveUsersChart.tsx");
    });

    it("should NOT have a static import of LineChart from @tremor/react", () => {
      expect(hasStaticImport(source, "LineChart")).toBe(false);
    });

    it("should dynamically import LineChart", () => {
      expect(hasDynamicImport(source, "LineChart")).toBe(true);
    });

    it("should import next/dynamic", () => {
      expect(importsNextDynamic(source)).toBe(true);
    });

    it("should import ChartSkeleton", () => {
      expect(importsChartSkeleton(source)).toBe(true);
    });

    it("should have ssr: false on dynamic import", () => {
      expect(hasSsrFalse(source, "LineChart")).toBe(true);
    });

    it("should still have static imports for Card and Title", () => {
      expect(hasStaticImport(source, "Card")).toBe(true);
      expect(hasStaticImport(source, "Title")).toBe(true);
    });
  });

  describe("Pages/Communities/Impact/CategoryRow.tsx", () => {
    let source: string;

    beforeAll(() => {
      source = readComponent("Pages/Communities/Impact/CategoryRow.tsx");
    });

    it("should NOT have a static import of AreaChart from @tremor/react", () => {
      expect(hasStaticImport(source, "AreaChart")).toBe(false);
    });

    it("should dynamically import AreaChart", () => {
      expect(hasDynamicImport(source, "AreaChart")).toBe(true);
    });

    it("should import next/dynamic", () => {
      expect(importsNextDynamic(source)).toBe(true);
    });

    it("should import ChartSkeleton", () => {
      expect(importsChartSkeleton(source)).toBe(true);
    });

    it("should have ssr: false on dynamic import", () => {
      expect(hasSsrFalse(source, "AreaChart")).toBe(true);
    });

    it("should still have a static import for Card", () => {
      expect(hasStaticImport(source, "Card")).toBe(true);
    });
  });

  describe("Pages/Communities/Impact/CommunityMetricsSection.tsx", () => {
    let source: string;

    beforeAll(() => {
      source = readComponent("Pages/Communities/Impact/CommunityMetricsSection.tsx");
    });

    it("should NOT have a static import of AreaChart from @tremor/react", () => {
      expect(hasStaticImport(source, "AreaChart")).toBe(false);
    });

    it("should dynamically import AreaChart", () => {
      expect(hasDynamicImport(source, "AreaChart")).toBe(true);
    });

    it("should import next/dynamic", () => {
      expect(importsNextDynamic(source)).toBe(true);
    });

    it("should import ChartSkeleton from Utilities (aliased to avoid conflict with local component)", () => {
      // This file has a local ChartSkeleton, so the import is aliased
      expect(source).toMatch(
        /import\s+\{[^}]*ChartSkeleton\s+as\s+ChartSkeletonLoading[^}]*\}\s+from\s+["']@\/components\/Utilities\/ChartSkeleton["']/
      );
    });

    it("should have ssr: false on dynamic import", () => {
      expect(hasSsrFalse(source, "AreaChart")).toBe(true);
    });

    it("should still have a static import for Card", () => {
      expect(hasStaticImport(source, "Card")).toBe(true);
    });
  });

  describe("Pages/Communities/Impact/AggregateCategoryRow.tsx", () => {
    let source: string;

    beforeAll(() => {
      source = readComponent("Pages/Communities/Impact/AggregateCategoryRow.tsx");
    });

    it("should NOT have a static import of AreaChart from @tremor/react", () => {
      expect(hasStaticImport(source, "AreaChart")).toBe(false);
    });

    it("should dynamically import AreaChart", () => {
      expect(hasDynamicImport(source, "AreaChart")).toBe(true);
    });

    it("should import next/dynamic", () => {
      expect(importsNextDynamic(source)).toBe(true);
    });

    it("should import ChartSkeleton", () => {
      expect(importsChartSkeleton(source)).toBe(true);
    });

    it("should have ssr: false on dynamic import", () => {
      expect(hasSsrFalse(source, "AreaChart")).toBe(true);
    });

    it("should still have a static import for Card", () => {
      expect(hasStaticImport(source, "Card")).toBe(true);
    });
  });

  describe("Pages/Admin/OutputMetrics.tsx", () => {
    let source: string;

    beforeAll(() => {
      source = readComponent("Pages/Admin/OutputMetrics.tsx");
    });

    it("should NOT have a static import of AreaChart from @tremor/react", () => {
      expect(hasStaticImport(source, "AreaChart")).toBe(false);
    });

    it("should NOT have a static import of Grid from @tremor/react", () => {
      expect(hasStaticImport(source, "Grid")).toBe(false);
    });

    it("should NOT have a static import of Metric from @tremor/react", () => {
      expect(hasStaticImport(source, "Metric")).toBe(false);
    });

    it("should dynamically import AreaChart", () => {
      expect(hasDynamicImport(source, "AreaChart")).toBe(true);
    });

    it("should dynamically import Grid", () => {
      expect(hasDynamicImport(source, "Grid")).toBe(true);
    });

    it("should dynamically import Metric", () => {
      expect(hasDynamicImport(source, "Metric")).toBe(true);
    });

    it("should import next/dynamic", () => {
      expect(importsNextDynamic(source)).toBe(true);
    });

    it("should import ChartSkeleton", () => {
      expect(importsChartSkeleton(source)).toBe(true);
    });

    it("should have ssr: false on AreaChart dynamic import", () => {
      expect(hasSsrFalse(source, "AreaChart")).toBe(true);
    });

    it("should still have static imports for Card, Text, Title", () => {
      expect(hasStaticImport(source, "Card")).toBe(true);
      expect(hasStaticImport(source, "Text")).toBe(true);
      expect(hasStaticImport(source, "Title")).toBe(true);
    });
  });

  describe("Pages/Admin/ProgramAnalytics.tsx", () => {
    let source: string;

    beforeAll(() => {
      source = readComponent("Pages/Admin/ProgramAnalytics.tsx");
    });

    it("should NOT have a static import of BarChart from @tremor/react", () => {
      expect(hasStaticImport(source, "BarChart")).toBe(false);
    });

    it("should NOT have a static import of Select from @tremor/react", () => {
      expect(hasStaticImport(source, "Select")).toBe(false);
    });

    it("should NOT have a static import of SelectItem from @tremor/react", () => {
      expect(hasStaticImport(source, "SelectItem")).toBe(false);
    });

    it("should dynamically import BarChart", () => {
      expect(hasDynamicImport(source, "BarChart")).toBe(true);
    });

    it("should dynamically import Select", () => {
      expect(hasDynamicImport(source, "Select")).toBe(true);
    });

    it("should dynamically import SelectItem", () => {
      expect(hasDynamicImport(source, "SelectItem")).toBe(true);
    });

    it("should import next/dynamic", () => {
      expect(importsNextDynamic(source)).toBe(true);
    });

    it("should import ChartSkeleton", () => {
      expect(importsChartSkeleton(source)).toBe(true);
    });

    it("should have ssr: false on BarChart dynamic import", () => {
      expect(hasSsrFalse(source, "BarChart")).toBe(true);
    });

    it("should still have static imports for Card and Title", () => {
      expect(hasStaticImport(source, "Card")).toBe(true);
      expect(hasStaticImport(source, "Title")).toBe(true);
    });
  });
});
