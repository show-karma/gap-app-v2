# DEV-557 — Static design check

Linear: https://linear.app/showkarma/issue/DEV-557/static-design-check
Branch: `amaury/dev-557-static-design-check` (gap-app-v2, off `origin/main`)
Status: APPROVED (v3) — Rival round 1 REJECT → v2 → round 2 APPROVE-WITH-CHANGES; all six mandatory changes incorporated below. Implementation may start.

## 1. Requirements

**Problem.** Nothing machine-checks that new UI code stays inside the design system. Biome has no
color/token-aware rules, `scripts/check-anti-patterns.sh` only catches `style=...#hex`, and its
CI job (`pr-checklist.yml`) is informational — it never fails. ~424 `.tsx` files already contain
raw hex / arbitrary Tailwind values / inline styles, so a repo-wide hard fail is impossible.

**Goal.** A deterministic static check (`design:check`) that:

1. **Blocks** a PR when the *lines it adds* introduce a design-system violation (error rules).
2. **Reports** softer deviations (warn rules) in the "Quality Checklist" PR comment.
3. **Tracks** repo-wide per-rule counts in `quality-gate.js` so a PR cannot regress the committed
   snapshot (same semantics as the existing Biome/Knip counters — see §8 for what this does and
   does not guarantee).
4. Applies the **same added-lines semantics** locally (pre-commit, Claude post-edit hook) and in CI.
   Legacy debt in a file you merely touch never blocks you anywhere.
5. Has a reason-required, reviewer-visible escape hatch.

**Non-goals (v1).** Visual/pixel diffing; Storybook coverage; banning Tailwind's default palette
(`text-gray-500`); Biome/GritQL plugin; changes to gap-indexer / karma-gap-sdk; rewriting the
examples in `docs/standards/ui-ux-best-practices.md`; touching `quality-baseline.schema.json`
(missing today — separate cleanup).

## 2. What counts as "the design system"

- **Token consumption (always allowed):** Tailwind classes from `tailwind.config.js` (`brand.*`,
  `sf.*`, `primary.*`, `warning.*`, default palette), and CSS variables — `var(--x)`,
  `rgb(var(--x))`, `hsl(var(--x))` — in classes, `style`, or CSS. This is the whitelabel mechanism
  (`tailwind.config.js:269-281`, `.impeccable.md`, `src/features/ask-karma/components/flying-chip.tsx:77-79`).
- **Token definition files (literals allowed here only):** `tailwind.config.js`,
  `src/infrastructure/theme/config.ts`, `styles/globals.css`, `styles/__theme_colors.scss`,
  `components/Pages/Dashboard/v3/dashboard-soft.css`. Listed explicitly in
  `scripts/design-check.config.json` under `tokenDefinitionFiles`.
- **Primitives:** `components/ui/*` (shadcn). Raw `<button|input|select|textarea>` elsewhere is a
  deviation.

## 3. Rules (v1)

Scanned sources: `**/*.{ts,tsx,js,jsx}` matching `tailwind.config.js` `content` globs
(`app/`, `pages/`, `components/`, `src/`), plus `**/*.{css,scss}` for DS007. **MDX is out of v1
scope** (TypeScript's parser is not an MDX parser; `src/stories/Configure.mdx` fails to parse as
TSX) — tracked as a follow-up. Excluded: `node_modules`, `.next`, `__tests__/**`, `__mocks__/**`,
`*.stories.*`, `src/stories/**`, `.storybook/**`, `scripts/**`, `*.d.ts`, `components/Icons/**`
(SVG assets — DS002 only), and `tokenDefinitionFiles` (DS001/2/3/7 only).

