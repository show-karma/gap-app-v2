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
- **Attestation gating**: wagmi `useAccount().address` is **display/recipient-only** — it lags the Privy signer behind the dual-`WagmiProvider` bridge, so gating a write on it (`if (!address) return`) silently no-ops (issue #1821). Gate attestation submits on `signerStatus`/`attestationAddress` from `useSetupChainAndWallet`. Use `useAttestation()` (hooks/useAttestation.ts) + `<AttestationSubmit>` (components/ui/AttestationSubmit.tsx): they throw a typed `SignerUnavailableError` (routed to guidance, kept out of Sentry) and render a Connect-wallet CTA / disabled+tooltip instead of failing silently.
- **Three States**: Every data component renders loading (skeleton), empty (CTA), error (retry). Never `return null`.
- **Routes**: `PAGES` constants from `utilities/pages.ts` — never hardcode strings.
- **New routes**: Every `app/` route needs `page.tsx` + `error.tsx`, and non-crawlable routes also need `loading.tsx`. EXCEPTION (DEV-612): sitemap-crawlable routes must have NO `loading.tsx` anywhere on their segment chain — every route renders dynamically (root layout awaits `headers()`), so a loading boundary makes Next stream the page HTML as a hidden Suspense chunk (`<div hidden id="S:n">`) and no-JS readers (most AI crawlers) see only the fallback. Enforced by `__tests__/app/route-file-structure.test.ts` (`SITEMAP_NO_LOADING`).
- **`"use client"`**: Required on any file importing `@radix-ui/*`.
- **No barrel exports**: Import directly from source files, not `index.ts` re-exports. Existing barrel exports in `types/`, `store/`, `utilities/sdk/` are legacy — don't add new ones.
- **Heavy libs**: Must use `dynamic()` or lazy `import()` — never top-level import of chart/editor/markdown libs.
- **Zustand resets**: When adding state properties, update `initialState` too — `reset()` spreads it and will miss new fields.
- **Pluralization**: Any dynamic count rendered next to a noun MUST use the `pluralize` library (`pluralize("team", count)`). No manual ternaries, no hardcoded plural-only nouns. Strings like `"1 teams"`, `"0 apply"`, `"1 days left"` are bugs.
- **Empty-state conditional rendering**: UI blocks tied to a count or array (e.g. "Closing this week — N apply before deadline") must be hidden entirely when the count is 0. Don't render "0 …" copy.
- **URL-synced filter state**: Must use nuqs `useQueryState` (see `hooks/useProjectFilters.ts` / `hooks/useFundingProgramFilters.ts`). NEVER mirror component state into the URL with `router.push`/`router.replace` inside a `useEffect` — it dispatches App Router navigations that race and cancel in-flight `<Link>` clicks (issue #1547) and spams the history stack.
- **Authorization is tri-state, not boolean**: Gate auth-sensitive UI through a tri-state hook that returns `{ isAuthorized, isLoading }` (e.g. `useProjectAuthorization`). Render a skeleton while `isLoading`, never the authorized controls or a denial. Specifically:
  - Never read `useOwnerStore.isOwner` without `isOwnerLoading`.
  - For authorization-resolved decisions, never use a query's `isLoading` when that query can be disabled — a disabled React Query v5 query reports `isLoading=false` while still undecided. Use `isPending`-aware composition (`isResolving`).
  - Never enable an admin-gated fetch from bare/optimistic store booleans — gate on *resolved* authorization (`isAuthorized && !isLoading`). Project-store permission flags are global and go stale across project navigations.
  - Treat an expected admin denial (HTTP 403) as data (return `null`), not an error — don't log it to `console`/`errorManager`.
  - Never pair a `useEffect` redirect with an `AccessDenied` render for the same condition — the redirect makes the denial unreachable. Render the denial as a terminal state.
  - Never gate denial UI on wagmi `isConnected` — use Privy `ready`/`authenticated` (the two initialize independently at startup).

## Auth Gotchas

Privy and Wagmi initialize independently. During startup, `isConnected=false` while `authenticated=true` briefly. **NEVER** `login()`/`logout()` in useEffect depending on combined auth state — causes sign-out loops.

## RBAC

Two tiers:
1. **Global** (`PermissionsProvider`): `isStaff`, `isGuestDueToError` — always available
2. **Context-specific** (`PermissionProvider`): `isReviewer`, `isCommunityAdmin` — ONLY inside community-scoped layouts with `communityId`

Cross-community pages: detect roles from data (`useReviewerPrograms()`, `useDashboardAdmin()`, `fetchMyProjects()`), not RBAC flags.

## Testing Patterns

Tests use Vitest + RTL. Follow these established patterns (see `__tests__/` for examples):
- Mock factories with override support: `createMockProgram(overrides)`
- `vi.clearAllMocks()` in `beforeEach`, `queryClient.clear()` in `afterEach`
- Wrap hooks in `QueryClientProvider` via `renderHook`
- `waitFor(() => expect(...))` for async
- Separate `describe` blocks for loading, success, empty, and error states

## Enforcement (automated — don't repeat in code review)

Enforcement is layered:

- **Claude edit hook** (`.claude/hooks/post-edit-antipatterns.sh`) — semantic/absence checks, on every agent edit: `return null` in data components, missing `useMutation`, `useRouter`/`useParams` in `useEffect` deps, raw `navigator.clipboard`.
- **Biome** — lint/format. **Pre-commit** also runs tests. **CI bot** comments anti-pattern violations on PRs.
- **Design system** (`pnpm design:check`) — see below.

Don't repeat any of the above in code review — it's automated.

### Design system (`pnpm design:check`)

`scripts/check-design-system.js` blocks design-system deviations **on the lines a change adds**. Legacy debt in a file you merely touch never blocks you — locally, in pre-commit, or in CI.

| ID | Sev | Detects | Not a violation |
|----|-----|---------|-----------------|
| DS001 `arbitrary-color-class` | error | `bg-[#123456]`, `text-[rgb(20,30,40)]`, `shadow-[…rgba(…)…]`, `oklch(…)` | `bg-[rgb(var(--x))]`, `bg-[var(--x)]`, `bg-[hsl(var(--x)/0.5)]`, palette classes |
| DS002 `raw-color-literal` | error | `#hex` (3/4/6/8 digits) / `rgb[a](digits)` / `hsl[a](digits)` / `oklch(digits)` / `oklab(digits)` in strings, templates, JSX attributes — **including** the value of a `--custom-prop` key, which DS003 skips | comments, `url(#clip)`, `href="#top"`, anything inside `var(…)`, `components/Icons/**` |
| DS003 `inline-style-literal` | error | a literal colour, size or font on a visual key: `color`, `background*`, `border*`, `outline*`, `fill`, `stroke`, `boxShadow`, `textShadow`, `caretColor`, `accentColor`, `textDecorationColor`, `columnRuleColor`, `fontSize`, `fontFamily`. Named CSS colours (`"white"`) count | `var(…)` values, expressions, `--custom-prop` keys (DS002 still checks the value), CSS-wide keywords (`none`, `inherit`, `transparent`, `currentColor`, `auto`), layout keys (`width`, `zIndex`, `transform`), and **any file that imports `next/og` or `@vercel/og`** or matches `inlineStyleExemptGlobs` — Satori renders inline styles only |
| DS004 `important-prefix` | error | `!bg-red-500`, `hover:!p-2` | `!selected && …` (not a string), `"Hello!"` |
| DS005 `raw-primitive` | error | `<button>`, `<input>`, `<select>`, `<textarea>` outside `components/ui/**` | `<input type="hidden">` only — `type="file"` is **not** exempt, `components/ui/input.tsx` already styles `file:` pseudo-elements |
| DS006 `arbitrary-scale` | warn | spacing and typography only: `p*`/`m*`, `gap*`, `space-x/y`, `text` (size), `leading`, `tracking`, `rounded*`, `indent` — e.g. `p-[13px]`, `text-[15px]`, `tracking-[0.14em]` | **every sizing utility** (`w`, `h`, `min-*`, `max-*`, `size`, `basis`, `inset`, `top/right/bottom/left`, `translate`) — a layout dimension is legitimately arbitrary — plus `calc(…)`, `var(--x)`, `z-[…]`, `grid-cols-[…]`, and the `scaleDefinitionFiles` |
| DS007 `css-color-literal` | error | `#hex` / `rgb[a]()` / `hsl[a]()` / **`oklch()`** / `oklab()` with numeric arguments in `.css` / `.scss` | `var(…)`, `rgb(var(--x))`, comments, id selectors (`#app {`), the token-definition files, and every path in the shared exclude list (`src/stories/**` included) |
| DS000 `bad-waiver` | error | waiver with no rule id, a reason under 10 characters, or no matching finding on the next line | — |

Precedence dedupes the *same* defect only: a colour literal is reported once (DS001 > DS002, DS003 > DS002). Two different defects on one candidate are both reported — `!bg-[#123456]` yields DS004 **and** DS001.

Each mode reads the revision its line numbers belong to: `--staged` scans the **index** blob (`git show :<path>`), `--changed` scans **HEAD**, `--worktree` scans the working copy. So staging a fix, or editing on after `git add`, never shifts a finding onto the wrong line.

Token consumption is always allowed — Tailwind theme classes and `var(--x)` / `rgb(var(--x))` / `hsl(var(--x))` anywhere. Every exemption lives in `scripts/design-check.config.json` and is rule-scoped, never file-wide:

| Config key | Exempts | From |
|---|---|---|
| `tokenDefinitionFiles` | the files that *define* the palette (`tailwind.config.js`, `src/infrastructure/theme/config.ts`, `styles/globals.css`, `styles/__theme_colors.scss`, `dashboard-soft.css`, `utilities/whitelabel-config.ts`) | DS001, DS002, DS003, DS007 |
| `scaleDefinitionFiles` | the files that *define* the spacing/type scale | DS006 only |
| `iconGlobs` (`components/Icons/**`) | SVG path fills — assets, not tokens | DS002 only |
| `primitiveExemptGlobs` (`components/ui/**`) | the shadcn primitives themselves | DS005 only |
| `inlineStyleExemptGlobs` + `inlineStyleExemptImports` | `next/og` / `@vercel/og` image routes, where Satori supports inline styles only | DS003 only |

Legacy debt is **not** exempted — `styles/non-profits-landing.css` keeps its 84 DS007 findings on purpose. The added-lines gate means they never block you; the baseline stops them growing. Scan roots are the Tailwind `content` globs plus `utilities/**`, `hooks/**`, `services/**`, `store/**` and `widget/**` (the widget ships through `pnpm build:widget`), plus every `.css`/`.scss`. MDX is out of scope in v1.

```bash
pnpm design:check                          # whole repo, exit 1 on errors
pnpm design:check --report                 # whole repo, never exit 1
pnpm design:check --changed --base origin/main   # lines added by base...HEAD (three-dot)
pnpm design:check --staged                 # lines added in the index (what pre-commit runs)
pnpm design:check --worktree path/to/File.tsx    # lines added vs HEAD (what the edit hook runs)
pnpm design:check --files a.tsx b.scss     # whole-file, report-only debugging aid
pnpm design:check --report --json          # { mode, base, summary, findings }
```

Exit `2` means the checker **failed closed** — an unresolvable base, no merge base, or a crash. It never reports "0 findings" when it could not do its job.

**Waivers.** Put `// design-check-ignore: DS00X <reason of 10+ characters>` (or `{/* … */}`) on the line directly above the violation. One comment may cover several rules — `DS001,DS004` — because a single candidate can carry more than one defect (`!bg-[#123456]` is both an `!important` override and a colour literal, and is reported as **two** findings; precedence only dedupes the *same* defect). Every listed id must match a finding on the next line, or it is a DS000 orphan.

Waived findings still appear in the PR comment, and every waiver a PR adds must have a matching entry under a `## Review waivers` heading in the PR description — **one line per waiver comment, not one line per rule**, carrying the same comma-joined id set:

```
## Review waivers

- DS001 components/Foo.tsx:12 — tenant-supplied brand swatch, migration tracked in DEV-999
- DS001,DS004 src/features/x/y.tsx:42 — forced over a vendor stylesheet we do not control
```

Format: `- <ids> <path>:<line> — <reason>`, where `<line>` is the **violation** line (not the waiver comment's), `<ids>` is comma-joined (order does not matter), and `<reason>` is 10+ characters. A missing section, a missing entry, a partial id set, a split one-line-per-rule entry, a short reason, or a stale entry all fail the check.

**Refreshing the repo-wide snapshot.** `quality-baseline.json` holds a per-rule count under `violations.design`. Never hand-edit it: run `pnpm quality --update-baseline=design` (≈3 s — it skips every other collector) and land the change on a PR labelled `quality-baseline`, which is what `quality-gate.yml` requires to let the file change.
