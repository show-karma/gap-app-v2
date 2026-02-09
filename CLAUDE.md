# AI Assistant Instructions - gap-app-v2

**Purpose**: Route AI assistants to the correct code and patterns. Nothing else.

**Project**: gap-app-v2 is the main frontend for the Grantee Accountability Protocol (GAP). It lets grant programs create projects, track milestones, and manage community reviews via EAS attestations on-chain. Part of a monorepo — see the parent repo's `CLAUDE.md` for cross-project guidance.

---

## Start Here

1. Understand the task type (UI component, hook, page, API integration, test)
2. Read only the docs you need from the table below
3. **DO NOT** read all docs at once (wastes context)

---

## Routing Table

| Task | What to Read |
|------|-------------|
| New page/route | `app/` directory structure, existing pages for patterns |
| New component | `components/` for shared, or `features/[name]/` for feature-specific |
| Data fetching | `hooks/` for React Query patterns, `utilities/` for API helpers |
| State management | `store/` for Zustand store patterns |
| Forms | Existing forms use React Hook Form + Zod (`@hookform/resolvers`) |
| Auth changes | `utilities/auth/`, Privy + Wagmi hooks |
| Web3/blockchain | `karma-gap-sdk` for EAS, Wagmi hooks for wallet interaction |
| Styling | TailwindCSS 3 + Tremor components, check existing similar components |
| Testing | `__tests__/` for Jest, `cypress/` for E2E |

---

## Project Structure

```text
app/                    # Next.js App Router routes
components/             # Shared React components
hooks/                  # Custom hooks (auth, query wrappers, domain-specific)
store/                  # Zustand stores (project, community, donationCart, modals)
utilities/              # Helpers (adapters, auth/TokenManager, chain handling, validation)
styles/                 # TailwindCSS globals + SCSS modules
__tests__/              # Jest unit/integration tests
cypress/                # E2E + component tests
```

---

## Key Patterns

- **Data Fetching**: React Query (`useQuery`/`useMutation`) + Axios
- **State**: Zustand stores for UI state (modals, selections, cart)
- **Components**: Client components (`"use client"`) with server component layouts
- **Forms**: React Hook Form + Zod schemas
- **Auth**: Privy OAuth + Wagmi account watching, TokenManager for persistent tokens
- **Web3**: Wagmi hooks, Safe wallets, EAS attestations via karma-gap-sdk
- **Styling**: TailwindCSS + Tremor (charts/data viz) + Radix UI (accessible primitives)
- **Linting**: Biome (line width 100, 2-space indent, no console.log)

---

## Commands

```bash
pnpm run dev            # Dev server with Turbopack (port 3000)
pnpm run build          # Production build
pnpm test               # Run Jest tests
pnpm test:watch         # Tests in watch mode
pnpm test:coverage      # Coverage report
pnpm lint:fix           # Biome lint + format
pnpm storybook          # Component docs
```

---

## Testing Requirements

- **Coverage target**: 70% (TDD recommended)
- **Unit/integration**: `__tests__/` using Jest + React Testing Library
- **E2E**: `cypress/` for critical user flows
- **A feature without tests is NOT complete** — bug fixes require regression tests
- Run `pnpm test` before pushing; `pnpm test:coverage` to check coverage

---

## Anti-Patterns

- Barrel exports (`index.ts` re-exports) - import directly from source files
- Business logic in components - extract to hooks or utilities
- Hardcoded chain IDs or addresses - use constants from `utilities/`
- `console.log` in committed code - Biome will flag it
- Skipping TypeScript strict mode - errors fail the build

---

## Git Rules

- **NEVER** mention Claude, AI, or any AI assistant in commit messages or PR descriptions
- Use conventional commits format
