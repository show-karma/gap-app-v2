# AGENTS.md - gap-app-v2

Purpose: give coding agents a concise, reliable operating guide for this repository.

## Scope

- Applies to the `gap-app-v2` repository.
- For cross-repo architecture, refer to the parent repository documentation when available.

## Project Context

- `gap-app-v2` is the main frontend for GAP (Grantee Accountability Protocol).
- Core flows: programs create projects, manage milestones, and review community progress.
- Web3 domain: EAS attestations, wallet interactions, and Privy-based authentication.

## Agent Workflow

1. Classify the task: route/page, component, hook, API integration, state, test, docs.
2. Read only the relevant folders and nearby examples.
3. Reuse established patterns before introducing new abstractions.
4. Implement the smallest complete change.
5. Add or update tests for behavior changes.
6. Run checks before handing off.

## Code Routing

- Routes/pages: `app/`
- Shared UI components: `components/`
- Feature code: `src/features/`
- Hooks and data fetching logic: `hooks/`
- State management: `store/`
- Utilities and adapters: `utilities/`
- Tests: `__tests__/` (unit/integration), `cypress/` (E2E/component)

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
pnpm dev
pnpm build
pnpm lint
pnpm lint:fix
pnpm test
pnpm test:coverage
pnpm e2e:headless
pnpm storybook
```

## Guardrails

- Do not add business logic directly in UI components when it belongs in hooks/utilities.
- Do not hardcode chain IDs, contract addresses, or auth configuration values.
- Do not introduce barrel exports for new modules.
- Avoid committed debug logging.
- Keep changes scoped; avoid unrelated refactors.

## Quality Gates (Definition of Done)

- Behavior is verified with tests (or existing tests updated for new expectations).
- `pnpm lint` and relevant tests pass locally.
- New code follows existing folder patterns and naming conventions.
- Documentation/comments are updated when behavior or developer workflow changes.

## PR Expectations

- Use Conventional Commits.
- Summarize problem, solution, and risks.
- Include test evidence (commands and results).
- Do not mention AI assistants in commits or PR descriptions.
