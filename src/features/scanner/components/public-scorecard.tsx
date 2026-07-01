"use client";

import { useScorecardBySlug } from "../hooks/use-scorecard-by-slug";
import type { PublicScorecardPayload } from "../types";
import { CategoryBar } from "./category-bar";
import { MembersAreaCta } from "./members-area-cta";
import { ScanProgressIndicator } from "./scan-progress-indicator";
import { ScoreHero } from "./score-hero";

interface PublicScorecardProps {
  readonly slug: string;
  readonly initialData?: PublicScorecardPayload;
}

export function PublicScorecard({ slug, initialData }: PublicScorecardProps) {
  const { data, isLoading, isError, refetch } = useScorecardBySlug(slug);
  const scorecard = data ?? initialData ?? null;

  if (isLoading && !scorecard) {
    return (
      <output className="flex animate-pulse flex-col gap-8 py-8" aria-label="Loading scorecard">
        <div className="h-32 w-3/4 rounded-2xl bg-zinc-100 dark:bg-zinc-900" />
        <div className="flex flex-col gap-6">
          <div className="h-2 w-full rounded-full bg-zinc-100 dark:bg-zinc-900" />
          <div className="h-2 w-full rounded-full bg-zinc-100 dark:bg-zinc-900" />
          <div className="h-2 w-full rounded-full bg-zinc-100 dark:bg-zinc-900" />
        </div>
      </output>
    );
  }

  if (isError && !scorecard) {
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

  if (!scorecard) {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-6 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-400">
        No scorecard available for this URL yet.
      </div>
    );
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

      {scorecard.status && scorecard.status !== "complete" ? (
        <div className="flex">
          <ScanProgressIndicator status={scorecard.status} />
        </div>
      ) : null}

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
          Log in to view the prioritized fix list, donate-flow walkthrough notes, and the full
          rubric breakdown for this scan.
        </p>
        <MembersAreaCta slug={slug} scanId={scorecard.scanId ?? null} />
      </aside>
    </article>
  );
}
