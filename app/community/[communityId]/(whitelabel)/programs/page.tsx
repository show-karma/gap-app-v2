"use client";

import { useParams } from "next/navigation";
import { ProgramFilters } from "@/features/programs/components/program-filters";
import { ProgramList } from "@/features/programs/components/program-list";
import { usePrograms } from "@/features/programs/hooks/use-programs";

export default function ProgramsPage() {
  const { communityId } = useParams<{ communityId: string }>();

  const { programs, loading, error, filters, setFilters, totalCount, refetch } =
    usePrograms(communityId);

  return (
    <div className="flex flex-col gap-5">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Programs</h1>
        <p className="mt-2 text-muted-foreground">
          Browse available funding programs and apply for grants.
        </p>
      </div>

      <div className="mb-6">
        <ProgramFilters filters={filters} onChange={setFilters} totalCount={totalCount} />
      </div>

      <ProgramList
        programs={programs}
        communityId={communityId}
        loading={loading}
        error={error}
        onRetry={refetch}
      />
    </div>
  );
}
