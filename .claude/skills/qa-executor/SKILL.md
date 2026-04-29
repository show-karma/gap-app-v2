---
name: qa-executor
description: Execute a QA test plan using agent-browser against localhost:3000. Uses Privy test accounts (fixed OTP) for authenticated scenarios. Always tests locally, never against preview URLs.
allowed-tools: Bash(agent-browser:*), Bash(curl:*), Bash(mkdir:*), Bash(cat:*), Bash(sleep:*)
---

# QA Executor (Frontend)

Execute the QA plan from Stage 1. You are a strict, rigid QA engineer. If expected behavior does not match exactly, it is a FAIL. No benefit of the doubt. No "close enough."

## Inputs

| Parameter | Source |
|-----------|--------|
| QA Plan | `qa-plan.md` in workspace root (artifact from Stage 1) |
| Target URL | `http://localhost:3000` (always local — never use preview/vercel URLs) |
| PR number | `$PR_NUMBER` env var |
| Test email | `$QA_TEST_EMAIL` env var (Privy test account) |
| Test OTP | `$QA_TEST_OTP` env var (fixed OTP from Privy dashboard) |
| Shard | `$SHARD_ID` env var (optional: `public`, `auth`, or unset = all). When set, execute ONLY scenarios matching that shard (see "Sharded Execution"). |

## Setup

```bash
mkdir -p qa-output/screenshots qa-output/videos
```

Always use `agent-browser` directly — never `npx agent-browser`. The direct binary uses the fast Rust client.

## Speed Rules (CRITICAL — these dominate runtime)

Each scenario averages 20-50 agent turns. Wasted seconds compound.

### Wait Strategy

- **NEVER `wait --load networkidle` after a click, fill, or in-page action.** networkidle blocks for 1-3s waiting for ALL network to settle, even unrelated tracking pixels. Across 200+ turns this costs 5-15 minutes per run.
- **DO wait for the specific thing you need next.** Use one of:
  - `agent-browser --session $S wait @{ref}` — wait for a known element ref
  - `agent-browser --session $S find role <r> "<label>" first` — locate next element (also waits)
  - `agent-browser --session $S get url` followed by a check — for navigations
- **Acceptable `wait --load networkidle` uses:**
  - First `open` of a brand-new page
  - After `state load` of an auth-restored session
  - Inside the Privy auth flow (iframe makes many requests — needed)
- **Anti-patterns to avoid:**
  - `wait 2000` (sleep N ms) — only ever use for failure-evidence replays at human pace, never in normal flow
  - `wait --load networkidle` after a click that opens a modal — wait for the modal element instead

### Snapshot Strategy

`snapshot -i` returns the entire accessibility tree (often 5-20KB). Big snapshots = slower agent turns and noisier prompts.

- Prefer **scoped snapshots** when you know roughly where you're working: `agent-browser --session $S find role dialog first` then operate on that subtree.
- Use **direct find commands** for stable elements instead of snapshot+ref: `agent-browser --session $S find role button "Submit" first click`.
- Only call `snapshot -i` when you genuinely need the full tree (e.g. first time on a new page).

### Per-Turn Discipline

- Batch related actions in one turn instead of one-action-then-snapshot loops. Example: navigate + screenshot + assert in three sequential commands without an intermediate snapshot.
- After a successful action, assume success and move on — only re-snapshot if the next action depends on dynamic content.

## Sharded Execution

When `$SHARD_ID` is set, execute only the matching subset:

| `$SHARD_ID` | Run scenarios |
|-------------|---------------|
| `public` | P1, P2, P3, ... (all P-prefixed). **Skip Privy login entirely.** |
| `auth` | A1, A2, A3, ... (all A-prefixed). Login first, then execute. |
| (unset) | All scenarios — public first, then auth. |

After execution, **rename the result file** to include the shard:

```bash
mv qa-results.json qa-results-${SHARD_ID:-all}.json
```

This lets parallel shards upload distinct artifacts that the verdict job aggregates.

## Authentication via Privy Test Account

Privy test accounts use a fixed OTP code that works on any domain (including Vercel preview URLs). No domain whitelisting needed.

**Login flow:**

