---
name: qa-plan-generator
description: Analyze a PR diff and generate a strict, risk-prioritized QA test plan for frontend changes. Separates public scenarios from authenticated scenarios. Both run in CI using Privy test accounts for auth.
---

# QA Plan Generator (Frontend)

Generate a strict, risk-prioritized QA test plan from a PR diff. You are a senior QA engineer who has seen production incidents. No fluff. No optimism. Assume everything can break.

## Inputs

| Parameter | Source |
|-----------|--------|
| PR number | `$PR_NUMBER` env var |
| Deployment URL | `$PREVIEW_URL` env var |
| Base branch | `origin/main` |

## Process

### 1. Analyze the Diff

```bash
git diff origin/main...HEAD --name-only
git diff origin/main...HEAD --stat
git diff origin/main...HEAD
```

### 2. Categorize Changes

Classify every changed file into exactly one category:

| Category | Pattern | Risk Weight |
|----------|---------|-------------|
| Pages/Routes | `app/**/*.tsx` | High |
| Data mutations | `hooks/use*Mutation*`, `services/*`, `store/*` | Critical |
| Forms | `*Form*`, `*form*`, React Hook Form usage | High |
| Auth/RBAC | `utilities/auth/*`, `PermissionsProvider`, `usePrivy` | Critical |
| Components (interactive) | Components with `onClick`, `onChange`, `onSubmit` | Medium |
| Components (display) | Pure display components | Low |
| Hooks (data fetching) | `hooks/use*Query*`, React Query hooks | High |
| Hooks (state) | Zustand stores, `useState` wrappers | Medium |
| Utilities | Pure functions, helpers | Low |
| Config/types | Type definitions, constants, config | Low |

### 3. Classify Public vs Authenticated

Every page/component must be classified as **public** or **authenticated**:

**Public** (no login needed):
- Landing pages, explore/discover pages
- Public project profiles, public grant pages
- Static pages (about, FAQ, docs)
- Any page accessible without logging in
- Components that render in unauthenticated state

**Authenticated** (requires Privy login via test account):
- Dashboard pages, admin panels
- Project management (create, edit, delete)
- Grant applications, milestone submissions
- User profile, settings
- Any page behind `PermissionsProvider` or that checks `isProjectOwner`, `isProjectAdmin`, `isReviewer`, `isCommunityAdmin`
- Any page that requires wallet connection
- Any mutation that requires authentication
- RBAC-gated actions (approve, reject, manage members)

Both types run in CI. Authentication uses Privy test accounts with a fixed OTP code — no domain restrictions apply.

### 4. Generate Scenarios

Generate two separate scenario lists: **PUBLIC** and **AUTHENTICATED**.

**For each scenario, specify:**

| Field | Required |
|-------|----------|
| Scenario name | Yes — imperative verb + what to test |
| Steps | Yes — numbered, concrete actions |
| Expected result | Yes — exact observable outcome |
| Risk | Yes — `Critical` / `High` / `Med` / `Low` |

**Rules for scenario generation:**
- Data mutations (create, update, delete) are always Critical risk and always Authenticated
- Auth boundary changes are always Critical risk and always Authenticated
- Every form must test: valid submission, empty submission, invalid input, server error response
- Every page must test: loading state, data loaded state, empty state, error state
- Every interactive component must test: click/hover/focus behavior, disabled state
- If a React Query hook changed: test cache invalidation, refetch behavior, stale data
- If a Zustand store changed: test state reset, cross-component state sync
- If a route changed: test navigation, deep linking, back button
- Public pages that show different content when logged in: test the unauthenticated view as Public, the authenticated view as Authenticated

### 5. Identify Edge Cases

For each changed area, list edge cases:
- What happens with no data?
- What happens with maximum data (100+ items)?
- What happens on mobile viewport?
- What happens if the API returns 500?
- What happens if the user navigates away mid-action?
- What happens with special characters in inputs?

### 6. Output

Save the plan to `qa-plan.md` in the workspace root with this structure:

```markdown
# QA Plan — PR #XXX

## Changed Areas
- [list]

## Public Scenarios (no login)

| # | Scenario | Risk | Steps | Expected |
|---|----------|------|-------|----------|
| P1 | [description] | High | 1. ... 2. ... | [expected] |

## Authenticated Scenarios (Privy test account login)

| # | Scenario | Risk | Steps | Expected |
|---|----------|------|-------|----------|
| A1 | [description] | Critical | 1. ... 2. ... | [expected] |

## Edge Cases
- [list]
```

Post a PR comment. **Comment format — follow exactly:**

```markdown
## QA Plan (1/3)

**Changed**: [comma-separated list of changed areas]
**Scenarios**: X public + Y authenticated = Z total

### Public (no login)

| # | Scenario | Risk |
|---|----------|------|
| P1 | [description] | High/Med/Low |

### Authenticated (Privy test account)

| # | Scenario | Risk |
|---|----------|------|
| A1 | [description] | Critical/High/Med/Low |

**Edge Cases**
- [list]
```

**Rules for the comment:**
- No prose. No explanations. No "this tests..." preamble.
- Table rows only. One scenario per row.
- Sort by risk: Critical first, then High, Med, Low.
- Maximum 15 public + 10 private scenarios. Prioritize by risk, drop Low.
- Edge cases as a flat bullet list. Maximum 10.
- If the PR only touches public pages, the Authenticated section should say "None — all changes are public."
- If the PR only touches authenticated pages, the Public section should say "None — all changes require auth."

## Quality Bar

- If the PR touches data mutations, there MUST be Authenticated scenarios for: create, error on create, duplicate detection, concurrent edit.
- If the PR touches auth, there MUST be Authenticated scenarios for: logged out access, wrong role access, session expiry.
- If the PR touches forms on authenticated pages, there MUST be Authenticated scenarios for: valid submit, empty submit, invalid input, server rejection.
- If the PR touches public display, there MUST be Public scenarios for: visual rendering, responsive layout, empty state.
- If the PR only touches display components with no interactivity, generate minimal Public scenarios (visual check + responsive).
