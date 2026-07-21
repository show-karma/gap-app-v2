# Taskless — Team Guide

Taskless enforces our team conventions as deterministic rules (in `.taskless/rules/`).
It runs the same rules in your editor's pre-commit hook and in CI, so the same standard
applies no matter who or what wrote the code.

## Daily use — you mostly do nothing

It runs automatically:

- **On commit** — checks your **staged files**.
- **On a PR** — checks the **changed files** in the diff.

You only act when it flags something, and the message tells you the fix. Run it yourself
anytime:

```bash
npx @taskless/cli check               # whole repo
npx @taskless/cli check path/to/file  # specific files
npx @taskless/cli check --fix         # apply autofixes where available
```

> Needs **Node ≥ 22.22** locally. On older Node the pre-commit check auto-skips and CI
> becomes the gate — nothing breaks.

## What it does to your PRs

- A **`Taskless`** check appears on every PR.
- It only looks at **files your PR changed** — pre-existing issues elsewhere never block you.
- **`warning`** findings print but **don't fail** the PR. **`error`** findings **fail** it.
- Most rules are currently `warning`, so today the check is mostly informational. Some rules
  get promoted to `error` over time (they carry a `# rollout:` note).
- Editing an older file may surface its existing issues (the whole changed file is scanned) —
  the "boy-scout" effect.

**Need to commit past it in a pinch:** `git commit --no-verify` (or `HUSKY=0 git commit`).

## Add a rule

Pick whichever is easiest:

1. **On a PR** — comment `@taskless` describing the rule ("use `PAGES`, not a hardcoded
   route"). It generates the rule + tests and opens a PR.
2. **Ask an agent** — in Claude Code / Cursor: *"add a taskless rule that flags X."*
3. **By hand:**
   ```bash
   # create .taskless/rules/<id>.yml  + .taskless/rule-tests/<id>-test.yml
   npx @taskless/cli rule verify <id>     # must pass before commit
   ```

New rules should land as `severity: warning` and graduate to `error` once new code stops
tripping them.

## Remove or fix a rule

A noisy or wrong rule should be changed/deleted the same day — don't suffer it.

- **Fix:** ask an agent *"the `<id>` rule is false-positiving on X, fix it,"* or edit
  `.taskless/rules/<id>.yml` and re-run `rule verify`.
- **Remove:** delete `.taskless/rules/<id>.yml` and its `.taskless/rule-tests/<id>-*.yml`.
- **Make it blocking:** change `severity: warning` → `error`.

All of these go through a normal PR — rules are reviewed like code.

## Mental model

You interact with **findings**; the **ruleset** is owned by review + an agent, not by any one
person hand-maintaining YAML. Keep new rules as warnings until they're quiet, prune
aggressively, and it stays a guardrail — not a nag.
