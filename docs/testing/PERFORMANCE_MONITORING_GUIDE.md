# Performance Monitoring with Lighthouse CI

## Overview

This project uses **Lighthouse CI** to monitor web performance, accessibility, best practices, and SEO. This guide explains how to use Lighthouse CI effectively.

## Quick Start

### Running Lighthouse CI Locally

```bash
# Run complete Lighthouse CI pipeline (requires build)
pnpm lighthouse

# Run individual steps
pnpm lighthouse:collect    # Collect metrics
pnpm lighthouse:assert     # Check against budgets
pnpm lighthouse:upload     # Upload results
```

### Prerequisites

Before running Lighthouse CI:
1. Build the Next.js application: `pnpm build`
2. Ensure port 3000 is available

## Lighthouse CI Configuration

### Configuration File

**`lighthouserc.js`** - Main configuration file

```javascript
module.exports = {
  ci: {
    collect: {
      // URLs to audit
      url: [
        'http://localhost:3000/',
        'http://localhost:3000/projects',
        'http://localhost:3000/communities',
        'http://localhost:3000/grants',
      ],
      // Number of runs per URL (for stable metrics)
      numberOfRuns: 3,
    },
    assert: {
      // Performance budgets and assertions
    },
    upload: {
      // Where to store results
      target: 'temporary-public-storage',
    },
  },
};
```

## Performance Budgets

### Core Web Vitals

| Metric | Budget | Description |
|--------|--------|-------------|
| **FCP** (First Contentful Paint) | < 2.0s | Time until first content appears |
| **LCP** (Largest Contentful Paint) | < 2.5s | Time until largest content appears |
| **CLS** (Cumulative Layout Shift) | < 0.1 | Visual stability score |
| **TBT** (Total Blocking Time) | < 300ms | Time page is blocked from user input |
| **Speed Index** | < 3.0s | How quickly content is visually populated |

### Category Scores

| Category | Minimum Score | Description |
|----------|--------------|-------------|
| **Performance** | 85% (warn) | Overall performance score |
| **Accessibility** | 90% (error) | WCAG 2.2 AA compliance |
| **Best Practices** | 90% (error) | Modern web standards |
| **SEO** | 90% (error) | Search engine optimization |

### Resource Budgets

| Resource Type | Budget | Description |
|--------------|--------|-------------|
| **JavaScript** | 300 KB | Total JavaScript bundle size |
| **Images** | 500 KB | Total image size |
| **Total** | 1000 KB | Total page weight |
| **Third-party scripts** | 10 requests | External script count |

## Understanding Results

### Performance Score Breakdown

Lighthouse calculates performance scores based on:
1. **First Contentful Paint (10%)**: Initial paint time
2. **Speed Index (10%)**: Visual progress
3. **Largest Contentful Paint (25%)**: Main content load time
4. **Total Blocking Time (30%)**: Interactivity delay
5. **Cumulative Layout Shift (25%)**: Visual stability

### Interpreting Metrics

#### Good Scores
- **90-100**: Excellent - No action needed
- **50-89**: Needs improvement - Optimize recommended
- **0-49**: Poor - Immediate attention required

#### Budget Violations

When budgets are exceeded:
- **Error**: CI pipeline fails (Accessibility, Best Practices, SEO)
- **Warn**: CI continues with warning (Performance)

## CI/CD Integration

### GitHub Actions Workflow

Create `.github/workflows/lighthouse.yml`:

```yaml
name: Lighthouse CI

on:
  pull_request:
    branches:
      - main
      - develop

jobs:
  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - run: pnpm install

      - name: Build application
        run: pnpm build

      - name: Run Lighthouse CI
        run: pnpm lighthouse
        env:
          LHCI_GITHUB_APP_TOKEN: ${{ secrets.LHCI_GITHUB_APP_TOKEN }}

      - name: Upload Lighthouse results
        uses: actions/upload-artifact@v4
        with:
          name: lighthouse-results
          path: .lighthouseci
```

### Pull Request Comments

Lighthouse CI can post results as PR comments:
1. Install Lighthouse CI GitHub App
2. Set `LHCI_GITHUB_APP_TOKEN` secret
3. Results will appear in PR comments automatically

## Optimization Strategies

### JavaScript Bundle Size

**Problem**: JavaScript budget exceeded (> 300 KB)

**Solutions**:
1. Code splitting with dynamic imports
   ```typescript
   const Component = dynamic(() => import('./Component'))
   ```

2. Tree shaking unused exports
3. Remove unused dependencies
4. Use production builds

### Image Optimization

**Problem**: Image budget exceeded (> 500 KB)

**Solutions**:
1. Use Next.js Image component
   ```typescript
   import Image from 'next/image'
   <Image src="/image.jpg" width={800} height={600} alt="..." />
   ```

