"use client";

import { ArrowLeft } from "lucide-react";
import { Link } from "@/src/components/navigation/Link";
import { PAGES } from "@/utilities/pages";
import { CriteriaInputPanel } from "../criteria-input/CriteriaInputPanel";

interface NewReportViewProps {
  /** From `/new?handle=<id>` — preselects a donor handle (spec 2.3). */
  initialDonorHandleId?: string;
}

/**
 * "New report" page content (redesign P1, spec 2.3). Hosts the existing
 * `CriteriaInputPanel` — form state, persona prefill, discard-guard,
 * validation, and the create mutation are all unchanged — under a
 * single-column `max-w-3xl` header.
 */
export function NewReportView({ initialDonorHandleId }: NewReportViewProps) {
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-xl">
          <Link
            className="mb-2 inline-flex w-fit items-center gap-1.5 text-[12.5px] font-medium text-sf-muted transition-colors hover:text-sf-heading"
            href={PAGES.DONOR_RESEARCH.INDEX}
          >
            <ArrowLeft aria-hidden="true" className="h-3.5 w-3.5" />
            Reports
          </Link>
          <h1 className="text-2xl font-semibold tracking-[-0.02em] text-sf-heading">New report</h1>
          <p className="mt-1 max-w-xl text-[13.5px] text-sf-muted">
            Describe what you're researching. We'll return ranked nonprofit recommendations with EIN
            and mailing address on every row.
          </p>
        </div>
      </header>

      <CriteriaInputPanel initialDonorHandleId={initialDonorHandleId} />
    </div>
  );
}
