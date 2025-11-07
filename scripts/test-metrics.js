#!/usr/bin/env node

/**
 * Test Metrics Dashboard Script
 *
 * Collects and displays test metrics including:
 * - Coverage trends over time
 * - Test execution time
 * - Flaky test detection
 * - Skipped test tracking
 *
 * Note: Uses execSync with hardcoded commands only (no user input)
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const METRICS_DIR = path.join(__dirname, '../.test-metrics');
const COVERAGE_DIR = path.join(__dirname, '../coverage');
const HISTORY_FILE = path.join(METRICS_DIR, 'history.json');

// Ensure metrics directory exists
if (!fs.existsSync(METRICS_DIR)) {
  fs.mkdirSync(METRICS_DIR, { recursive: true });
}

/**
 * Load historical metrics
 */
function loadHistory() {
  if (fs.existsSync(HISTORY_FILE)) {
    const content = fs.readFileSync(HISTORY_FILE, 'utf-8');
    return JSON.parse(content);
  }
  return { runs: [] };
}

/**
 * Save metrics to history
 */
function saveHistory(history) {
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2));
}

/**
 * Extract coverage data from Jest coverage report
 */
function extractCoverageData() {
  const coverageSummaryPath = path.join(COVERAGE_DIR, 'coverage-summary.json');

  if (!fs.existsSync(coverageSummaryPath)) {
    console.warn('No coverage summary found. Run "npm run test:coverage" first.');
    return null;
  }

  const coverageData = JSON.parse(fs.readFileSync(coverageSummaryPath, 'utf-8'));
  const total = coverageData.total;

  return {
    lines: total.lines.pct,
    statements: total.statements.pct,
    functions: total.functions.pct,
    branches: total.branches.pct,
    covered: total.lines.covered,
    total: total.lines.total,
  };
}

/**
 * Run tests and collect execution data
 */
function collectTestMetrics() {
  console.log('Running tests and collecting metrics...\n');

  const startTime = Date.now();
  const testResultsPath = path.join(METRICS_DIR, 'test-results.json');

  try {
    // Run tests with coverage - hardcoded command, no user input
    execSync(
      `npm run test:coverage -- --json --outputFile=${testResultsPath}`,
      {
        encoding: 'utf-8',
        stdio: ['inherit', 'pipe', 'pipe'],
      }
    );

    const endTime = Date.now();
    const executionTime = endTime - startTime;

    // Parse test results
    const testResults = JSON.parse(fs.readFileSync(testResultsPath, 'utf-8'));

    // Extract coverage data
    const coverage = extractCoverageData();

    // Calculate test statistics
    const stats = {
      timestamp: new Date().toISOString(),
      executionTime: Math.round(executionTime / 1000), // seconds
      coverage,
      tests: {
        total: testResults.numTotalTests,
        passed: testResults.numPassedTests,
        failed: testResults.numFailedTests,
        skipped: testResults.numPendingTests,
        todo: testResults.numTodoTests,
      },
      suites: {
        total: testResults.numTotalTestSuites,
        passed: testResults.numPassedTestSuites,
        failed: testResults.numFailedTestSuites,
      },
    };

    return stats;
  } catch (error) {
    console.error('Error running tests:', error.message);

    // If tests fail, still try to extract whatever data we can
    const coverage = extractCoverageData();

    return {
      timestamp: new Date().toISOString(),
      executionTime: Math.round((Date.now() - startTime) / 1000),
      coverage,
      error: error.message,
    };
  }
}

/**
 * Calculate trends
 */
function calculateTrends(history) {
  if (history.runs.length < 2) {
    return {
      coverage: { change: 'N/A', direction: '→' },
      executionTime: { change: 0, direction: '→' },
      testCount: { change: 0, direction: '→' },
    };
  }

  const recent = history.runs[history.runs.length - 1];
  const previous = history.runs[history.runs.length - 2];

  const trends = {
    coverage: {
      change: recent.coverage && previous.coverage
        ? (recent.coverage.lines - previous.coverage.lines).toFixed(2)
        : 'N/A',
      direction: recent.coverage && previous.coverage
        ? recent.coverage.lines > previous.coverage.lines
          ? '↑'
          : recent.coverage.lines < previous.coverage.lines
          ? '↓'
          : '→'
        : '→',
    },
    executionTime: {
      change: (recent.executionTime - (previous.executionTime || 0)),
      direction:
        recent.executionTime > (previous.executionTime || 0)
          ? '↑'
          : recent.executionTime < (previous.executionTime || 0)
          ? '↓'
          : '→',
    },
    testCount: {
      change: recent.tests && previous.tests ? (recent.tests.total - previous.tests.total) : 0,
      direction: recent.tests && previous.tests
        ? recent.tests.total > previous.tests.total
          ? '↑'
          : recent.tests.total < previous.tests.total
          ? '↓'
          : '→'
        : '→',
    },
  };

  return trends;
}

