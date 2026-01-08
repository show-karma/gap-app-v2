"use client";

import { useRouter } from "next/navigation";
import { FundingMapCard } from "@/src/features/funding-map/components/funding-map-card";
import type { FundingProgramResponse } from "@/src/features/funding-map/types/funding-program";

interface FundingOpportunitiesGridProps {
  programs: FundingProgramResponse[];
}

export const FundingOpportunitiesGrid = ({ programs }: FundingOpportunitiesGridProps) => {
  const router = useRouter();

  const handleProgramClick = (program: FundingProgramResponse) => {
    const programId = program.programId || program._id?.toString();
    router.push(`/funding-map?programId=${programId}`);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
      {programs.map((program) => (
        <FundingMapCard
          key={program.programId || program._id?.toString()}
          program={program}
          onClick={() => handleProgramClick(program)}
        />
      ))}
    </div>
  );
};
