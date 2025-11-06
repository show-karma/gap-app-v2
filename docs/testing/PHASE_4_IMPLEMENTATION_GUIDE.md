# Phase 4 Testing Implementation Guide

## Overview

This document provides a comprehensive guide for completing Phase 4 of the testing implementation. Phase 4 combines achieving 50% function coverage (COMPLETED ✅) with setting up visual regression testing and performance monitoring.

## Current Status

### ✅ Completed Tasks

#### Part 1: Function Coverage Achievement
**Goal:** Cross 50% function coverage threshold
**Status:** ✅ COMPLETED - Achieved 52.53% function coverage

**New Test Files Created:**
1. `/constants/__tests__/donation.test.ts` (100% coverage)
   - Tests all helper functions: `estimateDonationTime`, `formatEstimatedTime`, `isCartSizeWarning`, `isCartFull`, `getRetryDelay`, `isCacheValid`
   - Tests all constant exports
   - 150+ test cases covering edge cases and integration scenarios

2. `/utilities/__tests__/queryKeys.test.ts` (100% coverage)
   - Tests all query key generators for React Query
   - Validates correct tuple structures
   - Tests parameter variations and edge cases
   - 80+ test cases

3. `/services/__tests__/funding-applications.test.ts` (100% coverage)
   - Tests `fetchApplicationByProjectUID` function
   - Tests `deleteApplication` function
   - Mocks API client and tests error handling
   - 30+ test cases

**Coverage Metrics:**
```
Before:  48.73% function coverage
After:   52.53% function coverage
Gain:    +3.8% (exceeded 50% threshold)

Total Tests: 1634 passing, 27 skipped
Test Files: 67 total (66 passing, 1 skipped)
```

### 📋 Remaining Tasks

## Part 2: Storybook Setup for Visual Regression Testing

### Goal
Set up Storybook 8.x with Next.js 15.3.3 support and create component stories for visual testing.

### Installation Steps

1. **Install Storybook Dependencies**
```bash
npx storybook@latest init --type nextjs
```

2. **Install Additional Plugins**
```bash
npm install --save-dev @storybook/addon-essentials \
  @storybook/addon-interactions \
  @storybook/addon-links \
  @storybook/addon-a11y \
  @storybook/addon-coverage \
  @storybook/test
```

3. **Configure Storybook for Next.js 15**

Create `.storybook/main.ts`:
```typescript
import type { StorybookConfig } from "@storybook/nextjs";
import path from "path";

const config: StorybookConfig = {
  stories: [
    "../components/**/*.stories.@(js|jsx|ts|tsx)",
    "../src/**/*.stories.@(js|jsx|ts|tsx)",
  ],
  addons: [
    "@storybook/addon-essentials",
    "@storybook/addon-interactions",
    "@storybook/addon-links",
    "@storybook/addon-a11y",
    "@storybook/addon-coverage",
  ],
  framework: {
    name: "@storybook/nextjs",
    options: {},
  },
  staticDirs: ["../public"],
  webpackFinal: async (config) => {
    if (config.resolve) {
      config.resolve.alias = {
        ...config.resolve.alias,
        "@": path.resolve(__dirname, "../"),
      };
    }
    return config;
  },
};

export default config;
```

Create `.storybook/preview.ts`:
```typescript
import type { Preview } from "@storybook/react";
import "../app/globals.css";

const preview: Preview = {
  parameters: {
    actions: { argTypesRegex: "^on[A-Z].*" },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    nextjs: {
      appDirectory: true,
    },
  },
};

export default preview;
```

4. **Add Scripts to package.json**
```json
{
  "scripts": {
    "storybook": "storybook dev -p 6006",
    "build-storybook": "storybook build"
  }
}
```

### Priority Component Stories to Create

#### 1. UI Components (5 stories)
```typescript
// components/ui/button.stories.tsx
import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './button';

const meta: Meta<typeof Button> = {
  title: 'UI/Button',
  component: Button,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'destructive', 'outline', 'secondary', 'ghost', 'link'],
    },
    size: {
      control: 'select',
      options: ['default', 'sm', 'lg', 'icon'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof Button>;

export const Default: Story = {
  args: {
    children: 'Button',
  },
};

export const Primary: Story = {
  args: {
    variant: 'default',
    children: 'Primary Button',
  },
};

export const Destructive: Story = {
  args: {
    variant: 'destructive',
    children: 'Delete',
  },
};

export const Loading: Story = {
  args: {
    isLoading: true,
    children: 'Loading...',
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
    children: 'Disabled',
  },
};
```

