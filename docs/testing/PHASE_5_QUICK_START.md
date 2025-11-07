# Phase 5: Continuous Improvement - Quick Start Guide

This is a condensed guide to get started with Phase 5 tools and workflows immediately.

## For Developers

### TDD Workflow (Test-Driven Development)

**Goal:** Write tests before writing code

**Steps:**
1. Write a failing test (RED)
2. Write minimal code to pass (GREEN)
3. Refactor and improve (REFACTOR)
4. Repeat

**Quick Start:**
```bash
# Start watch mode
npm run test:watch

# In another terminal, create test file
touch __tests__/components/MyComponent.test.tsx

# Copy template from docs/testing/TEST_TEMPLATES.md
# Write your test
# Watch it fail (RED)
# Implement component
# Watch it pass (GREEN)
# Refactor
```

**Resources:**
- Full Guide: [TDD_WORKFLOW_GUIDE.md](./TDD_WORKFLOW_GUIDE.md)
- Templates: [TEST_TEMPLATES.md](./TEST_TEMPLATES.md)

### Using Test Templates

**Copy-paste templates for fast test creation:**

```bash
# React Component
# Copy from TEST_TEMPLATES.md → React Component Test

# Custom Hook
# Copy from TEST_TEMPLATES.md → Custom Hook Test

# API Service
# Copy from TEST_TEMPLATES.md → API Service Test
```

**Time saved:** ~70% faster test creation

### Test Metrics Dashboard

**View current metrics:**
```bash
npm run test:metrics:show
```

**Collect new metrics:**
```bash
npm run test:metrics:collect
```

**Generate HTML report:**
```bash
npm run test:metrics:report
# Open: .test-metrics/dashboard.html
```

**What you'll see:**
- Coverage trends
- Test count changes
- Execution time
- Warnings and alerts

## For Code Reviewers

### PR Review Checklist

Use [TEST_REVIEW_CHECKLIST.md](./TEST_REVIEW_CHECKLIST.md)

**Quick checks:**
- [ ] New features have tests?
- [ ] Coverage meets 50%+?
- [ ] No skipped tests without comments?
- [ ] Test names are descriptive?
- [ ] Tests follow AAA pattern?

**Rate test quality (1-5):**
- Coverage
- Clarity
- Maintainability
- Performance
- Reliability

**Target:** 4+ average

### GitHub Actions

**Every PR automatically:**
- Runs full test suite
- Checks coverage threshold
- Comments with coverage report
- Uploads coverage artifacts

**If coverage fails:**
- Review the PR comment
- Identify uncovered code
- Add tests to meet threshold

## For Team Leads

### Weekly Tasks

```bash
# 1. Check metrics
npm run test:metrics:show

# 2. Review GitHub issues labeled 'flaky-tests'

# 3. Check coverage trend (should be upward)
```

### Monthly Review

**Questions to ask:**
1. Is coverage trending upward?
2. Are flaky tests < 1%?
3. Are skipped tests documented?
4. What's the test quality score?

**Where to look:**
- `.test-metrics/dashboard.html` - Metrics
- GitHub Issues - Flaky tests
- PR comments - Coverage trends

## NPM Scripts Reference

### Testing
```bash
npm test                    # Run all tests
npm run test:watch          # TDD workflow (watch mode)
npm run test:coverage       # Run with coverage
npm run test:fast           # Quick unit tests only
npm run test:debug          # Debug failing tests
```

### Test Metrics
```bash
npm run test:metrics:collect    # Run tests + collect metrics
npm run test:metrics:show       # Display latest metrics
npm run test:metrics:report     # Generate HTML dashboard
```

### E2E Testing
```bash
npm run e2e                 # Open Cypress
npm run e2e:headless        # Run E2E tests headless
```

## GitHub Workflows

### Test Coverage Workflow
**Trigger:** Every PR and push to main/develop

