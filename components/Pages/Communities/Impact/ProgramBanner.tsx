"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams, useSearchParams } from "next/navigation";
import { useQueryState } from "nuqs";
import pluralize from "pluralize";
import { Skeleton } from "@/components/Utilities/Skeleton";
import { useCommunityAccent } from "@/hooks/useCommunityAccent";
import { useImpactMeasurement } from "@/hooks/useImpactMeasurement";
import { useCommunityDetails } from "@/hooks/v2/useCommunityDetails";
import formatCurrency from "@/utilities/formatCurrency";
import { getAllProgramsOfCommunity } from "@/utilities/registry/getAllProgramsOfCommunity";

const normalizeProgramId = (raw: string | null): string | undefined => {
  if (!raw) return undefined;
  return raw.includes("_") ? raw.split("_")[0] : raw;
};

export const ProgramBanner = () => {
  const { communityId } = useParams<{ communityId: string }>();
  const searchParams = useSearchParams();
  const programSelected = normalizeProgramId(searchParams.get("programId"));
  const projectSelected = searchParams.get("projectId");
  const accent = useCommunityAccent(communityId);
  const { community } = useCommunityDetails(communityId);
  const communityName = community?.details?.name ?? "this community";

  const { data: impactData, isLoading: isImpactLoading } = useImpactMeasurement({
    programId: programSelected,
    projectId: projectSelected ?? undefined,
  });

  const { data } = useQuery({
    queryKey: ["programs"],
    queryFn: () => getAllProgramsOfCommunity(communityId as string),
  });
  const programs = data?.map((program) => ({
    title: program.metadata?.title || "",
    value: program.programId || "",
  }));

  const [selectedProgramId] = useQueryState<string | null>("programId", {
    defaultValue: null,
    serialize: (value) => normalizeProgramId(value) ?? "",
    parse: (value) => normalizeProgramId(value) ?? null,
  });
  const selectedProgram = programs?.find((program) => program.value === selectedProgramId);

  const totalProjects = impactData?.stats.totalProjects ?? 0;
  const totalCategories = impactData?.stats.totalCategories ?? 0;

  const eyebrow = projectSelected
    ? selectedProgram
      ? `${selectedProgram.title} · Project filtered`
      : "All programs · Project filtered"
    : selectedProgram
      ? selectedProgram.title
      : "All programs";

  return (
    <section
      aria-label="Program impact summary"
      className="relative overflow-hidden rounded-[20px] border border-border bg-background px-7 py-3.5 md:px-9 md:py-4"
      style={{
        backgroundImage: `linear-gradient(135deg, ${accent}14, transparent 70%)`,
      }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-20 -top-20 h-[380px] w-[380px] rounded-full blur-3xl"
        style={{ background: `radial-gradient(circle, ${accent}33, transparent 70%)` }}
      />

      <div className="relative grid gap-6 md:grid-cols-[auto_1fr] md:items-center md:gap-12">
        <div>
          <div
            className="mb-2.5 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.08em]"
            style={{ color: accent }}
          >
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: accent }} aria-hidden />
            {eyebrow}
          </div>
          {isImpactLoading ? (
            <Skeleton className="h-10 w-72" />
          ) : (
            <h2 className="text-3xl md:text-4xl lg:text-[42px] font-semibold leading-[1.05] tracking-[-0.03em] text-foreground">
              <span style={{ color: accent }}>
                {formatCurrency(totalProjects)} {pluralize("project", totalProjects)}
              </span>{" "}
              <span className="text-muted-foreground">·</span>{" "}
              <span className="text-muted-foreground">
                {formatCurrency(totalCategories)} {pluralize("category", totalCategories)}
              </span>
            </h2>
          )}
        </div>
        <p className="max-w-[520px] text-[15px] leading-relaxed text-muted-foreground md:justify-self-end">
          Track the funded teams, milestones shipped, and the measurable outcomes attributed to
          programs in {communityName}.
        </p>
      </div>
    </section>
  );
};
