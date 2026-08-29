# Filecoin notebook metric reconciliation

Observed against the production GAP API on 2026-08-29. The notebook query uses
`/metrics` and `/stats` concurrently, but the checks below were performed through
separate raw endpoints and aggregations rather than through the query being tested.

## Blocking KPI reconciliation

| KPI | `/v2/communities/filecoin/metrics` | Independent/canonical result | Chosen source | Decision |
| --- | ---: | ---: | --- | --- |
| Committed | 9,246,697 USDC | 9,246,697 USDC, sum of four successful per-program `/financials` summaries | `/metrics` | Exact match. |
| Disbursed | 6,369,766 USDC | 6,369,766 USDC, sum of four successful per-program `/financials` summaries | `/metrics` | Exact match. |
| Funded projects | 47 `funding.totals.distinctProjects` | 48 from `/stats.totalProjects`; 48 distinct project UIDs in raw `/communities/filecoin/grants` | `/stats` | Match the existing app header. `/metrics` only sees projects represented in Program Financials. |
| Milestone completion | 52.7%, an unweighted mean of per-project rounded percentages | 102 completed / 197 countable = 51.8%, rendered as 52% by the app; raw grants contain 199 milestones, of which 2 are cancelled | `/stats` | Match the existing app header's fraction and rounding. Do not use the semantically different 52.7%. |

The disbursed tile's secondary value also reconciles: `/metrics` reports
2,928,731 USDC remaining and the sum of the per-program `/financials` summaries
is 2,928,731. It is intentionally not `allocated - disbursed`: Batch 1 is
over-disbursed by 51,800 and each program floors its own remaining amount at zero.

Current surface comparison:

- `app.filpgf.io` consumes `/stats` and shows 48 projects and 102 / 197
  milestones (52%). The notebook query matches it.
- `filpgf.io` currently consumes `/metrics`, so it shows 47 projects. Its
  completion headline truncates 52.7% to 52%, which happens to display the same
  integer despite using a different definition. The project discrepancy is
  pre-existing; choosing 48 avoids creating a third value and the upstream
  follow-up will let this surface converge.

## Program funding bars

Each row was independently read from
`/v2/programs/{programId}/financials?page=1&limit=100`. Their sums reproduce the
community `/metrics` totals exactly.

| Program | Allocated | Disbursed | Remaining | Project rows |
| --- | ---: | ---: | ---: | ---: |
| Filecoin ProPGF Batch 1 (`1013`) | 3,741,800 | 3,793,600 | 0 | 14 |
| Filecoin ProPGF Batch 2 (`992`) | 2,723,000 | 2,012,829 | 710,171 | 16 |
| Filecoin ProPGF Batch 3 (`1479`) | 2,168,267 | 0 | 2,168,267 | 18 |
| ProPGF Batch 2 - Pods Track (`1039`) | 613,630 | 563,337 | 50,293 | 3 |
| **Total** | **9,246,697** | **6,369,766** | **2,928,731** | **51** |

Program `1400` is a reporting form and returns 404 from `/financials`; the
community aggregate correctly omits it. In the chart-ready result every row's
bar `total` is 3,741,800, the largest allocation, so lengths remain comparable.

## Completion-by-track bars

This check joined the public track-assignment endpoints to the independent
per-program `/financials` project rows, then averaged those rows locally.

| Track | Assigned projects | Financial rows used | Raw completion values | Independent mean | `/metrics` |
| --- | ---: | ---: | --- | ---: | ---: |
| Kernel | 14 | 13 | twelve 0s and one 17 | 1.3% | 1.3% |
| Revenue Development | 3 | 3 | 100, 100, 100 | 100.0% | 100.0% |

The fourteenth Kernel assignment has no Program Financials row and is excluded
by the same financial-data boundary as the aggregate. The null-track remainder
is not a named track and is deliberately omitted from the result. R&D has no
funding track row yet, so it is absent rather than represented as a fabricated
zero.

## Applications

Summing each program's public application metrics independently reproduces the
community `/metrics` values: 205 total, 52 approved, 151 rejected, 1 pending,
1 under review, and 0 revision requested. The chart-ready groups are therefore
Approved 52, Under review 2, and Not approved 151. Zero groups are omitted.

## Contract implications

- `getNotebookMetrics` is the sole aggregation seam. Components and builder
  configurations receive only `{ currency, stats, funding, completion,
  applications }` and perform no metric math.
- Both production reads are public, runtime-validated, and started in one
  `Promise.all` so the second correctness source does not double cold latency.
- A missing funding block, impossible milestone count, unsafe community ID, or
  mixed/missing currency fails visibly rather than publishing plausible zeros
  or mixed-currency sums.
- Indicators are not part of this seed dashboard's agreed result shape. No
  indicator fetch or aggregation is performed until an indicator chart is
  selected in a later builder increment.