**What it does:**
1. Runs test suite with coverage
2. Checks 50% minimum threshold
3. Comments on PR with results
4. Uploads coverage artifacts
5. Generates badges (on main)

### Flaky Test Detection
**Trigger:** Daily at 2 AM UTC (or manual)

**What it does:**
1. Runs tests 3 times
2. Identifies inconsistent tests
3. Creates/updates GitHub issue
4. Provides fix recommendations

## Common Commands

### Starting a New Feature (TDD)
```bash
# 1. Create test file first
touch __tests__/components/NewFeature.test.tsx

# 2. Start watch mode
npm run test:watch

# 3. Write failing test
# 4. Implement feature
# 5. See test pass
# 6. Refactor
```

### Checking Coverage
```bash
# Quick check
npm run test:coverage

# Detailed metrics
npm run test:metrics:collect

# Visual dashboard
npm run test:metrics:report
open .test-metrics/dashboard.html
```

### Before Committing
```bash
# Run all tests
npm test

# Check coverage
npm run test:coverage

# Verify no skipped tests (or document why)
```

### During PR Review
```bash
# Run tests for changed files
npm test -- --findRelatedTests path/to/file.ts

# Check coverage diff
npm run test:coverage
# Compare with previous run
```

## Success Metrics

### Coverage
- **Current:** ~4%
- **Phase Target:** 50%+
- **Final Target:** 80%+

### Flaky Tests
- **Target:** < 1%
- **Check:** GitHub issues labeled 'flaky-tests'

### Test Quality
- **Target:** 4+ out of 5
- **Measure:** Use review checklist

### TDD Adoption
- **Target:** 100% of new features
- **Track:** % of features with tests written first

## Troubleshooting

### "Tests are too slow"
```bash
# Use fast mode for quick feedback
npm run test:fast

# Run only one test file
npm run test:watch -- MyComponent
```

### "Not sure what to test"
1. Check [TEST_TEMPLATES.md](./TEST_TEMPLATES.md)
2. Review existing tests for examples
3. Focus on user behavior, not implementation

### "Tests keep failing"
```bash
# Debug mode
npm run test:debug

# Check for flaky tests
# See GitHub issues labeled 'flaky-tests'
```

### "Coverage is below threshold"
```bash
# See what's not covered
npm run test:coverage
open coverage/lcov-report/index.html

# Add tests for uncovered code
# Focus on critical paths first
```

## Quick Links

### Documentation
- [TDD Workflow Guide](./TDD_WORKFLOW_GUIDE.md) - Complete TDD guide
- [Test Templates](./TEST_TEMPLATES.md) - Copy-paste templates
- [Test Review Checklist](./TEST_REVIEW_CHECKLIST.md) - PR review guide
- [Phase 5 Implementation](./PHASE_5_IMPLEMENTATION.md) - Full details

### Tools
- Test Metrics: `.test-metrics/dashboard.html`
- Coverage Report: `coverage/lcov-report/index.html`
- GitHub Actions: `.github/workflows/`

### Getting Help
1. Check documentation (above)
2. Review existing tests for examples
3. Ask in team channels
4. Pair program with another developer

## Next Steps

1. **Read the TDD guide** (10 minutes)
   - [TDD_WORKFLOW_GUIDE.md](./TDD_WORKFLOW_GUIDE.md)

2. **Try the TDD cycle** (30 minutes)
   - Pick a small feature
   - Write test first
   - Implement feature
   - Refactor

3. **Check the metrics** (5 minutes)
   ```bash
   npm run test:metrics:collect
   ```

4. **Review a PR using the checklist** (15 minutes)
   - [TEST_REVIEW_CHECKLIST.md](./TEST_REVIEW_CHECKLIST.md)

5. **Share feedback**
   - What works well?
   - What's confusing?
   - What's missing?

---

**Remember:** Testing is an investment. It takes time upfront but saves time in the long run through fewer bugs, easier refactoring, and increased confidence.

Start small, build the habit, and watch your code quality improve!
