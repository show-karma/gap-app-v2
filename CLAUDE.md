# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

This is the GAP (Grantee Accountability Protocol) frontend application - a Next.js-based web application that provides an interface for managing grants, projects, and impact measurement on the blockchain using the Ethereum Attestation Service (EAS).

## Key Architecture

### Tech Stack
- **Framework**: Next.js 15.3.3 with App Router
- **Language**: TypeScript (strict mode)
- **Styling**: TailwindCSS with Tremor React and Radix UI
- **State Management**: Zustand for client state, React Query for server state
- **Web3**: Wagmi, Viem, Dynamic SDK
- **Authentication**: Dynamic SDK
- **Testing**: Jest + React Testing Library, Cypress for E2E
- **Package Manager**: pnpm

### Data Flow
- All data is stored as on-chain attestations via EAS
- Frontend queries the GAP Indexer API (backend service)
- Uses React Query for caching and synchronization
- Zustand stores handle UI state and user preferences

## Development Commands

```bash
# Development
pnpm dev                    # Start dev server (localhost:3000)
pnpm build                  # Build for production
pnpm start                  # Start production server

# Testing
pnpm test                   # Run unit tests
pnpm test:watch            # Run tests in watch mode
pnpm test:coverage         # Generate coverage report
pnpm e2e:headless          # Run Cypress E2E tests
pnpm cypress:open          # Open Cypress UI

# Code Quality
pnpm lint                  # Run ESLint
pnpm tsc                   # TypeScript type checking

# Analysis
pnpm build-stats           # Build with bundle analyzer
```

## Project Structure (Feature-Based Architecture)

```
src/
├── app/                    # Next.js App Router pages
│   ├── (routes)/          # Route groups
│   ├── api/               # API routes
│   └── layout.tsx         # Root layout
│
├── features/              # Feature modules (self-contained)
│   ├── auth/             # Authentication
│   ├── communities/      # Communities management
│   ├── grants/           # Grants management  
│   ├── projects/         # Projects management
│   ├── impact/           # Impact measurement
│   ├── milestones/       # Milestone tracking
│   └── [feature]/        # Each feature contains:
│       ├── components/   # Feature components
│       ├── hooks/        # Feature hooks
│       ├── lib/          # Feature logic (stores)
│       ├── api/          # Feature API services
│       ├── actions.ts    # Server actions
│       └── types.ts      # Feature types
│
├── components/            # Shared components only
│   ├── ui/               # Generic UI components
│   ├── layout/           # Layout components
│   ├── providers/        # Context providers
│   └── icons/            # SVG icons
│
├── lib/                   # Generic utilities
│   ├── analytics/        # Analytics helpers
│   ├── format/           # Formatters
│   ├── metadata/         # Meta tags
│   ├── monitoring/       # Error tracking
│   └── utils/            # General utilities
│
├── services/              # External integrations
│   ├── blockchain/       # Web3 abstractions
│   ├── gap-indexer/      # Backend API client
│   ├── gap-sdk/          # GAP SDK wrapper
│   └── ens.ts            # ENS service
│
├── config/               # App configuration
│   ├── abi/             # Contract ABIs
│   ├── auth.ts          # Auth config
│   ├── chains.ts        # Network config
│   └── constants.ts     # App constants
│
├── hooks/                # Cross-feature hooks only
├── styles/               # Global styles
└── types/                # Global types only
```

## Coding Standards

### TypeScript
- Always use TypeScript for new files
- Use proper types, avoid `any`
- Named exports for components
- PascalCase for component names
- Interfaces over types when extensibility needed

### Components
- Mark client components with `"use client"`
- Use absolute imports with `@/` prefix
- Co-locate components with their feature
- Include proper TypeScript props interface
- NO barrel exports (index.ts) - import directly

### Feature Organization
- Keep features self-contained
- No direct imports between features
- Use services layer for cross-feature communication
- Each feature should have its own README
- Group related sub-features in subdirectories

### State Management
- Zustand for UI/client state in `feature/lib/store.ts`
- React Query for server state
- Never mix concerns between stores
- Use proper TypeScript typing for stores
- Avoid global state when possible

### API Integration
- Use services layer for external APIs
- Feature-specific API calls in `feature/api/`
- Handle errors with `errorManager` utility
- Always implement loading states
- Use React Query for data fetching

### Styling
- TailwindCSS classes only, no inline styles
- Use `cn` utility for conditional classes
- Follow existing component patterns
- Maintain consistent spacing
- Use Tremor React components when available

### Error Handling
- Use `errorManager.logError()` for logging
- Provide user-friendly error messages
- Handle Web3 errors gracefully
- Implement proper error boundaries
- Show specific error states in UI

## Key Utilities

### fetchData
```typescript
import { fetchData } from "@/lib/utils/fetch-data";
// Handles API calls with built-in error handling
```

### errorManager
```typescript
import { errorManager } from "@/lib/utils/error-manager";
// Centralized error logging and handling
```

### cn (classnames)
```typescript
import { cn } from "@/lib/utils/cn";
// Conditional class name utility
```

### Format utilities
```typescript
import { formatDate } from "@/lib/format/date";
import { formatCurrency } from "@/lib/format/currency";
import { formatAddress } from "@/lib/format/address";
```

## Web3 Integration

- Use Wagmi hooks for blockchain interaction
- Services layer abstracts contract calls
- Handle wallet connection states properly
- Implement transaction loading states
- Show gas estimates when relevant
- Handle network switching gracefully

## Testing Approach

### Unit Tests
- Test files in `__tests__` or alongside source
- Mock external dependencies
- Focus on component behavior
- Use React Testing Library
- Test custom hooks with renderHook

### E2E Tests
- Located in `cypress/e2e/`
- Test critical user flows
- Run against localhost:3000
- Include accessibility checks
- Test Web3 interactions when possible

## Performance Guidelines

- Use React.memo for expensive components
- Implement virtualization for long lists
- Lazy load heavy components
- Optimize images with Next.js Image
- Monitor bundle size with analyzer
- Use dynamic imports for code splitting

## Accessibility Requirements

- Use semantic HTML elements
- Include proper ARIA attributes
- Ensure keyboard navigation
- Maintain focus management
- Test with screen readers
- Provide alt text for images

## Environment Variables

Key variables needed (see .env-example):
- `NEXT_PUBLIC_GAP_INDEXER_URL`: Backend API URL
- `NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID`: Auth provider
- `NEXT_PUBLIC_WC_PROJECT_ID`: WalletConnect
- Various RPC URLs for blockchain networks
- Analytics and monitoring keys

## Common Patterns

### Data Fetching
```typescript
// In a feature hook
const { data, isLoading, error } = useQuery({
  queryKey: ['projects', id],
  queryFn: () => projectService.getProject(id),
});
```

### Error Handling
```typescript
try {
  // operation
} catch (error) {
  errorManager.logError(error, "Context description");
  toast.error("User-friendly message");
}
```

### Conditional Classes
```typescript
className={cn(
  "base-classes",
  isActive && "active-classes",
  isDisabled && "disabled-classes"
)}
```

### Feature Store Pattern
```typescript
// In feature/lib/store.ts
export const useFeatureStore = create<FeatureState>((set) => ({
  // state
  // actions
}));
```

## Important Notes

- Never use `redirect()` in try-catch blocks
- Always check wallet connection before Web3 operations
- Use loading skeletons for better UX
- Follow existing component patterns
- Test on multiple screen sizes
- Ensure proper meta tags for SEO
- Keep features independent and self-contained
- Use services layer for external integrations
- Avoid circular dependencies between features
- Document complex business logic