Create similar stories for:
- `components/ui/badge.stories.tsx`
- `components/Utilities/Button.stories.tsx`
- `components/ui/input.stories.tsx`
- `components/Utilities/ProfilePicture.stories.tsx`

#### 2. Form Components (3-4 stories)
- `components/Utilities/MultiSelect.stories.tsx`
- `components/Utilities/MultiSelectDropdown.stories.tsx`
- `components/CommunitiesSelect.stories.tsx`

#### 3. Card Components (3-4 stories)
- `components/GrantCard.stories.tsx`
- `components/Milestone/MilestoneCard.stories.tsx`
- `components/Shared/ActivityCard.stories.tsx`
- `components/Pages/NewProjects/ProjectCard.stories.tsx`

#### 4. Dialog/Modal Components (2-3 stories)
- `components/DeleteDialog.stories.tsx`
- `components/Dialogs/StepperDialog.stories.tsx`
- `components/Dialogs/ReasonsModal.stories.tsx`

### Story Template
```typescript
import type { Meta, StoryObj } from '@storybook/react';
import { ComponentName } from './ComponentName';

const meta: Meta<typeof ComponentName> = {
  title: 'Category/ComponentName',
  component: ComponentName,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered', // or 'fullscreen' or 'padded'
  },
  argTypes: {
    // Define controls for props
  },
  decorators: [
    (Story) => (
      <div className="p-4">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof ComponentName>;

export const Default: Story = {
  args: {
    // default props
  },
};

export const Variant: Story = {
  args: {
    // variant props
  },
};
```

## Part 3: Chromatic Setup for Visual Regression

### Goal
Integrate Chromatic for automated visual regression testing in CI/CD.

### Setup Steps

1. **Install Chromatic**
```bash
npm install --save-dev chromatic
```

2. **Sign up for Chromatic**
- Visit https://www.chromatic.com/
- Connect your GitHub repository
- Get your project token

3. **Add Chromatic Script**
```json
{
  "scripts": {
    "chromatic": "chromatic --project-token=<your-project-token>"
  }
}
```

4. **GitHub Actions Workflow**

Create `.github/workflows/chromatic.yml`:
```yaml
name: Chromatic

on:
  push:
    branches:
      - main
      - develop
  pull_request:

jobs:
  chromatic:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run Chromatic
        uses: chromaui/action@latest
        with:
          projectToken: ${{ secrets.CHROMATIC_PROJECT_TOKEN }}
          buildScriptName: 'build-storybook'
          autoAcceptChanges: 'main'
          exitZeroOnChanges: true
```

5. **Add Chromatic Token to GitHub Secrets**
- Go to repository Settings > Secrets and variables > Actions
- Add `CHROMATIC_PROJECT_TOKEN` with your Chromatic token

### Visual Testing Workflow

1. **Baseline Creation**
```bash
npm run chromatic -- --auto-accept-changes
```

2. **CI Integration**
- Chromatic runs automatically on PR creation
- Visual diffs are posted as PR comments
- Approve or reject visual changes in Chromatic UI

3. **Local Development**
```bash
npm run storybook
# Visit http://localhost:6006
```

## Part 4: Lighthouse CI Setup for Performance Monitoring

### Goal
Set up Lighthouse CI to monitor web vitals and performance budgets.

### Installation Steps

1. **Install Lighthouse CI**
```bash
npm install --save-dev @lhci/cli
```

2. **Create Lighthouse Configuration**

Create `lighthouserc.js`:
```javascript
module.exports = {
  ci: {
    collect: {
      startServerCommand: 'npm run build && npm run start',
      startServerReadyPattern: 'ready on',
      url: [
        'http://localhost:3000/',
        'http://localhost:3000/projects',
        'http://localhost:3000/communities',
      ],
      numberOfRuns: 3,
    },
    assert: {
      preset: 'lighthouse:recommended',
      assertions: {
        // Performance budgets
        'first-contentful-paint': ['error', { maxNumericValue: 2000 }],
        'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
        'total-blocking-time': ['error', { maxNumericValue: 300 }],
        'speed-index': ['error', { maxNumericValue: 3000 }],

        // Accessibility
        'categories:accessibility': ['error', { minScore: 0.9 }],

        // Best Practices
        'categories:best-practices': ['error', { minScore: 0.9 }],

        // SEO
        'categories:seo': ['error', { minScore: 0.9 }],
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
};
```

