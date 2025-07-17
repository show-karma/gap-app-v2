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
- **Web3**: Wagmi, Viem, RainbowKit
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

# Analysis
pnpm build-stats           # Build with bundle analyzer
```

## Project Structure

```
app/                    # Next.js App Router pages
├── (auth)/            # Authenticated routes
├── (default)/         # Public routes
├── admin/             # Admin interfaces
└── api/               # API routes

components/            # React components by feature
├── Pages/            # Page-specific components
├── Forms/            # Form components
├── Utilities/        # Shared UI components
└── Dialogs/          # Modal components

hooks/                 # Custom React hooks
store/                 # Zustand stores
services/              # API clients and business logic
utilities/             # Helper functions
types/                 # TypeScript definitions
```

## Coding Standards

### TypeScript
- Always use TypeScript for new files
- Use proper types, avoid `any`
- Named exports for components
- PascalCase for component names

### Components
- Mark client components with `"use client"`
- Use absolute imports with `@/` prefix
- Place in appropriate directory by feature
- Include proper TypeScript props interface

### State Management
- Zustand for UI/client state
- React Query for server state
- Never mix concerns between stores
- Use proper TypeScript typing for stores

### API Integration
- Use `fetchData` utility from `@/utilities/fetchData`
- Handle errors with `errorManager` utility
- Always implement loading states
- Use React Query for data fetching

### Styling
- TailwindCSS classes only, no inline styles
- Use `cn` utility for conditional classes
- Follow existing component patterns
- Maintain consistent spacing

### Error Handling
- Use `errorManager.logError()` for logging
- Provide user-friendly error messages
- Handle Web3 errors gracefully
- Implement proper error boundaries

## Key Utilities

### fetchData
```typescript
import { fetchData } from "@/utilities/fetchData";
// Handles API calls with built-in error handling
```

### errorManager
```typescript
import errorManager from "@/utilities/errorManager";
// Centralized error logging and handling
```

### cn (classnames)
```typescript
import { cn } from "@/utilities/cn";
// Conditional class name utility
```

## Web3 Integration

- Use Wagmi hooks for blockchain interaction
- Handle wallet connection states properly
- Implement transaction loading states
- Show gas estimates when relevant
- Handle network switching gracefully

## Testing Approach

### Unit Tests
- Test files alongside source or in `__tests__`
- Mock external dependencies
- Focus on component behavior
- Use React Testing Library

### E2E Tests
- Located in `cypress/e2e/`
- Test critical user flows
- Run against localhost:3000
- Include accessibility checks

## Performance Guidelines

- Use React.memo for expensive components
- Implement virtualization for long lists
- Lazy load heavy components
- Optimize images with Next.js Image
- Monitor bundle size with analyzer

## Accessibility Requirements

- Use semantic HTML elements
- Include proper ARIA attributes
- Ensure keyboard navigation
- Maintain focus management
- Test with screen readers

## Environment Variables

Key variables needed (see .env-example):
- `NEXT_PUBLIC_GAP_INDEXER_URL`: Backend API URL
- `NEXT_PUBLIC_PRIVY_APP_ID`: Authentication
- Various RPC URLs for blockchain networks
- Analytics and monitoring keys

## Common Patterns

### Data Fetching
```typescript
const { data, isLoading, error } = useQuery({
  queryKey: ['projects', id],
  queryFn: () => fetchData(`/projects/${id}`),
});
```

### Error Handling
```typescript
try {
  // operation
} catch (error) {
  errorManager.logError(error, "Context description");
  // user feedback
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

## Important Notes

- Never use `redirect()` in try-catch blocks
- Always check wallet connection before Web3 operations
- Use loading skeletons for better UX
- Follow existing component patterns
- Test on multiple screen sizes
- Ensure proper meta tags for SEO