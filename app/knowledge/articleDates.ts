/**
 * Publication dates for the static knowledge-base articles under `app/knowledge/`.
 *
 * These articles are not CMS-backed (unlike `/blog/[slug]`, which carries Sanity's
 * `publishedAt`), so the only truthful per-article record is the commit that first
 * added the page to the repository. Each value below is the UTC calendar date of
 * that commit, recovered with:
 *
 *   gh api "repos/show-karma/gap-app-v2/commits?path=app/knowledge/<slug>/page.tsx&per_page=100" \
 *     --jq '.[] | .sha[0:9] + " " + .commit.author.date' | tail -1
 *
 * (The GitHub API is authoritative here: local clones of this repo are often
 * shallow, and grafted commits report every file as newly added.)
 *
 * Source commits:
 *   a83858e12 "Add knowledge pages"    2026-01-06T22:57:57Z -> 2026-01-06
 *   363e897ea "checkin missing files"  2026-01-07T22:57:37Z -> 2026-01-07
 *   840b81144 "more knowledge pages"   2026-01-14T07:12:20Z -> 2026-01-14
 *
 * Articles added after the provenance map exists record the date of the
 * commit that adds them:
 *   nonprofit-due-diligence  added 2026-08-04 (moved from /nonprofit-research)
 *
 * Rules for maintaining this map:
 *   - Every date must be copied from a real commit. Never approximate, backfill,
 *     or stamp "today" onto an existing article.
 *   - Adding a knowledge page without adding it here fails the build, because the
 *     page calls `getKnowledgeArticleDate` at module scope.
 *   - There is deliberately no DERIVED modified-date map. Git last-touch dates on
 *     these files are merge/mechanical artifacts, so any `dateModified` derived
 *     from them would fabricate freshness — the same reasoning that keeps
 *     `lastModified` off these pages in `app/sitemaps/static/sitemap.ts`.
 *     `KNOWLEDGE_ARTICLE_UPDATED_DATES` below is the one truthful exception:
 *     hand-recorded dates of substantive content revisions, written by the PR
 *     that made the revision. Mechanical edits (imports, formatting, link
 *     constants) never update it.
 */
export const KNOWLEDGE_ARTICLE_DATES: Readonly<Record<string, string>> = {
  "ai-grant-evaluation": "2026-01-07",
  "dao-grant-milestones": "2026-01-06",
  "funding-distribution-mechanisms": "2026-01-07",
  "grant-accountability": "2026-01-06",
  "grant-document-signing": "2026-01-07",
  "grant-fund-disbursement": "2026-01-07",
  "grant-kyc": "2026-01-07",
  "grant-lifecycle": "2026-01-06",
  "how-funders-use-project-profiles": "2026-01-14",
  "impact-measurement": "2026-01-07",
  "impact-verification": "2026-01-06",
  "manual-vs-platform-grant-tracking": "2026-01-06",
  "milestones-vs-impact": "2026-01-06",
  "nonprofit-due-diligence": "2026-08-04",
  "onchain-project-profiles": "2026-01-14",
  "onchain-reputation": "2026-01-06",
  "project-profiles": "2026-01-14",
  "project-profiles-as-resumes": "2026-01-14",
  "project-profiles-software-vs-nonsoftware": "2026-01-14",
  "project-registry": "2026-01-07",
  "project-reputation": "2026-01-06",
  "project-updates-and-reputation": "2026-01-14",
  "reputation-compounding": "2026-01-06",
  "whitelabel-funding-platforms": "2026-01-07",
  "why-grant-programs-fail": "2026-01-06",
  "why-grantees-need-project-profiles": "2026-01-14",
};

/**
 * Dates of substantive content revisions, recorded by hand in the PR that made
 * the revision — the truthful counterpart of the publication map above.
 *
 * Rules:
 *   - An entry is added (or moved forward) ONLY when a PR materially rewrites
 *     the article's content, and the date is the day that revision was
 *     authored. Never derive an entry from git metadata.
 *   - Most articles are absent on purpose: absence means "not substantively
 *     revised since publication", and the page then renders its published
 *     date only.
 *
 * Revisions:
 *   "ai-grant-evaluation" 2026-08-04 — rewritten with direct answers on AI
 *   scoring, human oversight, and reviewer calibration (DEV-595 experiment E6).
 */
export const KNOWLEDGE_ARTICLE_UPDATED_DATES: Readonly<Record<string, string>> = {
  "ai-grant-evaluation": "2026-08-04",
};

/**
 * Returns the recorded revision date (`YYYY-MM-DD`, UTC) for a knowledge
 * article, or undefined when the article has not been substantively revised
 * since publication.
 */
export function getKnowledgeArticleUpdatedDate(slug: string): string | undefined {
  return KNOWLEDGE_ARTICLE_UPDATED_DATES[slug];
}

/**
 * Returns the recorded publication date (`YYYY-MM-DD`, UTC) for a knowledge article.
 * Throws for an unrecorded slug so a new page can never ship with a missing or
 * invented date.
 */
export function getKnowledgeArticleDate(slug: string): string {
  const publishedAt = KNOWLEDGE_ARTICLE_DATES[slug];

  if (!publishedAt) {
    throw new Error(
      `No publication date recorded for knowledge article "${slug}". Add its first-commit date to KNOWLEDGE_ARTICLE_DATES in app/knowledge/articleDates.ts.`
    );
  }

  return publishedAt;
}
