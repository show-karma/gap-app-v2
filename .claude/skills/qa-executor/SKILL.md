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

## Setup

```bash
mkdir -p qa-output/screenshots qa-output/videos
```

Always use `agent-browser` directly — never `npx agent-browser`. The direct binary uses the fast Rust client.

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

### 2. Execute Public Scenarios First

Initialize a session without auth:

```bash
agent-browser --session qa-pub open "http://localhost:3000"
agent-browser --session qa-pub wait --load networkidle
```

For each public scenario (P1, P2...), in risk-priority order:

**a. Navigate:**
```bash
agent-browser --session qa-pub open "http://localhost:3000/{path}"
agent-browser --session qa-pub wait --load networkidle
```

**b. Baseline screenshot:**
```bash
agent-browser --session qa-pub screenshot qa-output/screenshots/P{N}-baseline.png
```

**c. Execute steps** as written in the plan. Use `snapshot -i` before interacting.

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

After all public scenarios, authenticate using the flow above.

### 4. Execute Authenticated Scenarios

For each authenticated scenario (A1, A2...), in risk-priority order:

Same process as public scenarios but:
- Use the `qa-auth` session (already logged in)
- If session expires, reload auth state: `agent-browser --session qa-auth state load qa-output/auth-state.json`
- Scenario IDs are A1, A2...

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

Save results to `qa-results.json`:

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