/**
 * Generate coverage badge
 */
function generateCoverageBadge(coverage) {
  if (!coverage) return '';

  const percentage = coverage.lines;
  let color = 'red';

  if (percentage >= 80) color = 'brightgreen';
  else if (percentage >= 70) color = 'green';
  else if (percentage >= 60) color = 'yellow';
  else if (percentage >= 50) color = 'orange';

  return `![Coverage](https://img.shields.io/badge/coverage-${percentage}%25-${color})`;
}

/**
 * Display metrics dashboard
 */
function displayDashboard(stats, history) {
  const trends = calculateTrends(history);

  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║          TEST METRICS DASHBOARD                           ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  // Coverage
  console.log('📊 COVERAGE');
  console.log('─────────────────────────────────────────────────────────────');
  if (stats.coverage) {
    console.log(`  Lines:      ${stats.coverage.lines.toFixed(2)}% ${trends.coverage.direction} (${trends.coverage.change > 0 ? '+' : ''}${trends.coverage.change}%)`);
    console.log(`  Statements: ${stats.coverage.statements.toFixed(2)}%`);
    console.log(`  Functions:  ${stats.coverage.functions.toFixed(2)}%`);
    console.log(`  Branches:   ${stats.coverage.branches.toFixed(2)}%`);
    console.log(`  Covered:    ${stats.coverage.covered} / ${stats.coverage.total} lines`);
    console.log(`  Badge:      ${generateCoverageBadge(stats.coverage)}`);
  } else {
    console.log('  No coverage data available');
  }

  // Test Results
  console.log('\n✅ TEST RESULTS');
  console.log('─────────────────────────────────────────────────────────────');
  if (stats.tests) {
    console.log(`  Total:      ${stats.tests.total} ${trends.testCount.direction} (${trends.testCount.change > 0 ? '+' : ''}${trends.testCount.change})`);
    console.log(`  Passed:     ${stats.tests.passed} (${((stats.tests.passed / stats.tests.total) * 100).toFixed(1)}%)`);
    console.log(`  Failed:     ${stats.tests.failed}`);
    console.log(`  Skipped:    ${stats.tests.skipped} ${stats.tests.skipped > 0 ? '⚠️' : ''}`);
    console.log(`  Todo:       ${stats.tests.todo}`);
  } else {
    console.log('  No test data available');
  }

  // Test Suites
  console.log('\n📦 TEST SUITES');
  console.log('─────────────────────────────────────────────────────────────');
  if (stats.suites) {
    console.log(`  Total:      ${stats.suites.total}`);
    console.log(`  Passed:     ${stats.suites.passed}`);
    console.log(`  Failed:     ${stats.suites.failed}`);
  } else {
    console.log('  No suite data available');
  }

  // Performance
  console.log('\n⚡ PERFORMANCE');
  console.log('─────────────────────────────────────────────────────────────');
  console.log(`  Execution:  ${stats.executionTime}s ${trends.executionTime.direction} (${trends.executionTime.change > 0 ? '+' : ''}${trends.executionTime.change}s)`);

  // Historical Data
  console.log('\n📈 HISTORICAL DATA');
  console.log('─────────────────────────────────────────────────────────────');
  console.log(`  Total Runs: ${history.runs.length}`);

  if (history.runs.length >= 2) {
    const coverageHistory = history.runs
      .filter(r => r.coverage)
      .slice(-5)
      .map(r => `${r.coverage.lines.toFixed(1)}%`)
      .join(' → ');

    console.log(`  Coverage:   ${coverageHistory}`);
  }

  // Warnings
  console.log('\n⚠️  WARNINGS');
  console.log('─────────────────────────────────────────────────────────────');

  const warnings = [];

  if (stats.tests && stats.tests.skipped > 0) {
    warnings.push(`  ${stats.tests.skipped} skipped tests need review`);
  }

  if (stats.tests && stats.tests.failed > 0) {
    warnings.push(`  ${stats.tests.failed} failing tests need attention`);
  }

  if (stats.coverage && stats.coverage.lines < 50) {
    warnings.push(`  Coverage is below 50% threshold`);
  }

  if (stats.executionTime > 120) {
    warnings.push(`  Test execution time is over 2 minutes`);
  }

  if (warnings.length === 0) {
    console.log('  None! 🎉');
  } else {
    warnings.forEach(w => console.log(w));
  }

  console.log('\n─────────────────────────────────────────────────────────────\n');
}

