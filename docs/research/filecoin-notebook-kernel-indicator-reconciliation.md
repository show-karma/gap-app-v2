# Filecoin notebook Kernel and indicator reconciliation

Observed against the production GAP API on 2026-08-31. Values below are a
point-in-time audit, not fixtures. The query code validates the same invariants
on every cache miss so a future disagreement fails visibly instead of becoming
a plausible dashboard.

## Query inventory

| Query | Authoritative endpoint(s) | Preset/cache dimensions | Renderer-ready result |
| --- | --- | --- | --- |
| `getNotebookKernelData` | `/v2/kernel/overview`, `/v2/kernel/functions` | `30d`, `90d` (default), `12m`; one-hour cache per preset | Five canonical KPIs, tier rollups, declared inventory columns and flattened rows |
| `getNotebookIndicatorCatalog` | `/v2/indicators` | One-hour catalog cache; all pages | Alphabetized picker options `{ id, label, description, unit, kernelId, syncType }` |
| `getNotebookIndicatorSeries` | `/v2/indicators/:id`, `/v2/indicators/:id/datapoints` | `30d`, `90d`, `12m`, `all` (default), plus optional `projectUID`; one-hour cache per complete key | Numeric UTC-day points, pre-filter latest point, and point-quality counts |

`12m` maps to the Kernel API's maximum 365-day rolling window. For indicator
series it means the same UTC calendar day twelve months earlier. `30d` and
`90d` are inclusive of the current UTC day. `all` is deliberately the
indicator default: these feeds are not uniformly dense, so a default window
must not manufacture an empty chart.

Pagination is also bounded: at most 100 pages / 10,000 rows are accepted and
no more than 10 page requests run concurrently. A corrupt total therefore
cannot turn one server render into an unbounded upstream fan-out.

## Kernel KPI reconciliation (90-day window)

| KPI id | Production API | Independent check | Canonical definition / decision |
| --- | ---: | ---: | --- |
| `kernelFunctionsInScope` | 29 | 29 function rows have `isInScope=true`; tier `inScope` sums to 29 | Count of catalogued functions inside the program scope. |
| `kernelFunctionsMeasured` | 16 | 16 function rows have both `isInScope=true` and `measured=true` | Count, not a percentage. The API's `measurementCoveragePct=55.2` is retained as the `16 / 29` hint. The out-of-scope measured Important function is correctly excluded. |
| `kernelSlaMet` | `null` (`passed=0`, `scored=0`) | No denominator exists | Pooled passed/scored readings from `program.healthMet`; never an average of function percentages and never coerced to `0%`. filpgf.io currently renders the scored count (`0`) while thresholds are withdrawn; both surfaces retain the same API semantics. |
| `kernelCoverage` | 96.0% (`679 / 707`) | `679 / 707 × 100 = 96.04%`, API-rounded to one decimal | Pooled received/expected collection periods from `program.coverage`; never a mean of tier or function percentages. |
| `kernelProjectsReporting` | 14 | `program.projectsReporting=14` and filpgf.io's live “Teams reporting” tile reads that same field | Distinct projects with at least one Kernel reading, all time. Do not sum per-tier or per-function project counts because projects repeat. |

The query additionally checks `unmeasuredInScope = functionsInScope -
functionsMeasured` (13) and rejects either endpoint if it reports a different
window than requested.

## Tier SLA and coverage reconciliation (90-day window)

Every number below is returned directly in `/v2/kernel/overview`; percentage
columns are independently checked against their numerator and denominator.
The function inventory independently reproduces each tier's catalogued,
in-scope and measured counts.

| Tier | Catalogued | In scope | Measured | Commitments | Projects | Readings | Last reading | SLA passed/scored | SLA met | Coverage received/expected | Coverage |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- | ---: | ---: | ---: | ---: |
| Irreplaceable | 5 | 5 | 1 | 1 | 1 | 13 | 2026-08-25 | 0 / 0 | null | 10 / 10 | 100% |
| Essential | 24 | 24 | 15 | 32 | 13 | 454 | 2026-08-25 | 0 / 0 | null | 654 / 682 | 95.9% |
| Important | 2 | 0 | 1 | 4 | 1 | 26 | 2026-08-25 | 0 / 0 | null | 15 / 15 | 100% |
| Nice to have | 0 | 0 | 0 | 0 | 0 | 0 | — | 0 / 0 | null | 0 / 0 | null |