```bash
# 1. Open the target URL
agent-browser --session qa-auth open "http://localhost:3000"
agent-browser --session qa-auth wait --load networkidle

# 2. Find and click the login/connect button
agent-browser --session qa-auth snapshot -i
agent-browser --session qa-auth click @{login-button-ref}
agent-browser --session qa-auth wait --load networkidle

# 3. Enter test email in Privy modal
agent-browser --session qa-auth snapshot -i
agent-browser --session qa-auth fill @{email-field-ref} "$QA_TEST_EMAIL"
agent-browser --session qa-auth click @{continue-or-submit-ref}
agent-browser --session qa-auth wait --load networkidle

# 4. Enter fixed OTP code
agent-browser --session qa-auth snapshot -i
agent-browser --session qa-auth fill @{otp-field-ref} "$QA_TEST_OTP"
# OTP may auto-submit, or click verify
agent-browser --session qa-auth wait --load networkidle

# 5. Save auth state for reuse across scenarios
agent-browser --session qa-auth state save qa-output/auth-state.json
```

**Reuse auth state for subsequent scenarios:**
```bash
agent-browser --session qa-exec state load qa-output/auth-state.json
```

**Important:**
- The Privy modal is an iframe or overlay. Use `snapshot -i` to identify elements inside it.
- The OTP field may accept digits individually or as a single input. Use `snapshot -i` to identify the pattern.
- After successful login, verify auth by checking that the UI shows logged-in state (user avatar, dashboard link, etc).

## Execution Workflow

### 1. Read the QA Plan

Read `qa-plan.md`. Parse both tables:
- **Public Scenarios** (P1, P2...) — execute without login
- **Authenticated Scenarios** (A1, A2...) — execute after Privy test account login

If `$SHARD_ID` is set, filter to only the matching subset (see "Sharded Execution" above) and skip the rest entirely — including auth login when `$SHARD_ID == public`.

### 2. Execute Public Scenarios First

Skip this section entirely if `$SHARD_ID == auth`.

Initialize a session without auth:

```bash
# First open of a fresh page — networkidle is OK here.
agent-browser --session qa-pub open "http://localhost:3000"
agent-browser --session qa-pub wait --load networkidle
```

For each public scenario (P1, P2...), in risk-priority order:

**a. Navigate:**
```bash
# First-load on a new path — networkidle OK.
agent-browser --session qa-pub open "http://localhost:3000/{path}"
agent-browser --session qa-pub wait --load networkidle
```

**b. Baseline screenshot:**
```bash
agent-browser --session qa-pub screenshot qa-output/screenshots/P{N}-baseline.png
```

**c. Execute steps** as written in the plan. Follow the **Speed Rules** above:
- Use scoped finds (`find role <r> "<label>" first`) instead of full `snapshot -i` whenever possible.
- After clicks/fills, wait for the **next expected element** (`wait @{ref}`), NOT `wait --load networkidle`.

**d. Evaluate:** PASS if actual matches expected exactly. FAIL otherwise.

**e. On FAIL — capture evidence:**
```bash
agent-browser --session qa-pub record start qa-output/videos/P{N}-fail.webm
# Re-execute failing steps at human pace
sleep 1
# ... replay steps with sleep 1 between actions
sleep 2
agent-browser --session qa-pub screenshot --annotate qa-output/screenshots/P{N}-fail.png
agent-browser --session qa-pub record stop
agent-browser --session qa-pub errors > qa-output/P{N}-errors.txt
```

### 3. Login with Privy Test Account

Skip this section entirely if `$SHARD_ID == public`.

After all public scenarios (or first if running an `auth` shard), authenticate using the flow above. Note: the auth flow is the **one place** where `wait --load networkidle` is acceptable — Privy's iframe has many concurrent requests.

### 4. Execute Authenticated Scenarios

Skip this section entirely if `$SHARD_ID == public`.

For each authenticated scenario (A1, A2...), in risk-priority order:

Same process as public scenarios but:
- Use the `qa-auth` session (already logged in)
- If session expires, reload auth state: `agent-browser --session qa-auth state load qa-output/auth-state.json`
- Scenario IDs are A1, A2...
- **Apply Speed Rules**: targeted waits, scoped finds, no `wait --load networkidle` after in-page actions.

### 5. Console Error Sweep

After all scenarios, do a final check:

```bash
agent-browser --session qa-pub errors
agent-browser --session qa-auth errors
```

Flag uncaught exceptions or failed network requests as additional issues.

### 6. Close Sessions

```bash
agent-browser --session qa-pub close
agent-browser --session qa-auth close
```

## Never Skip — Always Unblock

