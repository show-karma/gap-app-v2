"use client";

import { FundingMapCard } from "@/src/features/funding-map/components/funding-map-card";
import type { FundingProgramResponse } from "@/src/features/funding-map/types/funding-program";
import { FUNDING_PLATFORM_DOMAINS } from "@/src/features/funding-map/utils/funding-platform-domains";
import { envVars } from "@/utilities/enviromentVars";
import { FUNDING_PLATFORM_PAGES } from "@/utilities/pages";

interface FundingOpportunitiesGridProps {
  programs: FundingProgramResponse[];
  communitySlug: string;
}

const getProgramPageUrl = (communitySlug: string, programId: string): string => {
  const exclusiveDomain =
    FUNDING_PLATFORM_DOMAINS[communitySlug as keyof typeof FUNDING_PLATFORM_DOMAINS];
  const domain = exclusiveDomain
    ? envVars.isDev
      ? exclusiveDomain.dev
      : exclusiveDomain.prod
    : undefined;

  return FUNDING_PLATFORM_PAGES(communitySlug, domain).PROGRAM_PAGE(programId);
};

export const FundingOpportunitiesGrid = ({
  programs,
  communitySlug,
}: FundingOpportunitiesGridProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
      {programs.map((program) => {
        const programId = program.programId || program._id?.toString();
        return (
          <FundingMapCard
            key={programId}
            program={program}
            href={programId ? getProgramPageUrl(communitySlug, programId) : undefined}
          />
        );
      })}
    </div>
  );
};