| ID | Severity | Detects | Not a violation |
|----|----------|---------|-----------------|
| DS001 `arbitrary-color-class` | error | Tailwind candidate `<util>-[<literal color>]` where util ∈ `bg,text,border,ring,fill,stroke,from,via,to,outline,shadow,accent,caret,decoration,divide,placeholder` and literal is `#hex`, `rgb[a](<digits…>)`, `hsl[a](<digits…>)`, `oklch(`. Also `shadow-[…rgba(…)…]`. | `bg-[rgb(var(--x))]`, `bg-[var(--x)]`, `bg-[hsl(var(--x)/0.5)]` |
| DS002 `raw-color-literal` | error | `#hex`, `rgb[a](digits)`, `hsl[a](digits)` inside **string/template literals and JSX attribute values** (AST), outside Tailwind candidates already reported by DS001 (precedence). | comments (`Closes #1312`), `url(#clip)`, `href="#top"`, `id="#…"`, anything inside `var(...)`, Icons folder |
| DS003 `inline-style-literal` | error | `style={{…}}` (AST `JsxAttribute` with `ObjectLiteralExpression`) whose visual key (`color`, `background*`, `border*Color`, `outlineColor`, `fill`, `stroke`, `fontFamily`, `fontSize`, `boxShadow`) has a **literal** color/size value. | keys whose value is `var(...)`, an identifier/expression, a `--custom-prop` assignment; layout keys (`width`, `height`, `transform`, `top/left`, `zIndex`) |
| DS004 `important-prefix` | error | Tailwind candidate with `!` override (`!bg-red-500`, `hover:!p-2`) inside any string literal / template / JSX attr. | `!selected &&` (not a string), `"Hello!"` (no `![a-z]+-` shape) |
| DS005 `raw-primitive` | **error** | JSX opening element `button`, `input`, `select`, `textarea` outside `components/ui/**`. | `<input type="hidden">` only, and waived cases (e.g. `funding-map-search.tsx:105-117`). `type="file"` is **not** exempt — `components/ui/input.tsx:5-16` already styles `file:` pseudo-elements. |
| DS006 `arbitrary-scale` | warn | Tailwind candidate `<spacing|type util>-[<number>(px|rem|em|%)?]` where the util is **spacing or typography only**: `p*`/`m*`, `gap*`, `space-x/y`, `text`, `leading`, `tracking`, `rounded*`, `indent`. **Amended by Round 2 D3.** | **Every sizing utility** — `w`, `h`, `min-w/h`, `max-w/h`, `size`, `basis`, `inset`, `top/right/bottom/left`, `translate` — regardless of unit: a layout dimension is content- or viewport-driven, not a scale step. Also `calc(…)`, `var(--x)`, `z-[…]`, `grid-cols-[…]`, and the `scaleDefinitionFiles` |
| DS007 `css-color-literal` | error | `#hex`/`rgb(digits)`/`hsl(digits)` in `.css/.scss` outside `tokenDefinitionFiles`. | `var(--x)`, `rgb(var(--x))`, comments |
| DS000 `bad-waiver` | error | `design-check-ignore` without a rule ID or without a reason ≥ 10 chars; waiver whose rule ID has no finding on the next line (orphan). | — |

**Precedence:** one finding per source range — DS001 > DS002; DS003 > DS002. A literal is
reported exactly once.

**Waiver:** `// design-check-ignore: DS00X <reason>` (or `{/* … */}`) on the line above the
violation. Waived findings are still emitted with `waived: true` and listed in the PR comment
under "Waivers". A finding is diff-relevant when **either its violation range or its attached
waiver line** intersects added lines — so adding a waiver above an existing finding is
reviewer-visible. For every added waiver the PR body must contain, under `## Review waivers`, one
entry of the form `- DS00X <path>:<line> — <reason>` (path + rule must match an emitted waived
finding; reason ≥ 10 chars). The workflow fails on a missing section, a missing entry, or an entry
that matches no waiver (stale). Same convention as `REVIEW-WAIVED` in root `CLAUDE.md`; human
approver sign-off on that section is review process, not machine-checked.

## 4. Architecture

```
scripts/
  check-design-system.js              # Node >=20, CJS, deps: `typescript` (already installed)
  design-check.config.json            # scan globs, excludes, tokenDefinitionFiles, per-rule severity
__tests__/unit/scripts/
  check-design-system.test.ts         # vitest — golden corpus per rule × mode
  fixtures/design-check/**            # positive/negative source snippets + git-diff fixtures
```

**Scanner.** Parse each file with `typescript`'s `createSourceFile` (no type-check). Walk:
string literals, no-substitution templates, template heads/spans, JSX attribute initializers,
JSX opening elements, `style` object literals. Tailwind candidates are lexed from every string
(split on whitespace, strip variants `hover:`/`dark:`/`md:`, handle `/opacity` suffix). Findings
carry `{ rule, severity, file, line, col, endLine, snippet, message, hint, waived }`. Comments
are never scanned (solves `Closes #1312`, `#region`).

**Modes** (all share one scanner; only the *line filter* differs):

```
pnpm design:check                          # full repo → table; exit 1 on errors
pnpm design:check --report                 # full repo; never exit 1; used by quality-gate
pnpm design:check --changed --base <sha>   # findings whose range intersects ADDED lines of
                                           #   git diff --find-renames -U0 <sha>...HEAD (THREE-dot:
                                           #   merge-base(base, HEAD)..HEAD). Requires history; exit 2
                                           #   if no merge base. Identical locally and in CI because
                                           #   CI checks out the raw PR head (see §5).
pnpm design:check --staged                 # same, from git diff --cached --find-renames -U0
pnpm design:check --worktree <file>        # same, from git diff -U0 HEAD -- <file>
                                           #   (untracked file ⇒ every line is "added")
pnpm design:check --files a.tsx …          # whole-file, report-only (never blocks) — debugging aid
pnpm design:check --json                   # { mode, base, summary:{error,warn,waived,byRule}, findings[] }
```