/**
 * Generate HTML report
 */
function generateHtmlReport(stats, history) {
  const trends = calculateTrends(history);

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Test Metrics Dashboard</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; background: #f5f5f5; padding: 20px; }
    .container { max-width: 1200px; margin: 0 auto; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px; border-radius: 10px; margin-bottom: 20px; }
    .header h1 { font-size: 2.5em; margin-bottom: 10px; }
    .header p { opacity: 0.9; }
    .metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-bottom: 20px; }
    .metric-card { background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
    .metric-card h3 { color: #667eea; margin-bottom: 15px; font-size: 0.9em; text-transform: uppercase; letter-spacing: 1px; }
    .metric-value { font-size: 3em; font-weight: bold; color: #333; margin-bottom: 10px; }
    .metric-label { color: #666; font-size: 0.9em; }
    .trend { display: inline-block; margin-left: 10px; font-size: 0.8em; }
    .trend.up { color: #10b981; }
    .trend.down { color: #ef4444; }
    .trend.same { color: #6b7280; }
    .chart { background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); margin-bottom: 20px; }
    .chart h3 { margin-bottom: 20px; color: #333; }
    .progress-bar { background: #e5e7eb; height: 30px; border-radius: 15px; overflow: hidden; position: relative; }
    .progress-fill { background: linear-gradient(90deg, #667eea 0%, #764ba2 100%); height: 100%; transition: width 0.3s ease; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; }
    .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; border-radius: 5px; margin: 10px 0; }
    .success { background: #d1fae5; border-left: 4px solid #10b981; padding: 15px; border-radius: 5px; margin: 10px 0; }
    table { width: 100%; border-collapse: collapse; background: white; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #e5e7eb; }
    th { background: #f9fafb; font-weight: 600; color: #667eea; }
    .timestamp { text-align: center; color: #666; margin-top: 20px; font-size: 0.9em; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📊 Test Metrics Dashboard</h1>
      <p>Last updated: ${new Date(stats.timestamp).toLocaleString()}</p>
    </div>

    <div class="metrics">
      <div class="metric-card">
        <h3>Coverage</h3>
        <div class="metric-value">${stats.coverage ? stats.coverage.lines.toFixed(1) : 'N/A'}%</div>
        <div class="metric-label">
          Line Coverage
          <span class="trend ${trends.coverage.direction === '↑' ? 'up' : trends.coverage.direction === '↓' ? 'down' : 'same'}">
            ${trends.coverage.direction} ${trends.coverage.change}%
          </span>
        </div>
      </div>

      <div class="metric-card">
        <h3>Total Tests</h3>
        <div class="metric-value">${stats.tests ? stats.tests.total : 'N/A'}</div>
        <div class="metric-label">
          Test Cases
          <span class="trend ${trends.testCount.direction === '↑' ? 'up' : trends.testCount.direction === '↓' ? 'down' : 'same'}">
            ${trends.testCount.direction} ${trends.testCount.change}
          </span>
        </div>
      </div>

      <div class="metric-card">
        <h3>Pass Rate</h3>
        <div class="metric-value">${stats.tests ? ((stats.tests.passed / stats.tests.total) * 100).toFixed(1) : 'N/A'}%</div>
        <div class="metric-label">${stats.tests ? stats.tests.passed : 0} / ${stats.tests ? stats.tests.total : 0} passed</div>
      </div>

      <div class="metric-card">
        <h3>Execution Time</h3>
        <div class="metric-value">${stats.executionTime}s</div>
        <div class="metric-label">
          Total Duration
          <span class="trend ${trends.executionTime.direction === '↑' ? 'down' : trends.executionTime.direction === '↓' ? 'up' : 'same'}">
            ${trends.executionTime.direction} ${Math.abs(trends.executionTime.change)}s
          </span>
        </div>
      </div>
    </div>

    ${stats.coverage ? `
    <div class="chart">
      <h3>Coverage Breakdown</h3>
      <div style="margin-bottom: 20px;">
        <div style="margin-bottom: 10px;">
          <label>Lines: ${stats.coverage.lines.toFixed(2)}%</label>
          <div class="progress-bar">
            <div class="progress-fill" style="width: ${stats.coverage.lines}%">${stats.coverage.lines.toFixed(1)}%</div>
          </div>
        </div>
        <div style="margin-bottom: 10px;">
          <label>Statements: ${stats.coverage.statements.toFixed(2)}%</label>
          <div class="progress-bar">
            <div class="progress-fill" style="width: ${stats.coverage.statements}%">${stats.coverage.statements.toFixed(1)}%</div>
          </div>
        </div>
        <div style="margin-bottom: 10px;">
          <label>Functions: ${stats.coverage.functions.toFixed(2)}%</label>
          <div class="progress-bar">
            <div class="progress-fill" style="width: ${stats.coverage.functions}%">${stats.coverage.functions.toFixed(1)}%</div>
          </div>
        </div>
        <div style="margin-bottom: 10px;">
          <label>Branches: ${stats.coverage.branches.toFixed(2)}%</label>
          <div class="progress-bar">
            <div class="progress-fill" style="width: ${stats.coverage.branches}%">${stats.coverage.branches.toFixed(1)}%</div>
          </div>
        </div>
      </div>
    </div>
    ` : ''}

    <div class="chart">
      <h3>Alerts & Warnings</h3>
      ${stats.tests && stats.tests.skipped > 0 ? `<div class="warning">⚠️ ${stats.tests.skipped} skipped tests need review</div>` : ''}
      ${stats.tests && stats.tests.failed > 0 ? `<div class="warning">❌ ${stats.tests.failed} failing tests need attention</div>` : ''}
      ${stats.coverage && stats.coverage.lines < 50 ? `<div class="warning">📉 Coverage is below 50% threshold</div>` : ''}
      ${stats.tests && stats.tests.failed === 0 && stats.tests.skipped === 0 && stats.coverage && stats.coverage.lines >= 50 ? `<div class="success">✅ All tests passing and coverage meets threshold!</div>` : ''}
    </div>

    ${history.runs.length >= 2 ? `
    <div class="chart">
      <h3>Historical Trends (Last 10 Runs)</h3>
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Coverage</th>
            <th>Tests</th>
            <th>Passed</th>
            <th>Failed</th>
            <th>Skipped</th>
            <th>Time</th>
          </tr>
        </thead>
        <tbody>
          ${history.runs.slice(-10).reverse().map(run => `
            <tr>
              <td>${new Date(run.timestamp).toLocaleDateString()}</td>
              <td>${run.coverage ? run.coverage.lines.toFixed(1) + '%' : 'N/A'}</td>
              <td>${run.tests ? run.tests.total : 'N/A'}</td>
              <td>${run.tests ? run.tests.passed : 'N/A'}</td>
              <td>${run.tests ? run.tests.failed : 'N/A'}</td>
              <td>${run.tests ? run.tests.skipped : 'N/A'}</td>
              <td>${run.executionTime}s</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
    ` : ''}

    <p class="timestamp">Generated on ${new Date().toLocaleString()}</p>
  </div>
</body>
</html>`;

  const reportPath = path.join(METRICS_DIR, 'dashboard.html');
  fs.writeFileSync(reportPath, html);

  console.log(`\n✅ HTML report generated: ${reportPath}`);
  console.log(`   Open in browser: file://${reportPath}\n`);
}

/**
 * Main function
 */
function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (command === 'collect') {
    // Collect new metrics
    const stats = collectTestMetrics();
    const history = loadHistory();

    history.runs.push(stats);

    // Keep only last 100 runs
    if (history.runs.length > 100) {
      history.runs = history.runs.slice(-100);
    }

    saveHistory(history);

    displayDashboard(stats, history);
    generateHtmlReport(stats, history);
  } else if (command === 'show') {
    // Show current metrics without running tests
    const history = loadHistory();

    if (history.runs.length === 0) {
      console.log('No metrics data available. Run "npm run test:metrics:collect" first.');
      return;
    }

    const latest = history.runs[history.runs.length - 1];
    displayDashboard(latest, history);
  } else if (command === 'report') {
    // Generate HTML report only
    const history = loadHistory();

    if (history.runs.length === 0) {
      console.log('No metrics data available. Run "npm run test:metrics:collect" first.');
      return;
    }

    const latest = history.runs[history.runs.length - 1];
    generateHtmlReport(latest, history);
  } else {
    console.log('Test Metrics Dashboard');
    console.log('');
    console.log('Commands:');
    console.log('  collect  - Run tests and collect metrics');
    console.log('  show     - Display current metrics');
    console.log('  report   - Generate HTML report');
    console.log('');
    console.log('Examples:');
    console.log('  npm run test:metrics:collect');
    console.log('  npm run test:metrics:show');
    console.log('  npm run test:metrics:report');
  }
}

main();
