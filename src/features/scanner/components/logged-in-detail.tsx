"use client";

import { useScan } from "../hooks/use-scan";
import { CategoryBar } from "./category-bar";
import { ContactCta } from "./contact-cta";
import { EvidenceList } from "./evidence-list";
import { GradeHeadline } from "./grade-headline";
import { ScanProgressIndicator } from "./scan-progress-indicator";
import { ScannerViewTracker } from "./scanner-view-tracker";
import { TopFixesList } from "./top-fixes-list";

interface LoggedInDetailProps {
  readonly scanId: string;
  readonly userEmail?: string;
}

export function LoggedInDetail({ scanId, userEmail }: LoggedInDetailProps) {
  const { data, isLoading, isError, refetch } = useScan(scanId);

  if (isLoading) {
    return (
      <output
        className="flex animate-pulse flex-col gap-4 rounded-3xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900"
        aria-label="Loading scan detail"
        aria-busy="true"
      >
        <div className="h-16 w-1/2 rounded-2xl bg-zinc-200 dark:bg-zinc-800" />
        <div className="h-2 w-full rounded-full bg-zinc-200 dark:bg-zinc-800" />
        <div className="h-2 w-full rounded-full bg-zinc-200 dark:bg-zinc-800" />
      </output>
    );
  }

  if (isError || !data) {
    return (
      <div className="flex flex-col gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-6 text-rose-900 dark:border-rose-900/40 dark:bg-rose-950/40 dark:text-rose-100">
        <h2 className="text-lg font-semibold">We could not load this scan</h2>
        <p className="text-sm">
          You may not have access to this scan, or it may have been deleted.
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

  const categoryScores = data.categoryScores ?? [];
  const topFixes = data.topFixes ?? [];
  const evidence = data.evidence ?? [];

  return (
    <div className="flex flex-col gap-6">
      <ScannerViewTracker
        variant="detail"
        scanId={data.scanId}
        slug={data.slug}
        grade={data.grade}
        totalScore={data.totalScore}
        orgName={data.orgName ?? null}
        viewerIsOwner={data.viewerIsOwner}
      />
      <article className="flex flex-col gap-6 rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <header className="flex items-start justify-between gap-3">
          <GradeHeadline
            grade={data.grade}
            totalScore={data.totalScore}
            orgName={data.orgName ?? null}
          />
          {data.status ? <ScanProgressIndicator status={data.status} /> : null}
        </header>

        {categoryScores.length > 0 ? (
          <section className="flex flex-col gap-3">
            {categoryScores.map((category) => (
              <CategoryBar key={category.category} score={category} />
            ))}
          </section>
        ) : null}
      </article>

      <TopFixesList fixes={topFixes} />

      {topFixes.length > 0 ? (
        <ContactCta
          sourceTag="fix-help"
          headline="Need help with these fixes?"
          subline="Our team can implement the fixes for you, or point you to a partner who can."
          defaultEmail={userEmail}
          defaultOrgName={data.orgName ?? undefined}
          scanId={data.scanId}
          buttonLabel="Contact us"
        />
      ) : null}

      {data.walkthroughNotes ? (
        <section className="flex flex-col gap-2 rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
            Donate-flow walkthrough
          </h3>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">{data.walkthroughNotes}</p>
        </section>
      ) : null}

      <EvidenceList evidence={evidence} />
    </div>
  );
}