**Diff parsing** handles `+++ /dev/null` (deletions → skip), `rename from/to` (scan the new path),
quoted/escaped paths, CRLF, new files (`--- /dev/null` → all lines added). Missing/unresolvable
base SHA ⇒ exit 2 ("fail closed"), never "0 findings".

**Hints** are a curated map in the config (`"#2ed1a8": "bg-brand / text-brand"`, `"<button>":
"import { Button } from \"@/components/ui/button\""`), not a blind hex→token lookup, because a
fixed hex mapped to `brand` can violate whitelabel intent.

## 5. Integration points (gap-app-v2 only)

| Where | Change |
|-------|--------|
| `package.json` | `"design:check": "node scripts/check-design-system.js"`. lint-staged config **unchanged** (it is per-file and TS-only; overlapping globs would miss CSS). |
| `.husky/pre-commit` | `pnpm tsc --noEmit && pnpm lint-staged && pnpm design:check --staged` — one invocation, the checker selects every supported extension (TS/JS/CSS/SCSS) from `git diff --cached`. |
| `.claude/hooks/post-edit-antipatterns.sh` | after existing checks: `node scripts/check-design-system.js --worktree "$FILE_PATH" --json --report` → append error findings to `ISSUES`. Guard with `|| true` so `set -e` cannot abort before output. Advisory only (hook cannot block). |
| `.github/workflows/pr-checklist.yml` | (a) add `permissions: { contents: read, pull-requests: write }`; (b) **checkout `ref: ${{ github.event.pull_request.head.sha }}` with `fetch-depth: 0`** (raw PR head, full history), then `git fetch origin "$PR_BASE_SHA"` and validate it resolves — this makes CI and local `--changed --base origin/main` compute the same `base...HEAD` tree even after the base advances; the anti-pattern step keeps its two-dot command but now runs on the raw head too (still informational); (c) **bootstrap: `pnpm/action-setup` + `actions/setup-node@v5` (node 20, pnpm cache) + `pnpm install --frozen-lockfile`**, mirroring `quality-gate.yml:118-128`, because the scanner `require("typescript")`s a devDependency; raise `timeout-minutes` to 15; (d) new step `design` running `--changed --base "$PR_BASE_SHA" --json --report` into `.quality/design.json`; exit 2 (crash / no merge base / invalid JSON) fails this step; (e) comment step becomes marker-based create-or-update and **always** posts (also for clean PRs) with a **🎨 Design system** section + waivers; comment failure on forks is non-fatal and the same markdown goes to `$GITHUB_STEP_SUMMARY`; (f) separate step `Fail on design errors` with `if: always()` reading `summary.error > 0` → `exit 1`; (g) waiver check: for every emitted waived finding whose waiver line is added, require a matching `- DS00X <path>:<line> — <reason>` entry under `## Review waivers` in the PR body; fail on missing section/entry or stale entry. |
| `scripts/quality-gate.js` | collector `design` → `violations.design` = `{ total, byRule: {DS001: n, …} }`; `compare()` treats every `byRule` key like `biome` (increase ⇒ regression, decrease ⇒ improvement); report renders a Design row; collector crash/invalid JSON ⇒ regression "design collector failed", never a zero. New flag `--update-baseline=design` merges only `violations.design` into `quality-baseline.json`. |
| `quality-baseline.json` | add `violations.design` once via `--update-baseline=design` on a PR carrying the `quality-baseline` label (`quality-gate.yml:42-69`). **DONE** — committed in `19771fb`, generated by the command only, never hand-edited. **The PR that lands this branch MUST carry the `quality-baseline` label or `baseline-guard` will reject it.** |
| `gap-app-v2/CLAUDE.md` "Enforcement" | document rules, modes, waiver, how to refresh baseline |
| `D:\super-gap\CLAUDE.md` Pre-PR checklist | extend the "No hardcoded colors" item with "enforced by `pnpm design:check` (DS001–DS007)". Not in the cross-service §6 (frontend-only). |

## 6. User flows (definition of done — each must be exercised in T7)

