"use client";

import { useScan } from "../hooks/use-scan";
import { CategoryBar } from "./category-bar";
import { ContactCta } from "./contact-cta";
import { EvidenceList } from "./evidence-list";
import { GradeHeadline } from "./grade-headline";
import { ReportGenerating } from "./report-generating";
import { ScanProgressIndicator } from "./scan-progress-indicator";
import { ScannerViewTracker } from "./scanner-view-tracker";
import { TopFixesList } from "./top-fixes-list";

interface LoggedInDetailProps {
  readonly scanId: string;
  readonly userEmail?: string;
}

export function LoggedInDetail({ scanId, userEmail }: LoggedInDetailProps) {
  const { data, isError, refetch } = useScan(scanId);

  // No envelope yet. A just-created scan can 404 briefly before its record is
  // queryable; the query stays pending (retrying) through that window, so we
  // show the generating view rather than an error until retries are exhausted.
  if (!data) {
    if (isError) {
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
    return <ReportGenerating />;
  }

  // Envelope exists but the scan is still running — keep the progress view
  // until it reaches a terminal status.
  if (data.status && data.status !== "complete" && data.status !== "failed") {
    return <ReportGenerating orgName={data.orgName ?? null} />;
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
            grade={data.grade ?? null}
            totalScore={data.totalScore ?? null}
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
