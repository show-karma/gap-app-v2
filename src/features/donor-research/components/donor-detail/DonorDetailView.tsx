"use client";

import { useDonorHandle } from "@/hooks/useDonorHandles";
import { Link } from "@/src/components/navigation/Link";
import { PAGES } from "@/utilities/pages";
import { DonorResearchLoading } from "../common/DonorResearchLoading";
import { DonorDetailHeader } from "./DonorDetailHeader";
import { HandleNotesSection } from "./HandleNotesSection";
import { PersonaEditor } from "./PersonaEditor";

interface DonorDetailViewProps {
  handleId: string;
}

/**
 * Donor handle detail page (U7). Two clearly separated, fixed-order sections:
 * private "Notes" and the research "Persona source" editor. Every data branch
 * is handled explicitly — loading, error, and content — never `null`.
 */
export function DonorDetailView({ handleId }: DonorDetailViewProps) {
  const handleQuery = useDonorHandle(handleId);

  if (handleQuery.isLoading) {
    return <DonorResearchLoading label="Loading donor handle…" />;
  }

  if (handleQuery.isError || !handleQuery.data) {
    return (
      <div className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-12">
        <p className="text-sm text-red-600 dark:text-red-400">
          We couldn't load this donor handle. It may not exist, or you may not have access.
        </p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => handleQuery.refetch()}
            className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted"
          >
            Retry
          </button>
          <Link
            href={PAGES.DONOR_RESEARCH.INDEX}
            className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted"
          >
            Back to donor handles
          </Link>
        </div>
      </div>
    );
  }

  const handle = handleQuery.data;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8 px-4 py-8">
      <DonorDetailHeader handle={handle} />
      <HandleNotesSection handle={handle} />
      <section className="flex flex-col gap-2">
        <h2 className="text-base font-semibold">Persona source — refined and used by research</h2>
        <PersonaEditor handleId={handleId} />
      </section>
    </div>
  );
}
