# Codex Instructions For gap-app-v2

This is the Karma Next.js frontend. Read this file and `CLAUDE.md` before
editing frontend code.

## Required Patterns

- Use existing pages/components/hooks as the source of truth for local patterns.
- Data-fetching UI must render loading, empty, and error states. Do not
  `return null` from a data component.
- Mutations must use React Query `useMutation` and the established optimistic
  update/cache invalidation patterns. Do not combine local `useState` with
  direct service calls for mutations.
- Use `PAGES` from `utilities/pages.ts` for internal routes.
- Use `useCopyToClipboard` from `hooks/useCopyToClipboard.ts`; do not call
  `navigator.clipboard` directly.
- Use `<DeleteDialog>` from `components/DeleteDialog.tsx`; do not use
  `confirm()`.
- Add `"use client"` to any component importing Radix/interactive client-only
  primitives.
- Do not add new barrel exports. Import directly from source files.
- Lazy-load heavy chart/editor/markdown/PDF/code libraries.
- Dynamic counts must use the `pluralize` library, not manual plural ternaries.
- Hide count-based UI blocks when the count is `0` instead of rendering "0 ..."
  copy.
- Authorization-sensitive UI must use tri-state authorization with loading
  handling; do not render controls or denial UI while permission is unresolved.

## Codex Manual Hook Checks

Claude runs `.claude/hooks/post-edit-lint.sh` and
`.claude/hooks/post-edit-antipatterns.sh`; Codex does not. After frontend edits:

1. Run `pnpm lint:fix` when practical.
2. Check changed TS/TSX files for the anti-patterns listed in the root
   `AGENTS.md` frontend section.
3. Run focused tests for changed behavior; use `pnpm test` or
   `pnpm test:unit` when the change is broad.

## Commands

```bash
pnpm run dev
pnpm test
pnpm test:unit
pnpm test:coverage
pnpm lint:fix
```

