# Evidence-to-repository-work triage rules

How Profound (Answer Engine Insights, Citations, Agent Analytics) and GSC evidence translates
into repository work. Documented per DEV-602; each rule cites the precedent where it has
already been applied in this program. Apply these before inventing a new response to any
finding.

## The five translations

### 1. Karma page cited, but stale or incorrect
**→ Fix the visible facts and metadata, from an approved source only.**
Never leave a wrong claim in front of answer engines; never "fix" it with an unverifiable one.
*Precedent:* the /for-agents tool catalog claimed tools were callable "without authentication";
`requireMcpAuth` proved otherwise and the copy was corrected from code (PR #1973).

### 2. Competitor cited where Karma has an adequate page
**→ Improve the page: direct answer, evidence, server rendering, title/meta, internal links,
structured data.** Not a new route — a better existing one, under a measurement contract.
*Precedent:* the AEO-12 slate (experiments E1–E6, `experiments.md`) — selected exactly this way
from Citations (candid/foundant/sopact winning Karma's categories) + GSC.

### 3. No suitable Karma page for a demanded prompt/query
**→ Open a new-route issue** carrying: prompt volume, current citation winners, the intended
direct answer, verifiable source facts, and acceptance tests. A new route ships only with
Profound/GSC evidence, a distinct unmet task, and verifiable facts (plan rule).
*Precedent:* none yet — no lane has demonstrated an unmet task that an existing route cannot
answer. This rule exists so the bar is already set when one does.

### 4. AI crawlers miss or fail on a route
**→ Inspect in order: status, robots, canonical, rendering (no-JS visibility), latency,
internal links.** File as an eligibility issue, not a content issue.
*Precedent:* the entire eligibility wave — AEO-01/02/16 (rendering), AEO-03 (canonicals/sitemap),
AEO-07 (robots), AEO-11 (status-during-outage), DEV-612 (hidden-Suspense rendering class,
quantified by the crawler's `no-js` mode before any fix was attempted).

### 5. A third-party source controls the narrative
**→ Record as an external dependency. No outreach under this plan.**
*Precedent:* reddit.com is a top-3 cited domain in Karma's categories; recorded here as an
external dependency, deliberately not acted on.

## Guardrails

* **Never auto-publish from Profound Agents/Aim.** All content changes go through pull requests
  with human copy review (experiment PRs open as drafts until reviewed).
* **Corporate positioning, legal, or PR decisions become `external decision required` issues**,
  not work performed here. *Precedents:* DEV-613 (first-party data page dataset), the
  training-crawler policy carve-out in AEO-07, and the S3 apex-redirect fix (AWS ownership).
* **Findings recorded while an experiment is in flight** attach to the experiment's release row
  in `releases.csv`, so evidence and change stay traceable to each other.