| # | Flow | Expected |
|---|------|----------|
| 1 | PR adds `className="bg-[#123456]"` | checklist job fails; comment shows DS001 + hint |
| 2 | PR edits one clean line in a file with 5 legacy DS002 hits | CI passes, pre-commit passes, hook prints nothing; comment shows "0 design errors" |
| 3 | PR adds `bg-[rgb(var(--color-primary))]` and `style={{ color: "var(--c-primary-500)" }}` | no findings |
| 4 | PR adds `#fff` inside a Tailwind candidate | exactly one finding (DS001), not DS002 too |
| 5 | Waiver with reason + `## Review waivers` in PR body | passes; waiver listed in comment |
| 6 | Bare waiver / no reason / orphan waiver | DS000 error, blocks |
| 7 | Waiver added but PR body lacks `## Review waivers`, or lacks the matching `- DS00X path:line — reason` entry, or has a stale entry | blocks with explicit message naming the missing/stale entry |
| 7b | Waiver line added above a **pre-existing** (not added) violation | finding is emitted as waived + diff-relevant; PR-body entry required |
| 7c | Raw `<input type="file">` added | blocks (DS005) with hint to `components/ui/input` |
| 8 | Forbidden class added in a `.ts` constant (`src/helper/theme.ts` style) | blocks (DS001) |
| 9 | New file, pure rename, rename+edit, deletion, quoted path, CRLF file | scanned correctly; deletion/rename-only ⇒ 0 findings |
| 10 | Base SHA missing/unfetchable, checker crash, invalid JSON | job fails with exit 2, comment says "checker failed" |
| 11 | Fork PR (read-only token) | comment step warns, step summary carries the report, fail step still blocks |
| 12 | Clean PR, no prior bot comment | comment is still created with 0 findings |
| 13 | Repo-wide: `violations.design.DS001` rises vs snapshot | quality-gate fails; falls ⇒ improvement printed |
| 14 | `--update-baseline=design` | only `violations.design` changes in `quality-baseline.json` |
| 15 | Staged file with DS001 | commit blocked; with DS006 only ⇒ commit passes |
| 16 | Claude edits a `.tsx` adding `!bg-red-500` | hook prints DS004; nothing else changes |
| 17 | Local `pnpm design:check --changed --base origin/main` on the PR head, **after `main` has advanced with an unrelated edit** | same findings as CI for that commit (three-dot on raw head on both sides) |
| 17b | CSS-only commit adding `#123456` to a non-token `.scss` | pre-commit blocks (DS007) — `--staged` covers CSS |
| 18 | PR adds raw `<button>` outside `components/ui` | blocks (DS005); `<input type="hidden">` passes |

## 7. Execution plan & ownership

| # | Task | Owner | Depends | Validation |
|---|------|-------|---------|------------|
| T0 | Rival review rounds 1–2 → APPROVE-WITH-CHANGES, changes incorporated (v3) | Tech Lead + Rival-557 | — | **DONE 2026-08-27** |
| T1 | Golden corpus + tests first: `__tests__/unit/scripts/check-design-system.test.ts` + fixtures for every rule (≥ 3 positive, ≥ 3 negative each), precedence, waivers, diff-hunk parser (all §6 row 9 cases), each mode | Dev-557 (TDD) | T0 | **DONE** `cd2ef69` — 98 tests + 17 source fixtures + 8 diff fixtures; verified red first (`Cannot find module '../../../scripts/check-design-system.js'`) |
| T2 | `check-design-system.js` scanner (TS AST + candidate lexer) + config + modes + JSON | Dev-557 | T1 | **DONE** `e8e087c` — T1 green 98/98; full-repo `--report --json` **3.1 s** (budget 10 s), 3 748 findings; content-hash cache not needed. Biome-clean. Per-rule full-repo counts after the §11 rulings: DS001 173, DS002 211, DS003 44, DS004 101, DS005 1 056, DS006 2 075, DS007 87, DS000 0 — total 3 747 |
| T3 | `.husky/pre-commit` `--staged`, post-edit hook `--worktree` | Dev-557 | T2 | **DONE** `67493e5` — flow 2 (edit-free legacy file ⇒ hook silent), 15a (staged DS001 ⇒ exit 1), 15b (staged DS006 only ⇒ exit 0), 16 (hook prints DS004 + hint), 17b (staged `.scss` ⇒ DS007 blocks) all verified against this worktree. lint-staged untouched |
| T4 | `pr-checklist.yml` changes (§5) | Dev-557 | T2 | **DONE** `b0f8085` — (a)–(g) all present; YAML parses, both `github-script` blocks parse. Flows 1, 5, 7, 7b (missing entry), 7c (stale entry), 7d (short reason), 10, 11, 12 verified with an offline harness that extracts the exact script out of the YAML. **Throwaway-PR run still owed — T7/T8** |
| T5 | `quality-gate.js` collector + `compare()` + `--update-baseline=design` + extend `__tests__/unit/scripts/quality-gate.test.ts` | Dev-557 | T2 | **DONE** `19771fb` — 27 tests (was 15). Flow 13 both ways against the real repo: +1 DS001 ⇒ `design.DS001 173 → 174 (+1)`, exit 1; −1 ⇒ improvement, exit 0. Flow 14: `--update-baseline=design` touches only `violations.design` (13-line diff), 3.2 s. Collector failure ⇒ `design collector failed`, never zeros |
| T6 | Docs (§5 last two rows) + plan status | Dev-557 | T2–T5 | **DONE** `ebba030` — `gap-app-v2/CLAUDE.md` gains a "Design system" subsection under Enforcement (rule table incl. the "not a violation" column, precedence, all modes, exit-2 contract, waiver format, baseline refresh). Root `CLAUDE.md` Pre-PR colour item extended — **edited in place in `D:/super-gap`, left uncommitted**: it belongs to the umbrella repo, not this branch. §7 filled below; awaiting Tech Lead review |
| S11 | Apply §11 Tech Lead rulings F1, F3, F4, F5, F7 + the two rulings; add the plan to the branch | Dev-557 | T6 | **DONE** — F1 `e5d603f`, F7 `e5d603f`, both rulings `e5d603f`, F4+F3 `4e0c469`, plan `804b8e9`. F5 needed no change (already outside the `*.tsx` branch; re-verified with a `.scss` file). F2 already held, F6 deferred to Amaury |
| T7 | Independent verification (see below) | Tester-557 | T2–T5 | **READY** — branch `amaury/dev-557-static-design-check` in worktree `D:/super-gap-worktrees/dev-557`, 7 commits, not pushed. T7(f) coverage already met by the dev suite: **91.78 % lines / 90.89 % statements / 78.04 % branches / 95.38 % functions** on `check-design-system.js` |
| T8 | Fix T7 findings; open PR via `/git-create-pr` with `## Smoke results` linking the throwaway-PR runs; `/babysit` | Dev-557 | T7 | CI green incl. new blocking step |

