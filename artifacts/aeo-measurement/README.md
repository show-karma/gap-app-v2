# AEO measurement — release annotation log

`releases.csv` ties AEO site changes to the dates they reached `main`, so a change in
AI-referral traffic (see the `ai_source` / `ai_source_medium` / `ai_first_touch_at`
properties on every Mixpanel event) can be read against the release that plausibly
caused it.

## Columns

| Column | Meaning |
|---|---|
| `date` | `YYYY-MM-DD` the change reached `main`, taken from git history — never estimated |
| `route_cohort` | The routes or surfaces the change affects, as the cohort you would filter analytics by |
| `issue` | `AEO-NN (DEV-NNN)` — the AEO work item and its Linear issue |
| `commit` | Short SHA on `main`. Normally the merge commit; for work that rode another PR's branch, the feature commit, called out in `notes` |
| `expected_metric` | What the change is expected to move, in one phrase |
| `notes` | What shipped, and any caveat needed to read the row correctly |

## Appending a row

Add one row per shipped AEO change, newest last. Take the date from
`git log -1 --format=%cd --date=short <commit>` on `main` — do not fill it in from memory.
Rows are append-only; correct a mistake in place rather than deleting history.
