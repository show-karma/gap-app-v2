# Visual Regression Testing with Storybook + Chromatic

## Overview

This project uses **Storybook** for component documentation and **Chromatic** for visual regression testing. This guide explains how to use these tools effectively.

## Quick Start

### Running Storybook Locally

```bash
# Start Storybook development server
pnpm storybook

# Visit http://localhost:6006 in your browser
```

### Building Storybook

```bash
# Build static Storybook for production
pnpm build-storybook

# Output will be in storybook-static/
```

## Storybook Configuration

### Directory Structure

```
.storybook/
├── main.ts          # Storybook configuration
└── preview.ts       # Global decorators and parameters

components/
├── ui/
│   ├── button.tsx
│   ├── button.stories.tsx
│   ├── badge.tsx
│   └── badge.stories.tsx
└── GrantCard.tsx
    └── GrantCard.stories.tsx
```

### Configuration Files

**`.storybook/main.ts`**
- Configures story locations
- Adds Storybook addons
- Sets up Next.js 15 framework support
- Configures webpack aliases

**`.storybook/preview.ts`**
- Imports global styles (globals.css)
- Configures story parameters
- Sets up Next.js App Router support

## Writing Stories

### Story Structure

```typescript
import type { Meta, StoryObj } from '@storybook/react';
import { ComponentName } from './ComponentName';

const meta: Meta<typeof ComponentName> = {
  title: 'Category/ComponentName',
  component: ComponentName,
  tags: ['autodocs'],
  argTypes: {
    propName: {
      control: 'select',
      options: ['option1', 'option2'],
      description: 'Prop description',
    },
  },
};

export default meta;
type Story = StoryObj<typeof ComponentName>;

export const Default: Story = {
  args: {
    propName: 'value',
  },
};
```

### Story Categories

- **UI/** - Basic UI components (Button, Badge, Input, etc.)
- **Cards/** - Card components (GrantCard, ProjectCard, etc.)
- **Forms/** - Form components
- **Navigation/** - Navigation components
- **Utilities/** - Utility components

### Best Practices

1. **Use Descriptive Names**: `export const LoadingState: Story = {}`
2. **Cover All States**: Default, Loading, Error, Empty, Disabled
3. **Document Props**: Use `argTypes` to document component props
4. **Use Controls**: Enable interactive prop editing in Storybook
5. **Group Related Stories**: Use categories to organize stories

## Chromatic Visual Regression Testing

### Setup

1. **Sign up for Chromatic**: Visit [chromatic.com](https://www.chromatic.com/)
2. **Connect Repository**: Link your GitHub repository
3. **Get Project Token**: Copy your Chromatic project token
4. **Configure Token**: 
   - Replace `CHROMATIC_PROJECT_TOKEN` in `chromatic.config.json`
   - Or set as environment variable: `CHROMATIC_PROJECT_TOKEN`

### Running Chromatic

```bash
# Run Chromatic (requires project token)
pnpm chromatic

# Run with specific token
CHROMATIC_PROJECT_TOKEN=your-token pnpm chromatic
```

### Chromatic Configuration

**`chromatic.config.json`**
```json
{
  "projectToken": "CHROMATIC_PROJECT_TOKEN",
  "buildScriptName": "build-storybook",
  "exitZeroOnChanges": true,
  "autoAcceptChanges": false,
  "exitOnceUploaded": true
}
```

### Visual Regression Workflow

1. **Create/Update Story**: Make changes to components or stories
2. **Run Chromatic**: `pnpm chromatic`
3. **Review Changes**: Visit Chromatic UI to review visual diffs
4. **Accept or Reject**: Approve intentional changes, reject bugs
5. **Update Baseline**: Approved changes become new baseline

### CI/CD Integration

Add to `.github/workflows/chromatic.yml`:

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
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - run: pnpm install

      - name: Run Chromatic
        uses: chromaui/action@latest
        with:
          projectToken: ${{ secrets.CHROMATIC_PROJECT_TOKEN }}
          buildScriptName: 'build-storybook'
          autoAcceptChanges: 'main'
          exitZeroOnChanges: true
```

## Component Stories Created

### UI Components
- **Button** (`components/ui/button.stories.tsx`)
  - Variants: default, destructive, outline, secondary, ghost, link
  - Sizes: default, sm, lg, icon
  - States: loading, disabled, with icon

- **Badge** (`components/ui/badge.stories.tsx`)
  - Variants: default, secondary, destructive, outline
  - Examples: status badges, long text, with numbers

### Card Components
- **GrantCard** (`components/GrantCard.stories.tsx`)
  - Default, color variations
  - With/without stats
  - With/without categories
  - With action slot

## Troubleshooting

### Storybook Won't Start

```bash
# Clean cache and node_modules
rm -rf node_modules/.cache
pnpm install
pnpm storybook
```

### Version Conflicts

The project uses Storybook 10.0.5 with some addons on 8.6.14. These version mismatches are handled by Storybook's compatibility layer.

### Stories Not Appearing

1. Check story file location matches glob patterns in `.storybook/main.ts`
2. Ensure story file ends with `.stories.tsx`
3. Check for TypeScript errors in story file

## Additional Resources

- [Storybook Documentation](https://storybook.js.org/docs)
- [Chromatic Documentation](https://www.chromatic.com/docs/)
- [Writing Stories Guide](https://storybook.js.org/docs/writing-stories)
- [Component Story Format](https://storybook.js.org/docs/api/csf)

## Maintenance

### Adding New Stories

1. Create `.stories.tsx` file next to component
2. Follow existing story patterns
3. Run Storybook locally to verify
4. Run Chromatic to establish visual baseline

### Updating Dependencies

```bash
# Update Storybook and addons
pnpm add -D storybook@latest @storybook/nextjs@latest @storybook/addon-essentials@latest

# Update Chromatic
pnpm add -D chromatic@latest
```

### Best Practices for Teams

1. **Review Visual Changes**: Always review Chromatic diffs before merging
2. **Document Component Behavior**: Use story descriptions and controls
3. **Keep Stories Updated**: Update stories when components change
4. **Test Accessibility**: Use `@storybook/addon-a11y` to check a11y
5. **Version Control**: Commit story files with component changes