**T7 — Tester scope.** (a) Run the golden corpus through all four modes (`full`, `--changed`,
`--staged`, `--worktree`) and assert identical findings for identical added lines. (b) **Recall:**
seed 5 mutations per rule into real files under `src/features` and `components/Pages` (one per
top-offending dir) and confirm each is caught in `--changed` mode; report recall per rule (target
100 % for DS001/2/4/5/7, ≥ 90 % DS003/6). (c) **Precision:** stratified sample of 20 findings per
rule from the full-repo run, classify TP/FP with file:line; report precision per rule (target
≥ 95 % error rules, ≥ 85 % warn rules). (d) Adversarial inputs: CSS-var tokens, `url(#id)`,
`Closes #1312` comment, `!selected &&`, `tw=` strings, class arrays, multi-line `cn()`/`cva()`,
`.ts` constants, `.mdx`, CRLF, quoted paths, staged-vs-unstaged hunks, `style={{}}` where only
one key is new. (e) Workflow matrix on throwaway PRs: fork, rebase, base advanced, rename,
new file, waiver-without-section, checker crash. (f) Coverage: `pnpm vitest run --coverage
__tests__/unit/scripts/check-design-system.test.ts` ≥ 80 % lines on the script. Deliver a table
per rule × mode with pass/fail and evidence paths in §10.

## 8. Decisions & trade-offs (decision log incl. Rival round 1)

| Rival finding | Decision |
|---------------|----------|
| B1 `--files` punishes legacy debt in pre-commit/hook | **Accepted.** Added `--staged` and `--worktree` modes; `--files` demoted to report-only. Same added-lines filter everywhere. |
| B2 three-dot diff unsound on shallow merge-ref checkout | **Accepted (v2: two-dot on merge ref → round 2 NOT RESOLVED → v3: three-dot on raw head).** Rival showed `B..merge(B,H)` in CI ≠ `B..H` locally once the base advances, so flow 17 was false. v3: checkout `head.sha` with `fetch-depth: 0`, fetch `base.sha`, `base...HEAD` with `--find-renames`, exit 2 when no merge base. Cost: full clone (+~20 s) — acceptable for a blocking gate. |
| **Round 2 — 1** standardize on raw head + three-dot | **Accepted** (above). |
| **Round 2 — 2** `pr-checklist.yml` has no pnpm/node/install, `require("typescript")` would fail | **Accepted.** Bootstrap mirrors `quality-gate.yml:118-128`; `timeout-minutes` 15. |
| **Round 2 — 3** waiver needs per-entry PR-body match + waiver-line intersection | **Accepted.** §3 waiver contract + flows 7/7b. |
| **Round 2 — 4** `--staged` must cover CSS/SCSS | **Accepted.** Single `pnpm design:check --staged` in `.husky/pre-commit`; lint-staged untouched. |
| **Round 2 — 5** TS parser is not an MDX parser | **Accepted — MDX removed from v1**, `src/stories/**` excluded; follow-up ticket for an MDX extractor. |
| **Round 2 — 6** `type="file"` exemption contradicts `components/ui/input` | **Accepted.** Only `type="hidden"` exempt. |
| B3 quality-gate "ratchet" is not monotonic | **Accepted, reframed.** Per-PR monotonicity comes from the added-lines gate. `quality-gate` provides the same regression-vs-snapshot guarantee as Biome/Knip today, no more; the plan no longer says "can only go down". Snapshot refresh is explicit (`--update-baseline=design`, labelled PR). A true monotonic ratchet (auto-lower on main) is a separate ticket that would affect all metrics. |
| B4 DS001/DS002 reject CSS-var tokens | **Accepted.** Literal vs `var()` consumption distinguished in every rule; precedence removes double counting. Hints curated, not hex-mapped. |
| M1 `.ts`/`.js`/`.mdx` sources skipped | **Accepted.** Scan the Tailwind `content` globs; token-definition files exempted by explicit list. |
| M2 DS005 warn-only | **Accepted.** Error on added lines; `type="hidden"`/`"file"` exempt; waiver for semantic exceptions. |
| M3 regex lacks lexical context | **Accepted.** TypeScript AST + candidate lexer; findings intersect added lines. `typescript` is already a dependency; no new deps. |
| M4 allowlists as escape tunnels | **Partially accepted.** CSS now scanned (DS007) with token-definition files as the only literal zone; chart palettes no longer allowlisted (waiver or tokens). Icons folder stays exempt for DS002 only — SVG path fills are assets, not design tokens. |
| M5 waiver weaker than `REVIEW-WAIVED` | **Partially accepted.** Reason required, orphan detection, PR-body `## Review waivers` enforced by workflow. Approver sign-off stays a human review step (GitHub has no per-line approval primitive we can check without CODEOWNERS changes — out of scope). |
| M6 reporting/failure sequencing | **Accepted** in full (§5). |
| M7 T7 weak on recall | **Accepted** — T7 rewritten with per-rule recall + precision, four modes, workflow matrix, real coverage command. |
| m1 docs placement | **Accepted** — no changes to the cross-service section or the UI/UX guide examples. |
| m2 test location / schema | **Accepted** location; schema file left alone (non-goal). |