2. Use WebP format
3. Implement lazy loading
4. Optimize image dimensions

### Layout Shifts

**Problem**: CLS > 0.1

**Solutions**:
1. Reserve space for dynamic content
   ```css
   .container {
     min-height: 400px;
   }
   ```

2. Use aspect-ratio for images
3. Avoid inserting content above existing content
4. Use CSS transforms instead of layout properties

### Blocking Time

**Problem**: TBT > 300ms

**Solutions**:
1. Defer non-critical JavaScript
2. Split long tasks into smaller chunks
3. Use web workers for heavy computation
4. Optimize third-party scripts

## Local Development Workflow

### 1. Baseline Metrics

Before optimization:
```bash
pnpm build
pnpm lighthouse
```

Save results in `.lighthouseci/` for comparison.

### 2. Make Optimizations

- Implement performance improvements
- Test changes locally

### 3. Measure Impact

```bash
pnpm build
pnpm lighthouse
```

Compare new results with baseline.

### 4. Iterate

Repeat until all budgets are met.

## Troubleshooting

### Server Won't Start

**Issue**: `startServerCommand` fails

**Solution**:
1. Ensure build succeeds: `pnpm build`
2. Check port 3000 is free
3. Verify `next start` works manually

### Inconsistent Metrics

**Issue**: Scores vary between runs

**Solution**:
- Increase `numberOfRuns` to 5
- Close other applications
- Use consistent network conditions
- Run on CI for stable environment

### Budget Too Strict

**Issue**: Cannot meet performance budgets

**Solution**:
1. Review if budgets are realistic
2. Adjust budgets in `lighthouserc.js`
3. Prioritize critical metrics
4. Consider staged rollout

## Advanced Configuration

### Custom Assertions

Add specific Lighthouse audits:

```javascript
assertions: {
  // Custom performance metrics
  'first-meaningful-paint': ['error', { maxNumericValue: 2000 }],
  'interactive': ['error', { maxNumericValue: 3500 }],
  
  // Specific audits
  'uses-optimized-images': 'error',
  'uses-webp-images': 'warn',
  'offscreen-images': 'warn',
  
  // Accessibility
  'color-contrast': 'error',
  'image-alt': 'error',
  'label': 'error',
}
```

### Multiple Device Types

Test mobile and desktop:

```javascript
collect: {
  settings: {
    preset: 'desktop', // or 'mobile'
  },
}
```

### Persistent Storage

Store results in Lighthouse CI server:

```javascript
upload: {
  target: 'lhci',
  serverBaseUrl: 'https://your-lhci-server.com',
  token: process.env.LHCI_TOKEN,
}
```

## Monitoring Over Time

### Tracking Trends

1. **Run Lighthouse CI on every PR**
2. **Track scores in dashboards**
3. **Set up alerts for regressions**
4. **Review monthly performance reports**

### Performance Budget Reviews

Quarterly budget reviews:
1. Analyze actual vs. budgeted metrics
2. Adjust budgets based on user data
3. Set new optimization goals
4. Update `lighthouserc.js`

## Resources

- [Lighthouse Documentation](https://developer.chrome.com/docs/lighthouse/)
- [Lighthouse CI Documentation](https://github.com/GoogleChrome/lighthouse-ci/blob/main/docs/getting-started.md)
- [Core Web Vitals](https://web.dev/vitals/)
- [Performance Budgets Guide](https://web.dev/performance-budgets-101/)
- [Next.js Performance](https://nextjs.org/docs/app/building-your-application/optimizing)

## Best Practices

1. **Run Lighthouse CI on every PR** - Catch regressions early
2. **Monitor Core Web Vitals** - Focus on user-centric metrics
3. **Set Realistic Budgets** - Balance performance with features
4. **Track Trends** - Monitor performance over time
5. **Optimize Images** - Usually the biggest performance win
6. **Code Splitting** - Load only what's needed
7. **Measure Real Users** - Complement CI with RUM data
8. **Iterate Continuously** - Performance is an ongoing effort

## Current Configuration Summary

**URLs Monitored**:
- Homepage (`/`)
- Projects page (`/projects`)
- Communities page (`/communities`)
- Grants page (`/grants`)

**Performance Budgets**:
- FCP: 2.0s
- LCP: 2.5s
- CLS: 0.1
- TBT: 300ms
- Speed Index: 3.0s

**Quality Gates**:
- Performance: ≥85% (warn)
- Accessibility: ≥90% (error)
- Best Practices: ≥90% (error)
- SEO: ≥90% (error)

**Resource Limits**:
- JavaScript: 300 KB
- Images: 500 KB
- Total: 1000 KB
- Third-party: 10 requests
