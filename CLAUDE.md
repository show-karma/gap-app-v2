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
| New component | `components/` for shared, or `src/features/[name]/` for feature-specific |
| Data fetching | `hooks/` for React Query patterns, `utilities/` for API helpers |
| State management | `store/` for Zustand store patterns |
| Forms | Existing forms use React Hook Form + Zod (`@hookform/resolvers`) |
| Auth changes | `utilities/auth/`, Privy + Wagmi hooks, see **Auth Architecture** below |
| Permissions / RBAC | See **Authorization / RBAC** below — read before using any permission hook |
| Web3/blockchain | `karma-gap-sdk` for EAS, Wagmi hooks for wallet interaction |
| Styling | TailwindCSS 3 + Tremor components, check existing similar components |
| Testing | `__tests__/` for Jest, `cypress/` for E2E |

---

## Project Structure

```text
app/                    # Next.js App Router routes
components/             # Shared React components
src/features/           # Feature-specific domain modules
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

## Authorization / RBAC

### Two-Tier Permission System

1. **Global PermissionsProvider** (`components/Utilities/PermissionsProvider.tsx`)
   - Mounted in root layout, always available
   - Provides: `isStaff`, `isGuestDueToError`
   - Does NOT provide community-specific roles

2. **Context-Specific PermissionProvider** (`src/core/rbac/context/permission-context.tsx`)
   - ONLY mounted inside community-scoped layouts (e.g., `/community/[communityId]/manage/`)
   - Provides: `isReviewer`, `isCommunityAdmin`, `isProjectOwner`
   - **Requires a communityId resource context** to return meaningful results
   - Without communityId, all role flags default to `false`

### Cross-Community Pages (Dashboard, Profile, etc.)

For pages that aggregate data across all communities, do NOT rely on `usePermissionContext()` for role detection. Instead, detect roles from data:

- **Reviewer**: `useReviewerPrograms()` from `hooks/usePermissions.ts` (calls `/v2/funding-program-configs/my-reviewer-programs`)
- **Admin**: `useDashboardAdmin()` from `hooks/useDashboardAdmin.ts` (calls `/v2/user/communities/admin`)
- **Project Owner**: Query user's projects directly via `fetchMyProjects()`
- **Super Admin**: `usePermissionContext().isStaff` (this one IS global)

Show sections based on whether the data query returns results, not RBAC flags.

---

## Auth Architecture

### Privy + Wagmi Initialization Race Condition

During page load, Privy and Wagmi initialize independently:
1. Privy loads first: `ready=true, authenticated=true`
2. Wagmi still connecting: `isConnected=false` (briefly)
3. `useAuth` hook combines both: `authenticated = isConnected && privyAuthenticated`

**NEVER call `login()` or `logout()` in a useEffect that depends on the combined auth state.** During the initialization gap, auth state is temporarily inconsistent and will cause sign-out loops.

### Protected Routes Pattern

- Middleware handles redirect to login for unauthenticated users
- Components should show a loading state until `ready` is true
- Never programmatically trigger login/logout based on race-prone combined state

### Theming (CSS Variables)

This project uses shadcn/ui with HSL-based CSS custom properties in `styles/globals.css`. Every color token has a paired `-foreground` variable for text contrast (e.g., `--primary` / `--primary-foreground`, `--destructive` / `--destructive-foreground`). When using semantic color variants, verify the foreground provides sufficient contrast in both light and dark modes.

---

## Route Constants

All app routes are defined in `utilities/pages.ts` as the `PAGES` constant. Key routes:

- `PAGES.DASHBOARD` — User dashboard (`/dashboard`)
- `PAGES.PROJECT.OVERVIEW(slug)` — Project detail page
- `PAGES.REGISTRY.ROOT` — Funding map / program explorer (`/funding-map`)
- `PAGES.REVIEWER.DASHBOARD(slug)` — Reviewer dashboard for a community
- `PAGES.ADMIN.ROOT(communityId)` — Community admin panel
- `PAGES.ADMIN.MILESTONES(communityId)` — Milestone management

**Always use PAGES constants for navigation. Never hardcode route strings.**

---

## Required Files for New Routes

Every new route under `app/` MUST include:

1. `page.tsx` — The page component
2. `loading.tsx` — Loading skeleton (shown during Suspense)
3. `error.tsx` — Error boundary with retry button and "Go home" link

### Error State Requirements

Every data-fetching section MUST handle 3 states:
1. **Loading** — skeleton placeholder
2. **Empty** — helpful message + action (e.g., "Create your first project")
3. **Error** — error message + retry button

**Never return `null` on error.** Always show a user-visible error state with a retry mechanism.

---

## Dev Server Notes

The dev server uses Turbopack (`pnpm run dev`). It can occasionally crash during large file rewrites or rapid successive changes. **If the page goes blank after changes:** check if the dev server is still responding (`curl http://localhost:3000`). If empty response, restart with `pnpm run dev`.

---

## Anti-Patterns

- Barrel exports (`index.ts` re-exports) - import directly from source files
- Business logic in components - extract to hooks or utilities
- Hardcoded chain IDs or addresses - use constants from `utilities/`
- `console.log` in committed code - Biome will flag it
- Skipping TypeScript strict mode - errors fail the build
- `document.querySelector` to click elements in other components - renders dialog/component directly instead
- `router` from `useRouter()` in useEffect dependency arrays - it's a new object every render, causes infinite loops
- `usePermissionContext()` outside community-scoped layouts - use data-driven role detection (see RBAC section)
- Returning `null` on data fetch error - always show an error state with retry
- Unhandled singular/plural: always use `count === 1 ? "item" : "items"` for dynamic counts

---

## Git Rules

- **NEVER** mention Claude, AI, or any AI assistant in commit messages or PR descriptions
- Use conventional commits format