| **Rival R3 blocker** — the blocking job runs PR-authored code (checker, config, install hooks) in the same job that holds a `pull-requests: write` token, so a same-repo PR could exfiltrate the credential or neuter the gate | **Partially accepted; the split trusted-job design is rejected.** Reasoning: (1) a same-repo PR author already holds push rights to this repo, so the branch is not a trust boundary and the split buys no confidentiality against that actor; (2) this job's `GITHUB_TOKEN` is `contents: read` + `pull-requests: write` only — it cannot push code, publish, or read secrets; (3) `design:check` is a **quality gate, not a security boundary** — its job is to stop accidental drift, and treating it as an authorization control would misprice it. Mitigations applied instead: `persist-credentials: false` so the token never lands in `.git/config`; `pnpm install --frozen-lockfile --ignore-scripts` so PR-authored lifecycle hooks never execute; step outputs reach the shell through `env:`, never `${{ }}` interpolation; and `.github/CODEOWNERS` now owns the checker, its config, `quality-gate.js`, `quality-baseline.json`, both workflows and `.husky/pre-commit`. **Escalated to Amaury:** the CODEOWNERS mitigation is inert until "Require review from Code Owners" is enabled in branch protection for `main`. Note `@show-karma/engineering`, referenced by the pre-existing CODEOWNERS, does not exist — those rules were unowned; the file now uses the verified `@show-karma/dev`. |

Other standing decisions: Tailwind default palette allowed in v1; plain CJS Node script (matches
`quality-gate.js`, runnable from the bash hook without ts-node); blocking lives in
`pr-checklist.yml` (fast, every PR), trend tracking in `quality-gate.yml`.

## 9. Risks, assumptions, blockers

- **Candidate lexer fidelity.** Tailwind's real extractor is more permissive than a whitespace
  split (e.g. classes inside `clsx({"bg-[#fff]": cond})` keys — covered, they are string literals;
  classes built by concatenation `"bg-[" + hex + "]"` — not covered, accepted gap, documented).
- **Performance.** AST-parsing ~3 000 files: expected < 10 s on CI; if slower, cache by content hash
  under `.quality/design-cache.json` (T2 stretch, not blocking).
- **DS005 friction.** Some teams add `<button>` for icon-only controls; `Button variant="ghost"
  size="icon"` exists — hint says so. Waiver handles the remainder.
- **Assumption:** blocking on DS001–DS005/DS007 from day one is acceptable. Fallback if the team
  objects: run one week with `--report` in the fail step disabled, then flip. Escalate to Amaury
  only if Rival round 2 still disputes it.
- **Windows paths** in `--worktree`/`--staged` (Amaury develops on Windows): normalize to POSIX
  before matching config globs; fixture in T1.

## 11. Tech Lead rulings after approval (from Tester-557 pre-registered findings F1–F7)

These are **binding amendments** to §3–§5; Dev-557 must apply them before T7 execution ends.

