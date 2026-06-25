"use client";

import { useScorecardBySlug } from "../hooks/use-scorecard-by-slug";
import type { PublicScorecardPayload } from "../types";
import { CategoryBar } from "./category-bar";
import { GradeHeadline } from "./grade-headline";
import { ScanProgressIndicator } from "./scan-progress-indicator";

interface PublicScorecardProps {
  readonly slug: string;
  readonly initialData?: PublicScorecardPayload;
}

export function PublicScorecard({ slug, initialData }: PublicScorecardProps) {
  const { data, isLoading, isError, refetch } = useScorecardBySlug(slug);
  const scorecard = data ?? initialData ?? null;

  if (isLoading && !scorecard) {
    return (
      <output className="flex animate-pulse flex-col gap-4 p-6" aria-label="Loading scorecard">
        <div className="h-16 w-1/2 rounded-2xl bg-zinc-200 dark:bg-zinc-800" />
        <div className="h-2 w-full rounded-full bg-zinc-200 dark:bg-zinc-800" />
        <div className="h-2 w-full rounded-full bg-zinc-200 dark:bg-zinc-800" />
        <div className="h-2 w-full rounded-full bg-zinc-200 dark:bg-zinc-800" />
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
    return null;
  }

  return (
    <article className="flex flex-col gap-6 rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <header className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <GradeHeadline
            grade={scorecard.grade}
            totalScore={scorecard.totalScore}
            orgName={scorecard.orgName}
          />
          <ScanProgressIndicator status={scorecard.status} />
        </div>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">{scorecard.url}</p>
      </header>

      {scorecard.categories.length > 0 ? (
        <section className="flex flex-col gap-3">
          {scorecard.categories.map((category) => (
            <CategoryBar key={category.category} score={category} />
          ))}
        </section>
      ) : null}

      <footer className="flex flex-col gap-1 text-xs text-zinc-500 dark:text-zinc-400">
        <span>Rubric version {scorecard.rubricVersion}</span>
        {scorecard.finishedAtComplete ? (
          <span>
            Scanned on{" "}
            {new Date(scorecard.finishedAtComplete).toLocaleString(undefined, {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          </span>
        ) : null}
      </footer>
    </article>
  );
}