## Function inventory reconciliation

Production returned 31 unique function rows: 5 Irreplaceable, 24 Essential, 2
Important and 0 Nice-to-have. The table contract intentionally exposes only
the columns below. This is the complete builder vocabulary; additive API fields
do not silently become selectable columns.

| Declared column | API source | Transformation |
| --- | --- | --- |
| Function | `kernelFunction` | Rename only |
| Tier | `tier` | Closed four-tier vocabulary |
| Category | `category` | None |
| Subcategory | `subCategory` | Rename only |
| In scope | `isInScope` | None |
| Maintainers | `maintainers` | Validated non-negative integer |
| Measured | `measured` | None |
| Commitments | `commitments` | Validated non-negative integer |
| Projects reporting | `projectsReporting` | Validated non-negative integer; never summed for a program total |
| Readings | `readings` | Validated non-negative integer |
| Last reading | `lastReadingAt` | ISO timestamp or null |
| SLA met | `sla.metPct` | Direct nullable percentage; passed/scored validation happens before mapping |
| Coverage | `coverage.pct` | Direct nullable percentage; received/expected validation happens before mapping |

`kernelId` remains the stable row identity but is not an author-selectable
display column. `kernelValue`, `collectingSince`, and the nested numerator data
remain outside this inventory-table vocabulary; adding any of them requires an
explicit contract decision rather than renderer introspection.

## Recorded report/API divergences

The older `filecoin-grants` README is historical evidence, not a source to
force the live data to resemble:

| Figure | Older report/design record | Production API on 2026-08-31 | Decision |
| --- | ---: | ---: | --- |
| Declared/listed functions | 29 declared, 22 said to be listed; design rendered 18 | 31 catalogued, 29 in scope | API inventory is authoritative. Do not trim the two out-of-scope Important rows or invent a “22 listed” metric. |
| Irreplaceable / Essential inventory | Design rendered 4 / 14 while report declared 5 / 24 | 5 / 24 catalogued | API rows and tier rollup agree exactly. |
| Tier SLA | Design-derived 96.3% / 96.0%; report 97.3% / 96.5% | Both tiers unscored (`metPct=null`) because no thresholds are in force | Preserve null. Historical percentages must not be shown as current health. |
| Program SLA tile | Static `KERNEL_METRICS` prose assumed a scored percentage | `passed=0`, `scored=0`, `metPct=null` | Null is the KPI value; the explanatory hint names the missing threshold. |

## Indicator catalog and series reconciliation

| Surface | Production observation | Query result / rule |
| --- | --- | --- |
| Catalog | Default `/v2/indicators` payload has 20 rows, but pagination reports 467 total | Read five pages at 100/page: 467 fetched, 467 unique IDs, including 37 Kernel-linked indicators. A page-count mismatch or duplicate ID fails the query. |
| Wire value | `datapoint.value` is a string, including values such as `"357440"` and `"0"` | Trim, convert with `Number`, retain only finite values. Empty, null and non-numeric values are counted as discarded and never become zero. |
| Date identity | Datapoints carry start and end timestamps | Use the UTC day from `endDate`, matching the Kernel page's existing normalization. Sort ascending. A later-updated row for the same day supersedes the older correction. |
| Empty preset window | A selected preset may contain no point even though the indicator has history | `latestPoint` is computed before filtering, so the renderer can say “no data in range; latest YYYY-MM-DD.” |

The production `drand-relay-statuspage` indicator demonstrates why both
pagination and bad-point policy are correctness requirements:

| Check | API | Chart-ready result as of 2026-08-31 |
| --- | ---: | ---: |
| Rows | 378 across 4 pages (the default response exposes only 20) | All 378 inspected |
| Valid numeric days | 376 | 376 for `all` |
| Missing values | 2 empty strings, on 2026-08-22 and 2026-08-23 | 2 discarded; neither becomes a zero |
| Preset counts | — | 10 (`30d`), 58 (`90d`), 334 (`12m`), 376 (`all`) |
| Latest valid point | `2026-08-25`, wire value `"0"` | `{ date: "2026-08-25", value: 0 }` |

The datapoint endpoint accepts `projectUID`, and that scope is included in the
cache key when supplied. The unfiltered DTO does not expose project identity;
consumers that need a project-specific line must pass the project UID rather
than infer provenance from `proof`, `source`, or duplicate dates.