| Ref | Ruling |
|-----|--------|
| F4 (P1) | `compare()`: if `baseline.violations.design` is **absent**, skip the design comparison entirely and print `design: no baseline yet — run pnpm quality --update-baseline=design on a PR labelled quality-baseline`. A missing key is never `0`. Unit test required. |
| F3 | `quality-gate.js` must accept both the bare `--update-baseline` (existing `pnpm quality:baseline`) and `--update-baseline=design`; parse with a prefix match, add a test for each. |
| F1 | Scan roots = tailwind `content` globs **plus** `utilities/**`, `hooks/**`, `widget/**` (widget ships via `pnpm build:widget`). |
| F5 | The post-edit hook must run the design check for `.ts/.tsx/.js/.jsx/.css/.scss` **outside** the existing `*.tsx` case branch (flow 17b needs hook coverage for CSS). |
| F7 | New config key `scaleDefinitionFiles` (initially `components/Pages/Dashboard/v3/soft-classes.ts`, `src/features/donor-research/components/report-brief/table-classes.ts`) exempt from **DS006 only**. |
| F2 | Yes — the §3 exclude list applies to the CSS sweep too; `src/stories/**` is excluded for DS007. |
| F6 | **Deferred / escalated.** `pr-checklist.yml` keeps its `paths-ignore`; the gate blocks by job failure, not by a required-status-check. Making it a required check on `main` would need `paths-ignore` removed (so doc-only PRs get a status) — Amaury decides when configuring branch protection. |
| `!bg-[#123456]` | **Two findings**: DS004 (important) and DS001 (literal). Precedence dedupes only the *same defect* (a color literal: DS001 > DS002, DS003 > DS002); different defects on one candidate are both reported. |
| Multi-rule waiver | `// design-check-ignore: DS001,DS004 <reason>` is accepted (comma-separated, no spaces required). Every listed ID must match a finding on the next line; any ID without a match ⇒ DS000 orphan. PR body: **one line per waiver** carrying the same comma-joined ID set, e.g. `- DS001,DS004 src/x.tsx:42 — reason` (not one line per rule). Must be documented in `gap-app-v2/CLAUDE.md`. |

### Round 2 rulings (Tester D1–D10, Phase 2a against `ebba030`)

| Ref | Ruling | Applied |
|-----|--------|---------|
| D1 (P1) | `--staged` must scan the **index** blob (`git show :<path>`), not the working tree, so hunk ranges and content come from the same revision. `--changed` reads `HEAD:<path>`; `--worktree` keeps the working copy. | `0ea4051` |
| D2 (P1) | Duplicate of §11 F4 — a missing `violations.design` is "unmeasured", never `0`. | already fixed in `4e0c469` |
| D3 | DS006 must **not** apply to sizing utilities (`w`, `h`, `min-w/h`, `max-w/h`, `size`, `inset`, `top/right/bottom/left`, `basis`, `translate`) — layout dimensions are legitimately arbitrary. DS006 keeps spacing and typography only. §3 table amended. | `0ea4051` |
| D4 | `utilities/whitelabel-config.ts` joins `tokenDefinitionFiles` (per-tenant colour config is a token definition). `styles/non-profits-landing.css` is **not** exempted — it is legacy debt, exactly what the added-lines gate must stop growing; the baseline absorbs it. | `0ea4051` |
| D5 / D6 | DS003 is skipped for Satori / next-og image routes, which cannot use classes: by AST import detection (`next/og`, `@vercel/og`) **and** by `inlineStyleExemptGlobs` (`app/**/opengraph-image.tsx`, `app/**/twitter-image.tsx`, `app/api/og/**`). The DS003 message now names the Tailwind utility for the key, the `var(--token)` form, and the exemption. | `0ea4051` |
| D7 | A waiver waives **every** finding of the listed rule ids on the next line, not only the first. | `0ea4051` |
| D8 | Waiver keyword and rule ids match case-insensitively; a malformed waiver still raises DS000 rather than being silently ignored. | `0ea4051` |
| D9 | The waiver phrase inside a string literal is data: it waives nothing and raises no DS000. Waivers are honoured only in comments (line, block, JSX, CSS). | `0ea4051` |
| D10 | In-process coverage for the untracked branch of `--worktree`. | `0ea4051` |
| D5 docs | §3's undocumented behaviour written down in `gap-app-v2/CLAUDE.md`: DS007 detects `oklch()`/`oklab()`; DS002 still checks a `--custom-prop` value that DS003 skips; the full `STYLE_COLOR_KEYS` list; a per-key exemption table; per-mode revision semantics. | `c589805` |

## 10. Verification report (T7) — to be filled by Tester-557

### Dev handover (T1–T6 complete, 2026-08-27)

Worktree `D:/super-gap-worktrees/dev-557`, branch `amaury/dev-557-static-design-check` off `origin/main`
(`df5b582`). Fifteen commits, **not pushed, no PR opened**. §11 rulings applied; Tester Phase-2a defects D1–D10 closed.

