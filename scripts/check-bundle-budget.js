#!/usr/bin/env node

/**
 * Bundle Budget CI Gate
 *
 * Runs `pnpm build` and parses Next.js build output to check route sizes
 * against defined budgets. Exits with code 1 if any budget is exceeded
 * (unless --warn-only is passed).
 *
 * Usage:
 *   node scripts/check-bundle-budget.js
 *   node scripts/check-bundle-budget.js --warn-only
 *
 * Note: Uses execSync with a hardcoded command only (no user input).
 * This is a CI-only script and does not accept external arguments
 * beyond the --warn-only flag.
 */

const { execSync } = require("node:child_process");
const path = require("node:path");

const WARN_ONLY = process.argv.includes("--warn-only");

// Budget thresholds (in KB)
const BUDGETS = {
  sharedByAll: 600, // "First Load JS shared by all" <= 600 KB
  maxRouteSize: 1200, // No individual route > 1.2 MB (1200 KB)
};

/**
 * Parse a size string like "1.55 MB" or "992 kB" into kilobytes.
 */
function parseSizeToKB(sizeStr) {
  const match = sizeStr.trim().match(/([\d.]+)\s*(kB|MB|B)/i);
  if (!match) return null;

  const value = parseFloat(match[1]);
  const unit = match[2].toLowerCase();

  if (unit === "mb") return value * 1024;
  if (unit === "kb") return value;
  if (unit === "b") return value / 1024;
  return null;
}

/**
 * Run the build and capture stdout.
 */
function runBuild() {
  const projectRoot = path.resolve(__dirname, "..");
  try {
    // Hardcoded command - no user input interpolation
    const output = execSync("pnpm build", {
      cwd: projectRoot,
      encoding: "utf-8",
      stdio: ["inherit", "pipe", "pipe"],
      maxBuffer: 50 * 1024 * 1024, // 50 MB buffer for large build output
    });
    return output;
  } catch (error) {
    // Next.js build can exit with non-zero on warnings; still capture stdout
    if (error.stdout) {
      return error.stdout;
    }
    console.error("Build failed with no output captured.");
    process.exit(1);
  }
}

/**
 * Parse the Next.js build output to extract route sizes.
 *
 * Expected format:
 *   Route (app)                              Size     First Load JS
 *   ┌ ○ /                                    5.23 kB        245 kB
 *   ├ ƒ /project/[projectId]                 125 kB        1.55 MB
 *   ...
 *   + First Load JS shared by all             992 kB
 *     ├ chunks/framework-xxx.js               45 kB
 *     ...
 */
function parseRoutes(buildOutput) {
  const lines = buildOutput.split("\n");
  const routes = [];
  let sharedSize = null;

  for (const line of lines) {
    // Match "First Load JS shared by all" line
    const sharedMatch = line.match(/\+\s*First Load JS shared by all\s+([\d.]+\s*(?:kB|MB|B))/i);
    if (sharedMatch) {
      sharedSize = parseSizeToKB(sharedMatch[1]);
      continue;
    }

    // Match route lines: ├ ƒ /path    size    first-load-size
    // or: ┌ ○ /path    size    first-load-size
    // The route line has the format: tree-char status /path  size  first-load-size
    const routeMatch = line.match(
      /[├┌└│]\s*[○ƒλ◐]\s+(\/\S*)\s+[\d.]+\s*(?:kB|MB|B)\s+([\d.]+\s*(?:kB|MB|B))/i
    );
    if (routeMatch) {
      const routePath = routeMatch[1];
      const firstLoadSize = parseSizeToKB(routeMatch[2]);
      if (firstLoadSize !== null) {
        routes.push({ path: routePath, sizeKB: firstLoadSize });
      }
    }
  }

  return { routes, sharedSizeKB: sharedSize };
}

/**
 * Check budgets and print results.
 */
function checkBudgets(routes, sharedSizeKB) {
  const results = [];
  let hasFailure = false;

  // Check shared bundle
  if (sharedSizeKB !== null) {
    const pass = sharedSizeKB <= BUDGETS.sharedByAll;
    if (!pass) hasFailure = true;
    results.push({
      route: "First Load JS shared by all",
      sizeKB: sharedSizeKB,
      budgetKB: BUDGETS.sharedByAll,
      pass,
    });
  } else {
    console.warn("Warning: Could not parse 'First Load JS shared by all' from build output.");
  }

  // Check individual routes
  for (const route of routes) {
    const pass = route.sizeKB <= BUDGETS.maxRouteSize;
    if (!pass) hasFailure = true;
    results.push({
      route: route.path,
      sizeKB: route.sizeKB,
      budgetKB: BUDGETS.maxRouteSize,
      pass,
    });
  }

  return { results, hasFailure };
}

/**
 * Print a summary table.
 */
function printSummary(results, hasFailure) {
  console.log("\n====================================");
  console.log("  Bundle Budget Check Results");
  console.log("====================================\n");

  // Table header
  const routeCol = 50;
  const sizeCol = 12;
  const budgetCol = 12;
  const statusCol = 8;

  const header =
    "Route".padEnd(routeCol) +
    "Size".padStart(sizeCol) +
    "Budget".padStart(budgetCol) +
    "Status".padStart(statusCol);
  console.log(header);
  console.log("-".repeat(routeCol + sizeCol + budgetCol + statusCol));

  for (const r of results) {
    const sizeStr = formatSize(r.sizeKB);
    const budgetStr = formatSize(r.budgetKB);
    const status = r.pass ? "PASS" : "FAIL";
    const routeName =
      r.route.length > routeCol - 2 ? r.route.substring(0, routeCol - 5) + "..." : r.route;

    console.log(
      routeName.padEnd(routeCol) +
        sizeStr.padStart(sizeCol) +
        budgetStr.padStart(budgetCol) +
        status.padStart(statusCol)
    );
  }

  console.log("-".repeat(routeCol + sizeCol + budgetCol + statusCol));

  if (hasFailure) {
    if (WARN_ONLY) {
      console.log(
        "\nWARNING: Some routes exceed their bundle budget (--warn-only mode, not failing).\n"
      );
    } else {
      console.log("\nFAILED: Some routes exceed their bundle budget.\n");
    }
  } else {
    console.log("\nAll routes within budget.\n");
  }
}

/**
 * Format KB size to human-readable string.
 */
function formatSize(kb) {
  if (kb >= 1024) {
    return `${(kb / 1024).toFixed(2)} MB`;
  }
  return `${kb.toFixed(0)} kB`;
}

// Main
function main() {
  console.log("Running Next.js build to check bundle budgets...\n");

  const buildOutput = runBuild();
  const { routes, sharedSizeKB } = parseRoutes(buildOutput);

  if (routes.length === 0 && sharedSizeKB === null) {
    console.error("Error: Could not parse any route sizes from the build output.");
    console.error("This may indicate the build output format has changed.");
    process.exit(1);
  }

  const { results, hasFailure } = checkBudgets(routes, sharedSizeKB);
  printSummary(results, hasFailure);

  if (hasFailure && !WARN_ONLY) {
    process.exit(1);
  }
}

main();
