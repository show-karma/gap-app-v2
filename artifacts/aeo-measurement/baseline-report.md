# AEO measurement baseline — Karma

Issue: [DEV-587](https://linear.app/showkarma/issue/DEV-587) (AEO-04) · Umbrella: [DEV-583](https://linear.app/showkarma/issue/DEV-583)
Report opened: 2026-07-31. Last revised: 2026-08-03. **Baseline is not yet complete** — see
"Baseline status".

> **Read this first.** This is a *post-eligibility-fix* starting state, not a pre-change
> baseline. The AEO eligibility work had already shipped to production (`v1.8.19` on 2026-07-30,
> `v1.8.20` on 2026-08-03) before the measurement layer was capable of recording a valid number,
> and every Profound reading dated before 2026-07-31 is void. Details in
> [Baseline status](#baseline-status--not-complete).

## Platform configuration as observed

| Item | Value | Source |
|---|---|---|
| Workspace | `c7c0a9e8-3710-4d85-a4fa-61973c8fe954` / Karma | Profound URL |
| Brand asset | Karma (Owned) | Settings → Brand Details |
| Website | `karmahq.xyz` | Settings → Brand Details |
| Canonical production host in repo | `https://www.karmahq.xyz` | `app/robots.ts`, `utilities/meta.ts` |
| Prompt set | 50 / 50, 10 topics, 0 tags, 2 analysis types, run daily | Prompts tab |
| Platforms measured | **ChatGPT only** | Platforms tab |
| Regions | Enterprise-gated ("Request Access") | Regions tab |
| Personas | **Enterprise-gated**; defaults are generic (Marketing Manager, Software Engineer…) and do not match Karma's audiences | Personas tab |
| Prompt count | **59 / 50** — over the plan limit (50 visibility + 9 auto-generated sentiment) | Prompt Designer |
| Citation categories | 25 entries; `karmahq.xyz` = Owned, rest Social | Settings |
| Google Search Console | connected `amaury@karmahq.xyz`, scope **Organization** | Integrations |
| Google Analytics | connected `amaury@karmahq.xyz`, scope **Personal** | Integrations |
| Sanity | connected (CMS; not a measurement source) | Integrations |
| Agent Analytics metrics | **locked** on this tier | Pages → Customize |
| First day of data collection | **2026-07-31** (only selectable date) | Pages → date picker |

### Licensed tier

**Starter.** ChatGPT is the only platform carrying data and Regions is gated behind an
Enterprise upsell. This matches the tier description in the plan: ChatGPT only, 50 prompts,
no exports. Consequences that must be respected downstream:

- Do **not** design around the Profound API, Prompt Volumes, or Aim.
- Prompt-set state in Profound is mutable in place with no export, so `prompts.csv` in this
  directory is the authoritative frozen record of what was measured.
- Multi-engine claims (Perplexity, Google AI Overviews, Claude) cannot be made from this account.

## Day-0 finding: visibility was structurally broken, not genuinely zero

At first inspection every visibility metric read `0%` / `–` and the platform showed the banner
*"Your brand was not found in the AI answer results."*

Root cause: **Name Matching had 0 mapped aliases and 71 unmapped mentions.** The mention
`Karma` (14 occurrences) was sitting unmapped, so no answer-engine mention was ever attributed
to the owned asset. Citation Share was already non-zero for several topics (55.6% on
*"Karma. What it is and who it's for?"*, 21.7% on *"Karma vs Competitors"*), which confirms
Karma was being cited all along — only the brand-mention attribution was missing.

### Fix applied 2026-07-31

1. Mapped to the owned `Karma` asset: `Karma`, `KarmaHQ`, `Karma Nonprofit Research`.
2. Entity-parser additional instructions set to disambiguate Karma from unrelated
   Karma-named companies and to require product claims be verifiable on `karmahq.xyz`.
3. Blacklisted `Credit Karma`, `Fanpage Karma`, `KarmaKonnect` as competitors.
4. Added 12 domains as citation category **Competition** (previously uncategorised, or
   miscategorised as Institution/Other): `candid.org`, `guidestar.org`, `fluxx.io`,
   `submittable.com`, `instrumentl.com`, `blackbaud.com`, `foundant.com`, `smartsimple.com`,
   `sopact.com`, `dapplehq.com`, `charitynavigator.org`, `grants.gov`. Without this the
   Citation Categories breakdown had no Competition bucket at all, so owned-vs-competitor
   citation share was unmeasurable. `irs.gov` and `nsf.gov` were deliberately left as
   Institution — they are regulators and a source Karma itself cites for diligence.
5. Moved 17 branded prompts from Visibility to Sentiment (see below).

Immediately after mapping, Visibility Score moved from `0%` to `100%` at rank `#1` across all
10 topics, applied retroactively to already-collected runs.

> **Do not treat that 100% as a result.** It is the *first* reading in which the metric is
> defined at all, and it was taken on the "Today" window with Share of Voice also reading 100%,
> which is implausible given Candid/Fluxx/Submittable all appear in the same answers. Treat
> every number recorded before the fix as void, and re-read after 14 clean daily runs.

### Deliberate deviation: competitor mode left on Blacklist

The instruction was to track the grants-management competitors *and* the directories *and*
exclude the look-alikes. Switching Profound to Whitelist ("include") mode would have **limited
all reporting to a fixed list** and dropped organically discovered competitors. Blacklist mode
already tracks Candid, Fluxx, Submittable, SmartSimple, Foundant, Instrumentl, Blackbaud,
Grants.gov and Charity Navigator automatically, so the intent is met with better coverage by
staying on Blacklist and excluding only the three name collisions.

## Entity-accuracy finding

Answer engines produced the mention **"Karma Grant Atlas"**. The string `Grant Atlas` does not
appear anywhere in `gap-app-v2`. It is treated as a hallucinated product and was deliberately
**left unmapped** — mapping it would have inflated visibility with a product that does not
exist. This is a tracked entity-accuracy defect, not a mapping gap.

Also left unmapped, as unrelated companies: `Credit Karma`, `Fanpage Karma`, `KarmaKonnect`.

## Prompt-type correction: 17 branded prompts were inflating visibility

Profound's Prompt Designer raised its own warning: *"17 branded prompts could be inflating your
visibility. It is best practice to move all branded prompts from visibility to sentiment."*

This is the direct explanation for the implausible 100% Visibility / 100% Share of Voice noted
above — 17 of the prompts name Karma explicitly, so Karma appears in every response by
construction and the visibility metric could not fall below 100%.

**Applied 2026-07-31:** all 17 were moved from Visibility to Sentiment and the change was
verified to persist after reload. This does not delete them — they still run daily and still
produce sentiment and claim-accuracy signal, which is what branded prompts are actually good
for. It leaves the unbranded prompts to measure genuine discovery.

Doing this before the 14-day clock starts is deliberate: the plan forbids editing prompts
during an active experiment, and there is no active experiment yet.

Consequence for `prompts.csv`: rows whose prompt text names Karma are now sentiment/accuracy
instruments, not visibility instruments. `citation_goal` and `recommendation_goal` remain valid;
do not read a visibility number off them.

## Open defect: Karma is described to answer engines as "the Blockchain company"

Nine auto-generated sentiment prompts run daily in the form:

> `Evaluate the Blockchain company Karma on <topic>`

Every one of the ten topics is a grantmaking, donor-advisory or nonprofit-funding topic. Framing
Karma as *"the Blockchain company"* in that context pushes the answer engine toward a crypto
framing of a grants-and-impact product, and it shapes the sentiment metric daily.

**Not changed here.** Karma's self-description is a positioning decision, and the umbrella plan
lists corporate messaging approval as explicitly out of scope. This is logged for
[DEV-609](https://linear.app/showkarma/issue/DEV-609) (AEO-15, reconciling Karma's
self-description across agent-facing surfaces), which is the issue that owns it.

Suggested replacement wording, for approval: *"the grants and impact platform Karma"*.

## Prompt set composition

`prompts.csv` records the 50 live prompts verbatim, with audience lane, intent, target page,
citation/recommendation goals and control flag assigned here (this is the DEV-589 / AEO-06
mapping applied to the set that is actually running).

| Lane | Planned | Actual | Delta |
|---|---|---|---|
| Foundations — operational lifecycle | 20 combined | 16 | — |
| Foundations — agentic | (same 20) | 8 | **+4 over plan** |
| Donor advisors | 10 | 12 | +2 |
| Nonprofits looking for funders | 10 | 11 | +1 |
| Karma/entity accuracy | 5 | 3 | **−2 under plan** |
| Unchanged category controls | 5 | 6 | +1 |

The live set is over-weighted toward foundations and **under-weighted on entity-accuracy
prompts (3 vs 5)**. Entity accuracy is the lane that catches hallucinations like
"Karma Grant Atlas", so this gap matters. Per the plan's own rule, prompts must not be edited
during an active experiment — retire and re-issue with new IDs at the next revision instead.

Intent coverage across the set: problem/how-to 19, factual/entity 11,
recommendation/comparison 10, category discovery 10.

Profound's own 10-topic grouping is the source of truth in-platform and was not transcribed
here; only *Karma vs Competitors* was verified against the UI directly.

## Baseline status — NOT complete

| Requirement | Status |
|---|---|
| Versioned 50-prompt set | done (`prompts.csv`) |
| Changed / control URL cohorts | done (`url-cohorts.csv`) |
| Release log | done (`releases.csv`) |
| 14 daily Answer Engine Insights runs | **not started on valid data** — day 1 is 2026-07-31 |
| 28 days GSC / GA4 context | **not captured** — connected, but must be exported from GSC directly |
| Full technical production crawl | **not run** — and when it runs it will be a *post-fix* snapshot, see below |

**The 14-day clock restarts at 2026-07-31.** Every run before the alias fix produced
unattributable brand data. Earliest date a baseline can be read: **2026-08-14**.

### This is not a pre-change baseline — read it as a post-fix starting state

The eligibility fixes shipped **before** any of this measurement was capable of recording a
number, so nothing in this directory describes the site as it was *before* the AEO work. Two
production releases had already gone out:

| Tag | Date | Contents |
|---|---|---|
| `v1.8.19` | 2026-07-30 | AEO-01 (PR 1957), AEO-02 (PR 1956), AEO-07 (PR 1953), AEO-08 (PR 1954) |
| `v1.8.20` | 2026-08-03 | AEO-10 + AEO-15 (PR 1955), AEO-09 (PR 1961), AEO-11 (PR 1960), AEO tooling debt (PR 1965) |

> **The pending full technical production crawl will therefore be a post-eligibility-fix
> snapshot, not a true pre-change baseline.** Do not present it, or anything derived from it, as
> evidence of the site's condition before the AEO work. It measures the new starting state.

PR 1955 is worth calling out separately: it merged at `2026-07-31T04:29Z`, *after* the `v1.8.19`
tag was cut on 2026-07-30, so AEO-10 and AEO-15 reached production in `v1.8.20` on 2026-08-03 —
not in `v1.8.19` alongside the other four P0 fixes. `releases.csv` dates those two rows by the
day they reached `main` (2026-07-31), which is the date to use when reading analytics, not the
tag date.

All of these releases are logged in `releases.csv`. Their effect cannot be separated from the
baseline; they should be read as part of the new starting state, not as measurable experiments.

### No Profound reading before 2026-07-31 is usable as baseline

Both failure modes documented above were live simultaneously until 2026-07-31, and they pull in
opposite directions, so nothing recorded before that date can be repaired after the fact:

1. **Visibility Score read `0%`** because Name Matching had **0 mapped aliases** — no
   answer-engine mention was ever attributed to the owned asset (`releases.csv`,
   `R2026-07-31-b`).
2. **17 branded prompts were inflating visibility** toward a construction-guaranteed `100%` —
   they name Karma explicitly, so Karma appears in every response by construction and the metric
   could not fall below 100%. They were moved from Visibility to Sentiment on 2026-07-31
   (`releases.csv`, `R2026-07-31-d`).

> **Treat every Profound number dated before 2026-07-31 as void — not low, not high, but
> undefined.** Do not chart it, quote it, or use it as a comparison point. The first defensible
> reading is the 14-day window opening 2026-07-31 and closing **2026-08-14**.

## Day-0 citation landscape (2026-07-31, all data to date)

Eight owned pages earned citations. Ranked by Citation Share:

| Page | Citation Share | Citation Rank | In AEO route map? |
|---|---|---|---|
| `/funders` | 3.65% | #1 | **yes** — foundations lifecycle |
| `/overview/how-does-it-work` | 2.74% | #2 | no |
| `/` (variant A) | 2.28% | #3 | entity-accuracy target |
| `/how-to-guides/for-grant-managers` | 1.37% | #5 | no |
| `/` (variant B) | 0.91% | #12 | entity-accuracy target |
| `/how-to-guides/for-builders` | 0.46% | #22 | no |
| `/how-to-guides/for-community-members` | 0.46% | #22 | no |
| `/terms-and-conditions` | 0.46% | #22 | no |

### Finding 1 — seven of eight primary audience routes earn zero citations

Only `/funders` appears. `/foundations`, `/donor-advisors`, `/nonprofit-research`,
`/nonprofits`, `/nonprofits/find-funders`, `/for-agents` and `/mcp/connect` have **no citations
at all**, while docs-style pages that are not in the route map (`/overview/how-does-it-work`,
`/how-to-guides/*`) are absorbing the citations instead.

This is the single strongest input available to AEO-06 (DEV-589) and AEO-12 (DEV-595): the
routes the strategy designates as primary are not the routes answer engines actually cite.
`/terms-and-conditions` earning a citation is pure waste.

### Finding 2 — the Pages view collapses paths across the docs subdomain

`/` appears **twice** as separate rows (2.28% and 0.91%). Cross-referencing the Citations tab
resolves why: the Pages view strips the host and shows only the path, while `karmahq.xyz` is
registered with **1 subdomain**. The Citations tab lists the real URLs:

- `karmahq.xyz/funders`
- `docs.gap.karmahq.xyz/overview/how-does-it-work`
- `karmahq.xyz/`
- `docs.gap.karmahq.xyz/how-to-guides/for-grant-managers`

So `/overview/how-does-it-work`, `/how-to-guides/*` and the second `/` row are all on
**`docs.gap.karmahq.xyz`**, not the marketing site.

> This corrects an earlier reading of these rows as a `www` vs non-`www` canonical split.
> It is not a duplication defect.

The real conclusion is sharper: **the docs subdomain out-earns the entire marketing site
except `/funders`.** `docs.gap.karmahq.xyz` accounts for roughly 5% of citation share across
four pages, while six of the eight primary audience routes earn nothing. Any route-mapping
decision under AEO-06 has to account for docs already holding the citations.

## First-party integrations — connected, but they do not unblock the search KPI layer

GSC, GA4 and Sanity were connected on 2026-07-31. Two caveats materially affect the plan:

1. **Neither GSC nor GA4 surfaces data inside Profound's own reporting on this tier.** The
   Pages view offers exactly four columns (Tags, Category, Citation Share, Citation Rank); every
   remaining column is an Agent Analytics metric and is **locked**. There is no clicks,
   impressions, or average-position column anywhere. Profound describes these integrations as
   *"used to sync and share data with Agents and Sheets"* — they are agent tooling, not a native
   analytics panel.
2. **GA4 is connected as a `Personal` account; GSC as `Organization`.** The GA4 link is bound to
   one person's credentials, is not shared workspace-wide, and will break if that token lapses.
   Reconnecting GA4 at organization scope is advisable.

Consequences: the plan's "search" KPI layer must still be read from **Google Search Console
directly**, and the DEV-588 requirement for a 12-month page/query/device/country export has to
be produced from GSC's own export, not from Profound.

Profound's integration catalogue has **no Vercel connector**, so that leg of DEV-588 needs
rescoping to Agent Analytics log ingestion (locked on this tier) or dropping.

Sanity is a CMS connector and has no measurement role; it is unrelated to the AEO baseline.

## Open questions

1. ~~Website field is `karmahq.xyz` while the repo canonicalises to `https://www.karmahq.xyz`.~~
   **Resolved as a confirmed defect** — the homepage is split across two rows in Pages. Decide
   the single canonical host and make the redirect unambiguous.
2. Share of Voice reading 100% needs re-checking after a full daily cycle — see caveat above.
3. Entity-accuracy lane should be topped up from 3 to 5 prompts at the next set revision.
4. Reconnect GA4 at `Organization` scope rather than `Personal`.
5. Decide whether the citation-earning docs pages (`/overview/how-does-it-work`,
   `/how-to-guides/*`) should be adopted into the route map, or whether the primary audience
   routes should be strengthened to take those citations. This is the AEO-06 decision.

## Addendum (2026-08-03)

Point-in-time corrections from the 2026-08-03 platform audit; the body above is preserved as
written on 2026-07-31.

1. **The 9 auto-generated prompts are deleted.** The "59 / 50 over the plan limit" row above
   described the state before 2026-08-03. The nine platform-generated *"Evaluate the Blockchain
   company Karma on \<topic\>"* Sentiment prompts (one per topic except Karma vs Competitors)
   were permanently deleted on 2026-08-03 (release `R2026-08-03-e`). The active set is now
   **50 / 50 and matches `prompts.csv` v1 exactly** — verified by a full text diff of the
   Prompt Designer against the CSV: 0 CSV prompts missing from the platform, 0 platform
   prompts missing from the CSV.
2. **The post-mapping visibility reading did not persist.** The Day-0 section records
   Visibility Score jumping to 100% immediately after alias mapping, with a warning not to
   treat it as a result. That warning was correct: as of 2026-08-03 the unbranded Visibility
   Score reads a flat **0% across Jul 31 – Aug 2** and Karma is absent from the 82-asset
   Visibility Score Rank (top competitors: Candid 49.1%, Submittable 30.9%, Charity Navigator
   23.6%, Fluxx 23.6%, Instrumentl 20%). **The honest visibility baseline is 0%.**
3. **Agent Analytics is now live.** The "locked on this tier" row reflected the pre-install
   state. Profound Agent Analytics was installed via the Vercel Marketplace on the karma-devs
   team on 2026-08-03 (release `R2026-08-03-f`), the `www.karmahq.xyz` site is configured, and
   the setup page shows **"Data flow confirmed"**. Crawler-behaviour data populates within
   ~24 hours.
4. **C02/C04 are no longer controls.** The canonical consolidation shipped in `v1.8.20`
   (`R2026-08-03-c`, PR 1962) rewrote every community sub-page canonical, including the two
   cohorts designated as controls for C01/C03. `url-cohorts.csv` now reclassifies C02/C04 as
   changed and adds C17 (`/project/[projectId]`) as the shared replacement control.
5. **Eligibility timeline for the baseline window.** Five P0/P1 fixes shipped in `v1.8.19`
   (2026-07-30) and the remainder — AEO-10, AEO-15, AEO-03, AEO-09, AEO-11 — in `v1.8.20`
   (2026-08-03). The first Profound data day (2026-07-31) therefore sits *between* the two
   eligibility releases: treat **2026-08-04 as day 1** of the clean 14-day baseline window and
   the Jul 31 – Aug 3 rows as configuration-shakedown days, not baseline data.