3. **Add Lighthouse Scripts**
```json
{
  "scripts": {
    "lhci:mobile": "lhci autorun --collect.settings.preset=mobile",
    "lhci:desktop": "lhci autorun --collect.settings.preset=desktop"
  }
}
```

4. **GitHub Actions Workflow**

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
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build project
        run: npm run build

      - name: Run Lighthouse CI
        run: |
          npm install -g @lhci/cli
          lhci autorun
        env:
          LHCI_GITHUB_APP_TOKEN: ${{ secrets.LHCI_GITHUB_APP_TOKEN }}

      - name: Upload results
        uses: actions/upload-artifact@v4
        with:
          name: lighthouse-results
          path: .lighthouseci
```

### Performance Budget Guidelines

**Core Web Vitals Targets:**
- LCP (Largest Contentful Paint): < 2.5s
- FID (First Input Delay): < 100ms
- CLS (Cumulative Layout Shift): < 0.1

**Additional Metrics:**
- FCP (First Contentful Paint): < 2.0s
- TTI (Time to Interactive): < 3.5s
- TBT (Total Blocking Time): < 300ms
- Speed Index: < 3.0s

## Implementation Roadmap

### Week 1: Storybook Setup
- [ ] Install Storybook and dependencies
- [ ] Configure for Next.js 15
- [ ] Create 5 UI component stories
- [ ] Test local development workflow

### Week 2: Component Stories
- [ ] Create 4 form component stories
- [ ] Create 4 card component stories
- [ ] Create 3 dialog/modal stories
- [ ] Document story patterns

### Week 3: Chromatic Integration
- [ ] Sign up for Chromatic
- [ ] Install and configure Chromatic
- [ ] Set up GitHub Actions workflow
- [ ] Create baseline snapshots
- [ ] Test visual regression workflow

### Week 4: Lighthouse CI
- [ ] Install Lighthouse CI
- [ ] Configure performance budgets
- [ ] Set up GitHub Actions workflow
- [ ] Establish performance baseline
- [ ] Document performance optimization workflow

## Success Criteria

### Storybook
- ✅ 15+ component stories created
- ✅ Local development server runs without errors
- ✅ All stories render correctly
- ✅ Accessibility checks pass
- ✅ Documentation auto-generated

### Chromatic
- ✅ Visual regression tests run on every PR
- ✅ Baseline snapshots captured
- ✅ Team can approve/reject visual changes
- ✅ Integration with PR checks

### Lighthouse CI
- ✅ Performance budgets enforced
- ✅ Core Web Vitals monitored
- ✅ Performance reports on every PR
- ✅ Baseline metrics established
- ✅ Alerts on budget violations

## Maintenance Guidelines

### Storybook
- Add stories for all new components
- Update stories when component APIs change
- Review accessibility scores monthly
- Keep dependencies up to date

### Chromatic
- Review and approve visual changes promptly
- Update baselines after intentional UI changes
- Monitor snapshot count and usage
- Clean up old baselines quarterly

### Lighthouse CI
- Review performance budgets quarterly
- Adjust budgets based on user experience data
- Investigate budget violations immediately
- Track performance trends over time

## Resources

### Storybook
- [Storybook for Next.js Documentation](https://storybook.js.org/docs/get-started/nextjs)
- [Writing Stories Guide](https://storybook.js.org/docs/writing-stories)
- [Component Story Format](https://storybook.js.org/docs/api/csf)

### Chromatic
- [Chromatic Documentation](https://www.chromatic.com/docs/)
- [Visual Testing Best Practices](https://www.chromatic.com/docs/test)
- [CI Integration Guide](https://www.chromatic.com/docs/ci)

### Lighthouse CI
- [Lighthouse CI Documentation](https://github.com/GoogleChrome/lighthouse-ci/blob/main/docs/getting-started.md)
- [Performance Budgets Guide](https://web.dev/performance-budgets-101/)
- [Core Web Vitals](https://web.dev/vitals/)

## Notes

- All new component tests should follow the patterns established in `/components/ui/button.test.tsx`
- Visual regression testing catches UI bugs that unit tests miss
- Performance monitoring prevents regressions in user experience
- These tools complement the existing Jest + Cypress test suite