| Check | Result (re-run after the Round 2 D1–D10 fixes) |
|-------|--------|
| `pnpm typecheck` | pass, 20 s (incremental; 1 m 29 s cold) |
| `pnpm vitest run --project unit __tests__/unit/scripts/*.test.ts` | **212 passed** — 176 design-check + 36 quality-gate |
| `pnpm vitest run --coverage __tests__/unit/scripts/check-design-system.test.ts` | exit 0 — 92.22 % lines, 91.63 % stmts, 80.28 % branches, 97.26 % funcs |
| `pnpm design:check --report --json` (full repo) | **3.9–4.8 s over five runs**, 2 796 findings, exit 0 |
| Biome on the changed files | 0 errors; net **−1** diagnostic vs `origin/main` |

Per-rule full-repo counts after Round 2: DS001 173, DS002 195, DS003 20, DS004 101, DS005 1 056,
DS006 1 164, DS007 87, DS000 0 — total **2 796**, down from 3 747. Attribution: **DS006 −911** (D3,
sizing utilities), **DS003 −24** (D5/D6, the three `next/og` routes), **DS002 −16** (D4,
`utilities/whitelabel-config.ts`). DS007 is unchanged at 87 because `styles/non-profits-landing.css`
was deliberately left unexempted. Earlier, §11 F1 had added **DS002 +10 / DS006 +1** (`widget/**`)
and F7 removed **DS006 −12**. `quality-baseline.json` regenerated with
`pnpm quality --update-baseline=design` — never by hand.

### §11 rulings — what changed

| Ref | Outcome |
|-----|---------|
| F1 | `widget/**/*.{js,jsx,ts,tsx}` added to `scanGlobs`; `utilities/**` and `hooks/**` were already there. 13 widget findings now counted |
| F3 | Flag parsing extracted to an exported `parseUpdateBaselineScope()`; bare `--update-baseline` and `--update-baseline=design` both verified end-to-end, unknown scope exits 2. 5 unit tests |
| F4 | An absent `baseline.violations.design` no longer compares against 0 — the comparison is skipped and a note is printed. Verified by deleting the key from the real baseline: gate passed, note shown. 5 unit tests |
| F5 | **No change needed** — the hook already calls the checker after `esac`, outside the `*.tsx` branch. Re-verified with a `.scss` edit: DS007 reported |
| F7 | `scaleDefinitionFiles` config key added with the two named files, exempt from DS006 only; 6 unit tests prove DS001–DS005 still fire there |
| `!bg-[#123456]` | Already produced both DS004 and DS001; fixture and test added to lock it in |
| Multi-rule waiver | `design-check-ignore: DS001,DS004 <reason>` implemented in the checker (each id must match or it is a DS000 orphan) and in the workflow, which now groups by waiver and requires one comma-joined PR-body entry. Documented in `gap-app-v2/CLAUDE.md` |

Known issues and deviations, all deliberate:

1. **`pnpm lint:fix` rewrites 3 835 unrelated files** on a Windows checkout — Biome writes LF while
   `core.autocrlf=true` checks out CRLF. Pre-existing environment behaviour, unrelated to this
   change. I reverted the churn and kept only my own files; the changed files are Biome-clean and
   the repo-wide biome count is one lower than on main. CI (Linux) is unaffected.
2. **Global coverage thresholds** (`vitest.config.ts`: lines 70 / branches 60) are evaluated over
   whatever ran, so a single-file coverage run can trip them. The command above passes because the
   design checker is now the only instrumented file and clears every threshold on its own.
3. **Root `CLAUDE.md` edit is gone.** `D:/super-gap/CLAUDE.md` is the umbrella repo; per the Tech
   Lead it stays uncommitted for Amaury to decide. That file has since been restructured by someone
   else and the one-line Pre-PR colour change is no longer in it — it needs re-applying by whoever
   lands the umbrella change. Not re-applied here, as instructed.
4. **Waiver PR-body check runs on `edited`.** `pr-checklist.yml` now also triggers on
   `pull_request: edited` so fixing a `## Review waivers` section re-runs the gate without a push.
5. **DS002 accepts 4-digit hex** (`#rgba`), which in principle could match an issue reference such
   as `#1312` inside a string. Zero occurrences in the 201 real DS002 findings — every all-digit
   match was a genuine colour (`#000000`, `#292929`). Left as-is; comments are never scanned, which
   is where issue references actually live.
6. **Accepted gap (documented in §9):** classes built by concatenation (`"bg-[" + hex + "]"`) are
   not detected.

Precision spot-check on the full-repo run (Dev, not a substitute for T7(c)): sampled 9 findings per
rule across DS002/DS003/DS004/DS007 — all true positives, no false positive found.