Skipping a scenario is a last resort, not a default. If a scenario requires state that doesn't exist (no project, no grant, no milestone), create it through the UI first. If a scenario requires a role you don't have, navigate to where you can get it. If an action needs funds you don't have, that's a valid skip — but missing data you can create is not.

Your job is to test, not to find reasons not to test.

## Early Termination

If 3 or more Critical issues are found, stop execution. Document what was tested and what was skipped.

## Failure Severity

| Severity | Criteria |
|----------|----------|
| Critical | Blocks core workflow, data loss, crash, security breach |
| High | Major feature broken, no workaround |
| Medium | Feature works with noticeable problems, workaround exists |
| Low | Cosmetic, minor polish |

## Result Values

| Result | When to use |
|--------|-------------|
| PASS | Actual matched expected exactly. |
| FAIL | Actual did not match expected, AND the failure is plausibly caused by changes in this PR (or by code in the repo even if not changed by this PR). |
| BLOCKED | Scenario could not be executed due to a cause unrelated to the PR's code: third-party service outage (Privy / Sentry / RPC down), missing test fixture data, infra/network failure, or missing environment capability (e.g. `agent-browser` unavailable). The PR did not modify the relevant code path. Use evidence to justify why this is environmental, not regression. |

`BLOCKED` does NOT contribute to the blocking verdict — but you must justify the classification in `evidence`. When in doubt between FAIL and BLOCKED, choose FAIL. A genuine regression mislabeled as BLOCKED would let a real bug ship.

## Output

Save results to `qa-results.json`, then rename to include the shard suffix so parallel shards do not overwrite each other's artifacts:

```bash
# After Claude writes qa-results.json:
mv qa-results.json "qa-results-${SHARD_ID:-all}.json"
```

The verdict job downloads all `qa-results-*.json` files and aggregates them.

JSON shape:

```json
{
  "total": 15,
  "passed": 12,
  "failed": 3,
  "blocked": 0,
  "skipped": 0,
  "blocking": true,
  "scenarios": [
    { "id": "P1", "name": "...", "result": "PASS", "severity": null, "evidence": null },
    { "id": "A1", "name": "...", "result": "FAIL", "severity": "High", "evidence": "qa-output/screenshots/A1-fail.png" },
    { "id": "A2", "name": "...", "result": "BLOCKED", "severity": null, "evidence": "Privy returned a 5xx service error; PR did not modify auth code." }
  ]
}
```

`result === "BLOCKED"` rows have `severity: null` (severity describes regression impact; blocked scenarios were never tested). Always include an `evidence` string explaining why the failure is environmental, not regression.

Post a PR comment. **Comment format — follow exactly:**

```markdown
## QA Execution (2/3)

**Result**: X/Y passed | Z failed | B blocked
**Blocking**: Yes/No

### Public Scenarios

| # | Scenario | Result | Severity | Details |
|---|----------|--------|----------|---------|
| P1 | [name] | PASS | — | — |

### Authenticated Scenarios

| # | Scenario | Result | Severity | Details |
|---|----------|--------|----------|---------|
| A1 | [name] | FAIL | High | [1-2 sentence description of what went wrong] |

<details><summary>Console Errors</summary>

[list any JS exceptions or failed requests]

</details>
```

**Rules:**
- PASS rows: no severity, no evidence.
- FAIL rows: severity required. For evidence, describe what you observed inline (1-2 sentences) — do NOT link to local file paths like `qa-output/screenshots/...` because those are not accessible from GitHub. Screenshots are saved as workflow artifacts and can be downloaded from the workflow run link.
- BLOCKED rows: no severity. Evidence must justify why the failure is environmental (third-party outage, missing fixture, infra issue) and NOT a regression in this PR's code.
- Sort: FAILs first (by severity), then BLOCKED, then PASSes.
- No prose. Just the tables.
- `Blocking: Yes` if any Critical or High severity FAIL. BLOCKED never makes a PR blocking.

## Strictness Rules

- If a button does nothing on click: FAIL (functional, High).
- If a loading state is missing: FAIL (UX, Medium).
- If an error state shows a blank page: FAIL (UX, High).
- If form validation accepts invalid input: FAIL (functional, High).
- If a page shows stale data after mutation: FAIL (functional, Critical).
- If console shows uncaught exceptions: FAIL (console, High).
- If a 404/500 response is visible to user: FAIL (functional, Critical).
- If login with test account fails: FAIL (auth, Critical).
- "It mostly works" is not a PASS. Expected must match actual exactly.
