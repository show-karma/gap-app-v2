# AEO measurement artifacts

Frozen records for the answer-engine-optimisation measurement programme
([DEV-583](https://linear.app/showkarma/issue/DEV-583)). Profound's prompt set and configuration
are mutable in place with no export on our tier, so these files — not the platform — are the
authoritative record of what was measured and when.

| File | What it is |
|---|---|
| `releases.csv` | Every shipped AEO change, its cohort, what it is expected to move, and the window in which to read the result. This is what lets a change in answer-engine traffic be attributed to a release. |
| `url-cohorts.csv` | The changed / control URL cohorts (DEV-589, AEO-06). Defines the `cohort_id` values that `releases.csv` refers to, and pairs each changed cohort with a comparable untouched control route. |
| `prompts.csv` | The 50 live Profound prompts verbatim (DEV-587 / AEO-04), with audience lane, intent, target page, citation and recommendation goals, and control flag. The frozen copy of a set that has no export. |
| `baseline-report.md` | The measurement baseline write-up: platform configuration as observed, the day-0 findings (broken name matching, branded-prompt inflation), the day-0 citation landscape, and what is still missing before a baseline can be read. |

Release dates cross-reference the `ai_source` / `ai_source_medium` / `ai_first_touch_at`
properties attached to every Mixpanel event by the AI-referrer classifier (DEV-592, AEO-09).

## `releases.csv` columns

| Column | Meaning |
|---|---|
| `release_id` | `R<YYYY-MM-DD>-<letter>` — stable handle for the release, referenced by `url-cohorts.csv` in its `changed_by_release` column. Letters are assigned in merge order within a day and are never reused or renumbered. |
| `date_utc` | `YYYY-MM-DD` the change reached `main`, taken from git history — never estimated, and not the production tag date. A change can reach `main` on one day and ship in a tag several days later; analytics are read against this date. |
| `issue` | Linear issue id, e.g. `DEV-585`. Umbrella `DEV-583` is used only for work that has no issue of its own. Empty for platform-configuration changes made outside the repo that had no ticket. |
| `pr` | GitHub PR number in `show-karma/gap-app-v2`. Empty for changes made in Profound's own UI rather than in code. |
| `cohort_id` | The `cohort_id` from `url-cohorts.csv` this release changed. Empty when the change is not URL-scoped (analytics instrumentation, platform configuration) or when no cohort has been defined for the routes it touches — say which in `change_summary` rather than inventing a cohort. |
| `change_summary` | What actually shipped, plus any caveat needed to read the row correctly — e.g. that a change rode another PR's branch, or that it contaminated a control cohort. |
| `expected_metric` | What the change is expected to move, in one phrase. Write "no metric movement expected" rather than leaving it blank when nothing should move. |
| `evaluation_window_start` | `YYYY-MM-DD` the first full day of data after the change. Normally `date_utc + 1`. |
| `evaluation_window_end` | `YYYY-MM-DD` the last day of the window. 28 days for site changes; 14 days for Profound configuration changes, matching the platform's own daily-run cadence. |
| `result` | `pending` until the window closes, then the observed outcome in one clause. Platform-configuration rows may read `applied` where the effect is immediate and retroactive rather than something to wait out. |

## Appending a row

One row per shipped AEO change, newest last. Take the date from
`git log -1 --format=%cd --date=short <commit>` on `main` — do not fill it in from memory. Reuse
an existing `cohort_id` from `url-cohorts.csv`; do not start a parallel numbering scheme. Rows
are append-only: correct a mistake in place and note the correction rather than deleting
history, and fill `result` in when the evaluation window closes.
