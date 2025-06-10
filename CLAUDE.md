# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Core Commands
- `yarn dev` - Start development server
- `yarn build` - Build for production
- `yarn start` - Start production server
- `yarn lint` - Run ESLint
- `yarn test` - Run Jest tests
- `yarn test:watch` - Run tests in watch mode
- `yarn test:coverage` - Run tests with coverage

### E2E Testing
- `yarn cypress:open` - Open Cypress UI
- `yarn e2e` - Run E2E tests with server
- `yarn e2e:headless` - Run E2E tests headlessly
- `yarn component` - Open Cypress component testing
- `yarn component:headless` - Run component tests headlessly

### Build Analysis
- `yarn build-stats` - Build with bundle analysis
- `yarn postbuild` - Generate sitemap after build

## Architecture Overview

### Technology Stack
- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Styling**: TailwindCSS with Radix UI components
- **State Management**: Zustand for global state, React Query for server state
- **Web3**: Wagmi/RainbowKit for wallet integration
- **Authentication**: JWT-based with wallet connection
- **Data Fetching**: Custom `fetchData` utility with axios
- **File Storage**: IPFS via @show-karma/karma-gap-sdk

### Project Structure
- `/app` - Next.js App Router pages and layouts
- `/components` - React components organized by feature
  - `/Pages` - Page-specific components
  - `/Dialogs` - Modal and dialog components
  - `/Utilities` - Reusable utility components
- `/hooks` - Custom React hooks
- `/store` - Zustand state stores organized by domain
- `/utilities` - Helper functions and API utilities
- `/types` - TypeScript type definitions
- `/services` - Business logic services

### Key Architectural Patterns

#### State Management
- **Global State**: Zustand stores in `/store` directory
- **Server State**: React Query for caching and data fetching
- **Local State**: React hooks for component-specific state

#### Data Fetching
- Use `fetchData` utility from `/utilities/fetchData.ts` for API calls
- Implements authentication, error handling, and caching
- Returns tuple: `[data, error, pageInfo]`
- Default base URL: GAP_INDEXER_URL environment variable

#### Web3 Integration
- GAP SDK client via `useGap` hook
- Wallet connection handled by Wagmi/RainbowKit
- Multi-chain support with network switching
- IPFS storage for decentralized data

#### Component Patterns
- Use "use client" directive for client components
- Named exports for all components
- TypeScript interfaces for props
- Destructuring for props
- `cn` utility for conditional class names (TailwindCSS + clsx)

#### Authentication
- JWT tokens stored in cookies
- Wallet-based authentication
- `getCookiesFromStoredWallet` utility for token retrieval
- Authorization headers automatically added to API requests

### Development Guidelines

#### TypeScript
- Use TypeScript for all new files
- Define interfaces for component props and API responses
- Use early returns for better readability

#### Components
- Organize by feature or functionality
- Use PascalCase for component names
- Export as named exports
- Use descriptive prop names

#### Styling
- TailwindCSS for all styling
- Use `cn` utility for conditional classes
- Follow existing color patterns in `/styles/_theme_colors.scss`

#### Imports
- Use absolute imports with `@/` prefix
- Group imports: React, third-party, internal
- Import only what you need

#### Testing
- Jest for unit tests
- Cypress for E2E testing
- React Testing Library for component tests
- Test files in `__tests__` directory

## Important Utilities

### Data Fetching
```typescript
// Use fetchData for API calls
import fetchData from '@/utilities/fetchData';
const [data, error, pageInfo] = await fetchData('/endpoint', 'GET');
```

### Style Utilities
```typescript
// Use cn for conditional classes
import { cn } from '@/utilities/tailwind';
const className = cn('base-class', { 'conditional-class': condition });
```

### GAP SDK
```typescript
// Use useGap hook for Web3 interactions
import { useGap } from '@/hooks/useGap';
const { gap, updateGapClient } = useGap();
```

## Environment Variables
- `NEXT_PUBLIC_GAP_INDEXER_URL` - Main API base URL
- `IPFS_TOKEN` - IPFS storage authentication
- `NEXT_PUBLIC_SPONSOR_URL` - Gelato gasless transactions

## Code Quality
- ESLint configuration enforces code standards
- Husky git hooks for pre-commit checks
- Follow DRY principle
- Implement proper error handling
- Use semantic HTML and accessibility attributes
- Ensure keyboard navigation support