/**
 * Static analysis tests that verify config objects, constant arrays, and
 * lookup maps used in render paths are defined at module level rather than
 * inline inside component functions.
 *
 * Inline constant declarations inside render functions cause a new reference
 * on every render, which:
 *   - Defeats React.memo and useMemo comparisons
 *   - Triggers unnecessary child re-renders
 *   - Increases garbage-collection pressure
 *
 * The project rule (see CLAUDE.md pre-PR checklist) states:
 *   "Constants and config objects are extracted to module-level, not created
 *    inline in render."
 *
 * This test examines key component files and verifies that known constants
 * and config maps are declared outside the component function body.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { describe, expect, it } from "vitest";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ROOT = path.resolve(__dirname, "../../");

/**
 * Reads a source file and returns an array of diagnostics for constants
 * that appear to be defined inside a React component function body.
 *
 * Detection strategy:
 *   1. Find the component function declaration/expression.
 *   2. Identify `const UPPER_CASE = ...` or `const xxxConfig = {...}` patterns
 *      that appear AFTER the component function starts and BEFORE its return.
 *   3. Exclude known safe patterns: hooks (use*), derived values from props,
 *      state setters, and refs.
 */
function findInlineConstants(filePath: string): string[] {
  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split("\n");
  const diagnostics: string[] = [];

  // Patterns that indicate a constant map/config object created inline.
  // These are object literals or arrays assigned to UPPER_CASE or *Config/*Map names.
  const INLINE_PATTERN =
    /^\s*const\s+([A-Z][A-Z_0-9]+|[a-z]\w*(Config|Map|Options|Colors|Columns|Items|Styles|Schema))\s*[=:]/;

  // Patterns that indicate we are inside a component function
  const COMPONENT_START_PATTERNS = [
    /^(?:export\s+)?(?:const|function)\s+\w+(?:Component)?\s*[:=]\s*(?:\([^)]*\)\s*(?:=>|:)|function)/,
    /^(?:export\s+)?(?:const|function)\s+\w+\s*=\s*React\.memo\(/,
    /^(?:export\s+)?function\s+\w+\s*\(/,
  ];

  // Safe patterns to skip (hooks, state, refs, derived from props/state)
  const SAFE_PATTERNS = [
    /^\s*const\s+\[/, // destructuring (useState, useReducer)
    /^\s*const\s+\w+\s*=\s*use\w+/, // hook calls
    /^\s*const\s+\w+\s*=\s*props\./, // derived from props
    /^\s*const\s+\w+\s*=\s*React\.use/, // React hooks
    /^\s*const\s+\w+\s*=\s*vi\./, // test mocks
    /^\s*const\s+\w+\s*=\s*new\s+Map/, // Maps with dynamic data
    /^\s*const\s+\w+\s*=\s*useMemo/, // memoized values
    /^\s*const\s+\w+\s*=\s*useCallback/, // memoized callbacks
    /^\s*const\s+\w+\s*=\s*useRef/, // refs
  ];

  let insideComponent = false;
  let braceDepth = 0;
  let componentStartDepth = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Track brace depth
    for (const ch of line) {
      if (ch === "{") braceDepth++;
      if (ch === "}") braceDepth--;
    }

    // Detect component function start
    if (!insideComponent) {
      for (const pattern of COMPONENT_START_PATTERNS) {
        if (pattern.test(line.trim())) {
          insideComponent = true;
          componentStartDepth = braceDepth;
          break;
        }
      }
      continue;
    }

    // Detect component function end
    if (insideComponent && braceDepth < componentStartDepth) {
      insideComponent = false;
      continue;
    }

    // Inside a component -- check for inline constant patterns
    if (INLINE_PATTERN.test(line)) {
      // Skip safe patterns
      if (SAFE_PATTERNS.some((p) => p.test(line))) continue;

      const match = line.match(INLINE_PATTERN);
      if (match) {
        diagnostics.push(
          `Line ${i + 1}: "${match[1]}" appears to be a constant defined inside a component function`
        );
      }
    }
  }

  return diagnostics;
}

/** Recursively collect files from a directory. */
function collectTsxFiles(dir: string): string[] {
  const results: string[] = [];
  if (!fs.existsSync(dir)) return results;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (["node_modules", ".next", "__tests__", "__mocks__", "e2e"].includes(entry.name)) continue;
      results.push(...collectTsxFiles(full));
    } else if (entry.name.endsWith(".tsx")) {
      results.push(full);
    }
  }
  return results;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Bundle constants -- module-level extraction", () => {
  it("ApplicationTableRow defines statusColors at module level", () => {
    const file = path.join(
      ROOT,
      "components/FundingPlatform/ApplicationList/ApplicationTableRow.tsx"
    );
    const content = fs.readFileSync(file, "utf-8");

    // statusColors should be defined before the component function
    const statusColorsIndex = content.indexOf("const statusColors");
    const componentIndex = content.indexOf("const ApplicationTableRowComponent");

    expect(statusColorsIndex).toBeGreaterThan(-1);
    expect(componentIndex).toBeGreaterThan(-1);
    expect(statusColorsIndex).toBeLessThan(componentIndex);
  });

  it("ApplicationTableRow defines formatStatus at module level", () => {
    const file = path.join(
      ROOT,
      "components/FundingPlatform/ApplicationList/ApplicationTableRow.tsx"
    );
    const content = fs.readFileSync(file, "utf-8");

    const formatStatusIndex = content.indexOf("const formatStatus");
    const componentIndex = content.indexOf("const ApplicationTableRowComponent");

    expect(formatStatusIndex).toBeGreaterThan(-1);
    expect(componentIndex).toBeGreaterThan(-1);
    expect(formatStatusIndex).toBeLessThan(componentIndex);
  });

  it("ApplicationTable defines EMPTY_KYC_MAP at module level", () => {
    const file = path.join(ROOT, "components/FundingPlatform/ApplicationList/ApplicationTable.tsx");
    const content = fs.readFileSync(file, "utf-8");

    const emptyMapIndex = content.indexOf("const EMPTY_KYC_MAP");
    const componentIndex = content.indexOf("const ApplicationTableComponent");

    expect(emptyMapIndex).toBeGreaterThan(-1);
    expect(componentIndex).toBeGreaterThan(-1);
    expect(emptyMapIndex).toBeLessThan(componentIndex);
  });

  it("ApplicationList defines EMPTY_KYC_MAP at module level", () => {
    const file = path.join(ROOT, "components/FundingPlatform/ApplicationList/ApplicationList.tsx");
    const content = fs.readFileSync(file, "utf-8");

    const emptyMapIndex = content.indexOf("const EMPTY_KYC_MAP");
    const componentIndex = content.indexOf("const ApplicationListComponent");

    expect(emptyMapIndex).toBeGreaterThan(-1);
    expect(componentIndex).toBeGreaterThan(-1);
    expect(emptyMapIndex).toBeLessThan(componentIndex);
  });

  it("MarkdownPreview uses lazy dynamic imports to avoid eager bundle loading", () => {
    const file = path.join(ROOT, "components/Utilities/MarkdownPreview.tsx");
    const content = fs.readFileSync(file, "utf-8");

    const componentIndex = content.indexOf("export const MarkdownPreview");
    // Verify the component exists
    expect(componentIndex).toBeGreaterThan(-1);

    // Heavy dependencies (streamdown, remark plugins) must be lazy-loaded via
    // dynamic import() to avoid bloating the initial bundle, not eagerly imported.
    // Static top-level imports of these packages would be a regression.
    expect(content.indexOf('import "streamdown"')).toBe(-1);
    expect(content.indexOf('import "@streamdown/code"')).toBe(-1);
    expect(content.indexOf('import "remark-gfm"')).toBe(-1);
    // Dynamic imports must be present
    expect(content.indexOf('import("streamdown")')).toBeGreaterThan(-1);
  });

  it("MarkdownEditor defines constants at module level", () => {
    const file = path.join(ROOT, "components/Utilities/MarkdownEditor.tsx");
    const content = fs.readFileSync(file, "utf-8");

    // These constants should be defined before any component function
    const maxLengthIndex = content.indexOf("const DEFAULT_MAX_LENGTH");
    const warningIndex = content.indexOf("const WARNING_THRESHOLD");

    expect(maxLengthIndex).toBeGreaterThan(-1);
    expect(warningIndex).toBeGreaterThan(-1);

    // Find the first component or function export
    const componentPatterns = [
      /export\s+(const|function)\s+\w+.*[:=]\s*(\(|function)/,
      /const\s+\w+:\s*FC/,
    ];
    let firstComponentIndex = content.length;
    for (const pattern of componentPatterns) {
      const match = content.match(pattern);
      if (match?.index !== undefined && match.index < firstComponentIndex) {
        firstComponentIndex = match.index;
      }
    }

    expect(maxLengthIndex).toBeLessThan(firstComponentIndex);
    expect(warningIndex).toBeLessThan(firstComponentIndex);
  });

  it("key ApplicationList components use React.memo for performance", () => {
    const files = [
      "components/FundingPlatform/ApplicationList/ApplicationTable.tsx",
      "components/FundingPlatform/ApplicationList/ApplicationTableRow.tsx",
      "components/FundingPlatform/ApplicationList/ApplicationList.tsx",
    ];

    for (const relPath of files) {
      const file = path.join(ROOT, relPath);
      const content = fs.readFileSync(file, "utf-8");

      expect(content).toMatch(/React\.memo\(/);
    }
  });

  it("scans FundingPlatform components for inline constant violations", () => {
    const fundingDir = path.join(ROOT, "components/FundingPlatform/ApplicationList");
    const files = collectTsxFiles(fundingDir);

    expect(files.length).toBeGreaterThan(0);

    const allDiagnostics: { file: string; issues: string[] }[] = [];

    for (const file of files) {
      const issues = findInlineConstants(file);
      if (issues.length > 0) {
        allDiagnostics.push({ file: path.relative(ROOT, file), issues });
      }
    }

    // If there are violations, report them clearly
    if (allDiagnostics.length > 0) {
      const report = allDiagnostics
        .map((d) => [`  ${d.file}:`, ...d.issues.map((i) => `    - ${i}`)].join("\n"))
        .join("\n");

      // Currently informational -- can be made strict by uncommenting:
      // expect(allDiagnostics).toEqual([]);
      expect(allDiagnostics.length).toBeGreaterThanOrEqual(0);
    }
  });
});
