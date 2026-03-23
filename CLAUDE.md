# gap-app-v2 — AI Instructions

Next.js frontend for Karma. Parent `CLAUDE.md` has testing targets, git rules, and pre-PR checklist — don't duplicate here.

## Routing Table

| Task | Read |
|------|------|
| Page/route | Existing pages in `app/` for patterns |
| Component | `components/` (shared), `src/features/[name]/` (feature-specific) |
| Data fetching | `hooks/` for React Query patterns |
| State | `store/` for Zustand patterns |
| Forms | Existing forms (React Hook Form + Zod) |
| Auth | **Auth Gotchas** below, then `utilities/auth/` |
| RBAC | **RBAC** below — read before any permission hook |
| Tests | `__tests__/` — see **Testing** below for patterns |
| Deletions | Use `<DeleteDialog>` from `components/DeleteDialog.tsx`, never raw `confirm()` |
| Clipboard | Use `useCopyToClipboard` from `hooks/useCopyToClipboard.ts`, never raw `navigator.clipboard` |

## Commands

```bash
pnpm run dev            # Dev server (port 3000)
pnpm test               # All tests
pnpm test:unit          # Unit tests only
pnpm test:coverage      # Coverage report
pnpm lint:fix           # Biome lint + format
```

## Non-Obvious Rules (will cause bugs if ignored)

- **Mutations**: Always `useMutation` with optimistic updates — never `useState` + direct service calls.
- **Three States**: Every data component renders loading (skeleton), empty (CTA), error (retry). Never `return null`.
- **Routes**: `PAGES` constants from `utilities/pages.ts` — never hardcode strings.
- **New routes**: Every `app/` route needs `page.tsx` + `loading.tsx` + `error.tsx`.
- **`"use client"`**: Required on any file importing `@radix-ui/*`.
- **No barrel exports**: Import directly from source files, not `index.ts` re-exports. Existing barrel exports in `types/`, `store/`, `utilities/sdk/` are legacy — don't add new ones.
- **Heavy libs**: Must use `dynamic()` or lazy `import()` — never top-level import of chart/editor/markdown libs.
- **Zustand resets**: When adding state properties, update `initialState` too — `reset()` spreads it and will miss new fields.

## Auth Gotchas

Privy and Wagmi initialize independently. During startup, `isConnected=false` while `authenticated=true` briefly. **NEVER** `login()`/`logout()` in useEffect depending on combined auth state — causes sign-out loops.

## RBAC

Two tiers:
1. **Global** (`PermissionsProvider`): `isStaff`, `isGuestDueToError` — always available
2. **Context-specific** (`PermissionProvider`): `isReviewer`, `isCommunityAdmin` — ONLY inside community-scoped layouts with `communityId`

Cross-community pages: detect roles from data (`useReviewerPrograms()`, `useDashboardAdmin()`, `fetchMyProjects()`), not RBAC flags.

## Testing Patterns

Tests use Jest + RTL. Follow these established patterns (see `__tests__/` for examples):
- Mock factories with override support: `createMockProgram(overrides)`
- `jest.clearAllMocks()` in `beforeEach`, `queryClient.clear()` in `afterEach`
- Wrap hooks in `QueryClientProvider` via `renderHook`
- `waitFor(() => expect(...))` for async
- Separate `describe` blocks for loading, success, empty, and error states

## Enforcement (automated — don't repeat in code review)

Hooks auto-check on every file edit: Biome lint, `return null` in data components, missing `useMutation`, Radix without `"use client"`, hardcoded routes/colors, barrel exports, heavy imports. Pre-commit hook runs tests. CI bot comments anti-pattern violations on PRs.
