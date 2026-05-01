# AGENTS.md - gap-app-v2

Purpose: give coding agents a concise, reliable operating guide for the Karma frontend.

## Scope
- Applies to the `gap-app-v2` repository.
- For cross-repo architecture, package coordination, git rules, and shared standards, start with the parent `AGENTS.md` when available.

## Project Context
- `gap-app-v2` is the main frontend for Karma.
- Core flows: programs create projects, manage milestones, review community progress, and interact with Web3 attestations.
- Web3 domain: EAS attestations, wallet interactions, RainbowKit/Wagmi, and Privy-based authentication.

## Code Routing
Read only the relevant folder and nearby examples before editing.

| Task | Read |
| --- | --- |
| Page or route | Existing routes in `app/` |
| New route | Existing route folder patterns, including `page.tsx`, `loading.tsx`, and `error.tsx` |
| Shared component | `components/` |
| Feature-specific code | `src/features/[feature]/` |
| Data fetching | `hooks/` and existing React Query usage |
| State | `store/` and existing Zustand slices |
| Forms | Existing React Hook Form + Zod forms |
| Auth | `utilities/auth/` plus the auth notes below |
| RBAC | Permission providers and the RBAC notes below |
| Deletions | `components/DeleteDialog.tsx` |
| Clipboard | `hooks/useCopyToClipboard.ts` |
| Tests | Existing specs in `__tests__/` and E2E specs in `e2e/` |

## Agent Workflow
1. Classify the task: route/page, component, hook, API integration, state, test, docs, or design.
2. Read nearby examples and reuse established patterns before adding abstractions.
3. Implement the smallest complete change.
4. Add or update tests for behavior changes.
5. Run the narrowest relevant checks before handing off, plus broader checks when the change has shared impact.

## Technical Standards
- Language: TypeScript.
- Framework: Next.js App Router.
- Data fetching: React Query + Axios.
- Forms: React Hook Form + Zod.
- State: Zustand.
- Styling: TailwindCSS + Tremor + Radix UI primitives.
- Lint/format: Biome (`lineWidth: 100`, 2-space indentation).

## Commands

```bash
pnpm dev                 # Next.js dev server on :3000
pnpm build               # Widget build + Next.js production build
pnpm lint                # Biome check
pnpm lint:fix            # Biome check + write fixes
pnpm test                # Vitest unit project
pnpm test:unit           # Unit tests only
pnpm test:integration    # Integration tests
pnpm test:coverage       # Coverage report
pnpm e2e:pw              # Playwright E2E with auth bypass
pnpm e2e:smoke           # Playwright smoke tests
pnpm storybook           # Storybook on :6006
```

## Non-Obvious Rules
- Mutations must use React Query `useMutation` with appropriate optimistic updates or invalidation; do not combine local `useState` with direct service calls for server mutations.
- Every data-fetching component renders loading, empty, and error states. Do not `return null` for these states.
- Use `PAGES` constants from `utilities/pages.ts` for internal routes instead of hardcoded strings.
- Every new `app/` route should include `page.tsx`, `loading.tsx`, and `error.tsx` unless an existing colocated pattern clearly says otherwise.
- Any file importing `@radix-ui/*` or interactive client primitives needs a `"use client"` directive.
- Import directly from source files. Do not add new barrel exports; existing barrel exports in `types/`, `store/`, and `utilities/sdk/` are legacy.
- Heavy chart, editor, markdown, visualization, or analytics libraries must use `dynamic()` or lazy `import()`, not top-level imports in common paths.
- When adding Zustand state properties, update `initialState` as well; `reset()` depends on it.
- Use `<DeleteDialog>` for destructive actions; do not use raw `confirm()`.
- Use `useCopyToClipboard`; do not call `navigator.clipboard` directly without the shared error handling.
- Avoid committed `console.log`, `console.debug`, or `console.warn`.

## Auth Gotchas
- Privy and Wagmi initialize independently. During startup, `isConnected=false` can briefly coexist with `authenticated=true`.
- Do not call `login()` or `logout()` in an effect that depends on combined Privy/Wagmi auth state; this can create sign-out loops.
- Do not hardcode auth config values, chain IDs, contract addresses, or wallet assumptions when constants/env helpers exist.

## RBAC
- Global permissions from `PermissionsProvider`, such as `isStaff` and `isGuestDueToError`, are broadly available.
- Context-specific permissions from `PermissionProvider`, such as `isReviewer` and `isCommunityAdmin`, are only valid inside community-scoped layouts with `communityId`.
- Cross-community pages should detect roles from data, such as `useReviewerPrograms()`, `useDashboardAdmin()`, or `fetchMyProjects()`, instead of relying on context-specific RBAC flags.

## Testing Patterns
- Tests use Vitest/Jest-compatible APIs and React Testing Library. Follow existing examples in `__tests__/`.
- Use mock factories with override support, such as `createMockProgram(overrides)`.
- Clear mocks in `beforeEach`; clear shared `QueryClient` state in `afterEach` when used.
- Wrap hooks in `QueryClientProvider` via `renderHook` when testing React Query hooks.
- Use `waitFor(() => expect(...))` for async assertions.
- Prefer separate coverage for loading, success, empty, and error states when testing data components.

## Quality Gates
- Behavior is verified with tests, or existing tests are updated for new expectations.
- `pnpm lint` and relevant tests pass locally when feasible.
- New code follows existing folder patterns, naming conventions, and import style.
- UI changes account for loading, empty, error, disabled, and mobile states where relevant.
- Documentation or comments are updated when behavior or developer workflow changes.

## PR Expectations
- Use Conventional Commits.
- Summarize problem, solution, risks, and test evidence.
- Include screenshots or short recordings for meaningful UI work.
- Do not mention AI assistants in commits or PR descriptions.
