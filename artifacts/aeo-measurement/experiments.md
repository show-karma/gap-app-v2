# AEO-12 experiment contracts (DEV-595)

Pre-registered measurement contracts for the six-page AEO-12 experiment slate. One contract per
page, written **before** the corresponding content ships, so the pass/fail rule cannot be fitted
to the outcome. Cohort ids reference `url-cohorts.csv`; prompt ids reference `prompts.csv`; GSC
queries come from the 3-month Search Console export (2026-05 → 2026-08) captured for DEV-588.

## Shared methodology

Mirrors the DEV-583 methodology recorded in `baseline-report.md`:

- **Comparison is always relative to the paired control cohort**, never absolute. Site-wide or
  platform-wide effects (Profound config changes, index-wide crawls, seasonality) hit both the
  changed cohort and its control; only the difference is attributable to the experiment.
- **Windows:** two consecutive 7-day windows after ship. W1 = ship date + 1 through +7,
  W2 = +8 through +14. A day counts only if Profound produced a daily run for it.
- **Pass rule:** the changed cohort's primary metric improves **relative to its control in both
  W1 and W2**. Movement in only one window is `inconclusive - extend one window`; movement in
  neither is `fail`. A control cohort that itself receives treatment during the windows voids
  the read (see the C02/C04 precedent in `url-cohorts.csv`).
- **Ship date** = the day the change reaches `main` (git history, same convention as
  `releases.csv` `date_utc`), not the production tag date. Every ship also appends a
  `releases.csv` row at ship time; evaluation dates below stay `TBD` until then.
- Prompts flagged `control_flag=yes` in `prompts.csv` are never claimed as targets.

Metrics glossary:

- *Citation share / citation rank*: Profound Answer Engine Insights, per-page.
- *Visibility*: Profound unbranded Visibility Score contribution on the listed prompt ids.
- *GSC clicks / CTR / position*: Google Search Console, per-URL, read directly from GSC
  (Profound's GSC integration exposes no metrics on this tier — see `baseline-report.md`).

---

## E1 — /for-agents

| Field | Value |
|---|---|
| Hypothesis | Answer engines skip /for-agents because the page never states what the MCP server is, where it lives, or which operations need authentication in direct-answer form. Putting the endpoint URL, the capability list with auth boundaries, and Claude/ChatGPT connection facts into server-rendered copy makes it citable for agentic-lane prompts, and a concrete title/meta lifts its 0% GSC CTR. |
| Primary audience + task | Foundations (agentic): a grants professional or technical evaluator asking an answer engine which grant platforms expose an MCP server and what Karma's can do. |
| Target prompts | P005, P013, P016, P020, P023, P026, P036, P046 (foundations-agentic lane) |
| Target GSC queries | None ranked today — /for-agents has 148 impressions, 0 clicks, position 10.6; secondary goal is any non-zero CTR on its impression set. |
| Changed cohort | C10 (/for-agents) |
| Control cohort | C11 (/mcp/connect) — the only untouched foundations-agentic route. Known interference: P005/P013/P036 list /mcp/connect as `target_page`, so a successful /for-agents experiment may also lift C11 citations. If both rise together, read the pair against C06 as a secondary sanity check and record the ambiguity. |
| Primary metric | Citation share + citation count for /for-agents on the target prompts (baseline: zero citations, see `baseline-report.md` Finding 1). |
| Secondary metric | GSC CTR on /for-agents; recommendation rate on P016/P020/P023/P026/P036/P046. |
| Pass/fail | Pass = /for-agents earns citations on target prompts and outperforms C11's citation-share movement in both W1 and W2. |
| Evaluation dates | Ship date: TBD (PR open). W1/W2: TBD at ship. |

## E2 — /funding-map

| Field | Value |
|---|---|
| Hypothesis | /funding-map earns 12.6k impressions but only 30 clicks (0.24% CTR at position 8) because (a) all program content is client-rendered — the server HTML contains no program names, counts, or ecosystem names, (b) the title/meta ("Directory of Funding Programs") does not match the ecosystem-grant queries it actually ranks for, and (c) it has no crawlable links to program detail pages, so it accumulates no internal-link relevance. Server-rendering an answer-first intro with live counts, ecosystem-aware title/meta, and crawlable program links raises CTR and position on those queries. |
| Primary audience + task | Nonprofits / builders looking for open funding programs in a specific ecosystem ("optimism grants", "celo grants", "web3 developer grant programs 2026"). |
| Target prompts | P030, P035, P037 (nonprofits lane, funder-discovery adjacent — `target_page` is /nonprofits/find-funders, so citation movement here is secondary, not primary). |
| Target GSC queries | "optimism grants" (92 impr), "optimism grants official" (141), "polygon grants" (55), "celo grants" (23) + "celo grants ecosystem programs january 2026" (46), "scroll zkp grants january 2026" (187), "web3 developer grants program 2026 applications open ecosystem fund" (96), "defi grants opportunities 2026" (29), plus the long tail of "<ecosystem> web3 grant programs 2026" queries. |
| Changed cohort | C18 (/funding-map) |
| Control cohort | C14 (/nonprofits) — same audience lane, genuinely untouched, not in the experiment slate. Shared with E5 (documented, mirrors the C17 shared-control precedent). |
| Primary metric | GSC clicks and CTR on /funding-map vs C14. |
| Secondary metric | GSC average position on the target queries; impressions on /community/*/programs/* detail pages newly linked from the map. |
| Pass/fail | Pass = /funding-map CTR and clicks improve relative to C14 in both W1 and W2 (GSC windows use the same 7-day construction). |
| Evaluation dates | Ship date: TBD (PR open). W1/W2: TBD at ship. |

## E3 — /foundations

| Field | Value |
|---|---|
| Hypothesis | /foundations is the designated primary page for 16 lifecycle prompts yet earns zero citations and is absent from GSC's top-1000 pages; the citations flow to docs pages instead (`/overview/how-does-it-work`, `/how-to-guides/for-grant-managers`). Absorbing the citable substance of those docs pages (how projects/grants/milestones/updates work, what grant managers can verify) into direct-answer server HTML on /foundations moves the citations onto the primary page. |
| Primary audience + task | Foundation staff evaluating grants-management platforms: application intake, review, milestone-gated payouts, impact reporting. |
| Target prompts | P001, P002, P006, P008, P010, P015, P019, P022, P027, P032, P038, P040, P047 (foundations-lifecycle lane, excluding control-flagged P029/P033/P044/P050) |
| Target GSC queries | None today — /foundations is absent from the top-1000 pages export; secondary goal is entering it. |
| Changed cohort | C09 (/foundations) |
| Control cohort | C16 (/funders) — same lane, untouched. Caveat: C16 is the site's only citation-earning marketing page (3.65% share, rank #1), so it is a high-baseline control; the read is relative *movement*, not levels. |
| Primary metric | Citation share for /foundations on target prompts vs C16 movement. |
| Secondary metric | Recommendation rate on the comparison prompts (P001/P006/P008/P022/P040); appearance of /foundations in GSC top pages. |
| Pass/fail | Pass = /foundations earns citations on target prompts and outperforms C16's citation-share movement in both W1 and W2. |
| Evaluation dates | Ship date: TBD (not started). W1/W2: TBD at ship. |

## E4 — /nonprofit-research

| Field | Value |
|---|---|
| Hypothesis | Diligence prompts are won by lookup/verify pages (Candid, Charity Navigator own the category at 49.1%/23.6% visibility). /nonprofit-research earns zero citations and is absent from GSC because it does not state in server HTML what the product verifies (IRS Pub 78, Form 990 recency, state registration) or how shortlists are built. Direct-answer verification copy makes it citable for vetting prompts. |
| Primary audience + task | Donor advisors at community foundations / DAF sponsors vetting and shortlisting nonprofits before recommending a gift. |
| Target prompts | P003, P004, P009, P017, P024, P034, P041, P042 (donor-advisors lane targeting /nonprofit-research) |
| Target GSC queries | None today — absent from the top-1000 pages export. |
| Changed cohort | C13 (/nonprofit-research) |
| Control cohort | C12 (/donor-advisors) — same lane, untouched, not in the slate. Known interference: P021/P025/P045 target C12 itself; if both rise together, record the ambiguity and read against C06 as a secondary check. |
| Primary metric | Citation share for /nonprofit-research on target prompts vs C12 movement. |
| Secondary metric | Recommendation rate on P009/P017/P041 (the Candid/Charity Navigator comparison prompts). |
| Pass/fail | Pass = /nonprofit-research earns citations on target prompts and outperforms C12's citation-share movement in both W1 and W2. |
| Evaluation dates | Ship date: TBD (not started). W1/W2: TBD at ship. |

## E5 — /nonprofits/find-funders

| Field | Value |
|---|---|
| Hypothesis | Funder-discovery prompts recommend research platforms (Instrumentl, Candid) while /find-funders earns zero citations. The page already ships the eligibility fix (R2026-08-03-g restored SSR); what is missing is direct-answer substance: what the funder database covers (990/990-PF filings), how past grants inform typical grant size, and that it works from ChatGPT/Claude. Adding that to server HTML makes it citable for the nonprofits lane. |
| Primary audience + task | Small-nonprofit staff finding foundations likely to fund organizations like theirs, without a paid research subscription. |
| Target prompts | P007, P011, P018, P028, P030, P035, P037, P043, P048 (nonprofits lane, excluding control-flagged P031) |
| Target GSC queries | None attributable today. |
| Changed cohort | C15 (/nonprofits/find-funders). Note: C15 was already changed by R2026-08-03-g (eligibility SSR fix); this experiment's windows are read from its **own** ship date, and the R2026-08-03-g effect is part of its starting state. |
| Control cohort | C14 (/nonprofits) — same lane, untouched. Shared with E2 (documented, mirrors the C17 shared-control precedent). |
| Primary metric | Citation share for /nonprofits/find-funders on target prompts vs C14 movement. |
| Secondary metric | Recommendation rate on P011/P030/P035 (comparison/category prompts). |
| Pass/fail | Pass = /nonprofits/find-funders earns citations on target prompts and outperforms C14's citation-share movement in both W1 and W2. |
| Evaluation dates | Ship date: TBD (not started). W1/W2: TBD at ship. |

## E6 — /knowledge/ai-grant-evaluation

| Field | Value |
|---|---|
| Hypothesis | AI-assisted-review prompts (should foundations let AI score applications; which platforms offer AI review with human sign-off) have no citable primary page; the knowledge article is the natural target but does not answer them in direct-answer form. Strengthening it with explicit answers on scoring, human oversight, and review-time claims (only those verifiable on karmahq.xyz) earns citations in the agentic/AI-review prompt cluster. |
| Primary audience + task | Foundation staff deciding whether and how to adopt AI-assisted application scoring with defensible human oversight. |
| Target prompts | P006, P015, P026, P046, P047 (the AI-assisted-review cluster across lanes) |
| Target GSC queries | None today. Adjacent observed queries: "grant lifecycle" (523 impr, position 32) cluster lands on the sibling C06 control page — those are explicitly NOT targets, C06 must stay untouched. |
| Changed cohort | Within C05 (/knowledge/*). C05 is already a changed cohort (date-model, R2026-07-30-c); a dedicated page-level cohort row for /knowledge/ai-grant-evaluation is added to `url-cohorts.csv` at ship time so the page can be read separately from the rest of C05. |
| Control cohort | C06 (/knowledge/grant-lifecycle) — the designated untouched knowledge-page control. **Never modify it** (it is also the untouched control for the C05 date-model release). |
| Primary metric | Citation share for /knowledge/ai-grant-evaluation on target prompts vs C06 movement. |
| Secondary metric | Recommendation rate on P046 (category-discovery). |
| Pass/fail | Pass = the page earns citations on target prompts and outperforms C06's citation-share movement in both W1 and W2. |
| Evaluation dates | Ship date: TBD (not started). W1/W2: TBD at ship. |

---

## Bookkeeping rules

- When an experiment ships: fill its evaluation dates here, append the `releases.csv` row, and
  flip (or add) the cohort row in `url-cohorts.csv` from control to changed with the release id.
- Mid-baseline shipping is accepted (ship-when-ready decision on DEV-595); every ship MUST be
  annotated in `releases.csv` the same day so the baseline window can be segmented.
- If a control listed here receives any treatment before its experiment's windows close, the
  read is void — document it in `url-cohorts.csv` notes exactly as was done for C02/C04.
