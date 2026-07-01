"use client";

import { useScorecardBySlug } from "../hooks/use-scorecard-by-slug";
import type { PublicScorecardPayload } from "../types";
import { CategoryBar } from "./category-bar";
import { MembersAreaCta } from "./members-area-cta";
import { ReportGenerating } from "./report-generating";
import { ScoreHero } from "./score-hero";

interface PublicScorecardProps {
  readonly slug: string;
  readonly initialData?: PublicScorecardPayload;
}

export function PublicScorecard({ slug, initialData }: PublicScorecardProps) {
  const { data, isError, refetch } = useScorecardBySlug(slug);
  const scorecard = data ?? initialData ?? null;

  // No payload yet. While the query is still retrying the pre-scored 404
  // window it stays pending (not `isError`), so a just-submitted scan reads as
  // "generating" rather than "not found". Only once retries are exhausted does
  // `isError` flip and we surface the genuine unpublished / wrong-URL error.
  if (!scorecard) {
    if (isError) {
      return (
        <div className="flex flex-col gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-6 text-rose-900 dark:border-rose-900/40 dark:bg-rose-950/40 dark:text-rose-100">
          <h2 className="text-lg font-semibold">We could not load this scorecard</h2>
          <p className="text-sm">
            The scorecard may have been unpublished by the organization, or the URL may be wrong.
          </p>
          <button
            type="button"
            className="self-start rounded-md border border-rose-300 px-3 py-1 text-sm font-medium hover:bg-rose-100 dark:border-rose-700 dark:hover:bg-rose-900/60"
            onClick={() => refetch()}
          >
            Try again
          </button>
        </div>
      );
    }
    return <ReportGenerating />;
  }

  // Scored record exists but the scan is still running its remaining tiers —
  // keep the progress view until it reaches a terminal status.
  if (scorecard.status && scorecard.status !== "complete" && scorecard.status !== "failed") {
    return <ReportGenerating orgName={scorecard.orgName ?? null} />;
  }

  const categoryScores = scorecard.categoryScores ?? [];

  return (
    <article className="flex flex-col gap-12 py-2">
      <ScoreHero
        totalScore={scorecard.totalScore}
        grade={scorecard.grade}
        orgName={scorecard.orgName ?? null}
        url={scorecard.url ?? null}
        scannedAt={scorecard.finishedAtComplete ?? null}
      />

      {categoryScores.length > 0 ? (
        <section className="flex flex-col gap-6" aria-label="Category scores">
          {categoryScores.map((category) => (
            <CategoryBar key={category.category} score={category} />
          ))}
        </section>
      ) : null}

      {scorecard.rubricVersion ? (
        <footer className="flex items-baseline gap-3 border-t border-zinc-200 pt-4 font-mono text-[11px] uppercase tracking-wider text-zinc-400 dark:border-zinc-800 dark:text-zinc-500">
          <span>Rubric {scorecard.rubricVersion}</span>
          <span aria-hidden>&middot;</span>
          <span>Karma AI-Readiness Checker</span>
        </footer>
      ) : null}

      {/* Members-area upsell lives inside the success branch so it never
          renders over a failed/loading/absent scorecard (an "Open full
          report" CTA on a "could not load" page is misleading). */}
      <aside className="flex flex-col gap-3 border-t border-zinc-200 pt-8 dark:border-zinc-800">
        <span className="font-mono text-[11px] uppercase tracking-wider text-zinc-500">
          Members area
        </span>
        <h2 className="font-display text-2xl tracking-tight text-zinc-900 dark:text-zinc-50">
          See the top fixes and per-check evidence
        </h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          The full report adds the prioritized fix list, donate-flow walkthrough notes, and the
          complete rubric breakdown for this scan.
        </p>
        <MembersAreaCta slug={slug} initialData={scorecard} />
      </aside>
    </article>
  );
}
