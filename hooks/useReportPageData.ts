import { useQuery } from "@tanstack/react-query";
import { useQueryState } from "nuqs";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import type { GrantProgram } from "@/components/Pages/ProgramRegistry/ProgramList";
import { usePendingVerificationMilestones } from "@/hooks/usePendingVerificationMilestones";
import { downloadCommunityReport } from "@/utilities/downloadReports";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";
import { normalizeProgramId } from "@/utilities/normalizeProgramId";
import { validateProgramIdentifiers } from "@/utilities/validators";

type TabId = "pending-verification" | "stats";

interface Report {
  _id: {
    $oid: string;
  };
  grantUid: string;
  grantTitle: string;
  projectUid: string;
  projectTitle: string;
  programId?: string;
  totalMilestones: number;
  pendingMilestones: number;
  completedMilestones: number;
  isGrantCompleted?: boolean;
  proofOfWorkLinks: string[];
  evaluations: Evaluation[] | null | undefined;
  projectSlug: string;
}

interface Evaluation {
  _id: string;
  rating: number;
  reasons: string[];
}

export type MilestoneCompletion = Pick<
  Report,
  "totalMilestones" | "pendingMilestones" | "completedMilestones" | "isGrantCompleted"
>;

interface ReportAPIResponse {
  data: Report[];
  pageInfo: {
    totalItems: number;
    page: number;
    pageLimit: number;
  };
  uniqueProjectCount: number;
  stats: {
    totalGrants: number;
    totalProjectsWithMilestones: number;
    totalMilestones: number;
    totalCompletedMilestones: number;
    totalPendingMilestones: number;
    percentageProjectsWithMilestones: number;
    percentageCompletedMilestones: number;
    percentagePendingMilestones: number;
    proofOfWorkLinks: string[];
  };
}

export type { Report, ReportAPIResponse, TabId };

const fetchReports = async (
  communityId: string,
  page: number,
  pageLimit: number,
  sortBy = "totalMilestones",
  sortOrder = "desc",
  selectedProgramIds: string[] = []
) => {
  const normalizedProgramIds = selectedProgramIds.map(normalizeProgramId);
  const queryProgramIds = normalizedProgramIds.join(",");
  const encodedProgramIds = encodeURIComponent(queryProgramIds);
  const [data] = await fetchData<ReportAPIResponse>(
    `${INDEXER.COMMUNITY.REPORT.GET(communityId)}?limit=${pageLimit}&page=${page}&sort=${sortBy}&sortOrder=${sortOrder}${
      queryProgramIds ? `&programIds=${encodedProgramIds}` : ""
    }`
  );
  return (
    data || {
      data: [],
      pageInfo: { totalItems: 0, page: 1, pageLimit },
      uniqueProjectCount: 0,
      stats: {
        totalGrants: 0,
        totalProjectsWithMilestones: 0,
        totalMilestones: 0,
        totalCompletedMilestones: 0,
        totalPendingMilestones: 0,
        percentageProjectsWithMilestones: 0,
        percentageCompletedMilestones: 0,
        percentagePendingMilestones: 0,
        proofOfWorkLinks: [],
      },
    }
  );
};

export const itemsPerPage = 50;

interface UseReportPageDataOptions {
  communityId: string;
  grantPrograms: GrantProgram[];
  hasAccess: boolean;
  isAuthorized: boolean;
  reviewerPrograms: Array<{ programId: string }>;
}

export function useReportPageData({
  communityId,
  grantPrograms,
  hasAccess,
  isAuthorized,
  reviewerPrograms,
}: UseReportPageDataOptions) {
  const [activeTab, setActiveTab] = useQueryState<TabId>("tab", {
    defaultValue: "pending-verification",
    parse: (v) => (v === "stats" ? "stats" : "pending-verification"),
    serialize: (v) => v,
  });
  const [statsPage, setStatsPage] = useState(1);
  const [pendingPage, setPendingPage] = useState(1);
  const [sortBy, setSortBy] = useState("totalMilestones");
  const [sortOrder, setSortOrder] = useState("desc");
  const [selectedProgramIds, setSelectedProgramIds] = useQueryState("programIds", {
    defaultValue: [] as string[],
    serialize: (value) => {
      const normalized = value?.map(normalizeProgramId) ?? [];
      return normalized.join(",");
    },
    parse: (value) => {
      if (!value) return null;
      return value.split(",").map(normalizeProgramId);
    },
  });

  const reviewerProgramIds = useMemo(() => {
    if (!reviewerPrograms || reviewerPrograms.length === 0) return new Set<string>();
    return new Set(reviewerPrograms.map((p) => normalizeProgramId(p.programId)));
  }, [reviewerPrograms]);

  const programOptions = useMemo(() => {
    const allPrograms = grantPrograms
      .filter(
        (program): program is typeof program & { programId: string } =>
          typeof program.programId === "string" && program.programId.length > 0
      )
      .map((program) => {
        const value = normalizeProgramId(program.programId);
        const title = program.metadata?.title?.trim();
        const label = title ? `${title} (${value})` : value;
        return { value, label };
      });

    if (hasAccess) {
      return allPrograms;
    }
    return allPrograms.filter((program) => reviewerProgramIds.has(program.value));
  }, [grantPrograms, hasAccess, reviewerProgramIds]);

  const valueToLabelMap = useMemo(() => {
    return new Map(programOptions.map(({ value, label }) => [value, label]));
  }, [programOptions]);

  const labelToValueMap = useMemo(() => {
    return new Map(programOptions.map(({ value, label }) => [label, value]));
  }, [programOptions]);

  const normalizedProgramIds = useMemo(() => {
    const ids = selectedProgramIds ?? [];
    if (ids.length === 0) return [];
    const normalizedIds = ids.map(normalizeProgramId);
    const validation = validateProgramIdentifiers(normalizedIds);
    return validation.validIds.map(({ programId }) => programId);
  }, [selectedProgramIds]);

  useEffect(() => {
    const ids = selectedProgramIds ?? [];
    if (ids.length > 0) {
      const validation = validateProgramIdentifiers(ids);
      if (validation.errors.length > 0) {
        toast.error("Invalid program IDs detected and filtered out. Please check the URL.", {
          duration: 5000,
        });
      }
    }
  }, [selectedProgramIds]);

  const selectedProgramLabels = useMemo(() => {
    return normalizedProgramIds.map((id) => valueToLabelMap.get(id) ?? id);
  }, [normalizedProgramIds, valueToLabelMap]);

  const programLabels = useMemo(() => programOptions.map(({ label }) => label), [programOptions]);

  const effectiveProgramIds = useMemo(() => {
    if (normalizedProgramIds.length > 0) {
      if (!hasAccess && reviewerProgramIds.size > 0) {
        return normalizedProgramIds.filter((id) => reviewerProgramIds.has(id));
      }
      return normalizedProgramIds;
    }
    if (!hasAccess && reviewerProgramIds.size > 0) {
      return Array.from(reviewerProgramIds);
    }
    return normalizedProgramIds;
  }, [normalizedProgramIds, hasAccess, reviewerProgramIds]);

  const { data, isLoading } = useQuery<ReportAPIResponse>({
    queryKey: ["reportMilestones", communityId, statsPage, sortBy, sortOrder, effectiveProgramIds],
    queryFn: async () =>
      fetchReports(communityId, statsPage, itemsPerPage, sortBy, sortOrder, effectiveProgramIds),
    enabled: Boolean(communityId) && isAuthorized,
  });

  const {
    data: pendingMilestones,
    pageInfo: pendingPageInfo,
    isLoading: isPendingLoading,
    error: pendingError,
  } = usePendingVerificationMilestones({
    communityId,
    page: pendingPage,
    pageLimit: itemsPerPage,
    programIds: effectiveProgramIds,
    enabled: isAuthorized,
  });

  const reports = data?.data;
  const totalItems = data?.pageInfo?.totalItems ?? 0;
  const pendingTotalItems = pendingPageInfo?.totalItems ?? 0;

  const handleSort = useCallback(
    (newSort: string) => {
      if (newSort === sortBy) {
        setSortOrder(sortOrder === "asc" ? "desc" : "asc");
      } else {
        setSortBy(newSort);
        setSortOrder("desc");
      }
      setStatsPage(1);
    },
    [sortBy, sortOrder]
  );

  const handleExportCSV = useCallback(() => {
    downloadCommunityReport({
      communityId,
      sortBy,
      selectedProgramIds: normalizedProgramIds.length > 0 ? normalizedProgramIds : undefined,
    });
  }, [communityId, sortBy, normalizedProgramIds]);

  const handleProgramSelect = useCallback(
    (label: string) => {
      const programId = labelToValueMap.get(label) ?? label;
      const current = normalizedProgramIds;
      const newIds = current.includes(programId)
        ? current.filter((item) => item !== programId)
        : [...current, programId];
      setSelectedProgramIds(newIds);
      setStatsPage(1);
      setPendingPage(1);
    },
    [normalizedProgramIds, labelToValueMap, setSelectedProgramIds]
  );

  const handleProgramClear = useCallback(() => {
    setSelectedProgramIds([]);
    setStatsPage(1);
    setPendingPage(1);
  }, [setSelectedProgramIds]);

  const isFullyCompleted = useCallback((report: MilestoneCompletion) => {
    const allMilestonesComplete =
      report.totalMilestones > 0 &&
      report.pendingMilestones === 0 &&
      report.completedMilestones === report.totalMilestones;
    const grantCompleted = report.isGrantCompleted === true;
    return allMilestonesComplete || grantCompleted;
  }, []);

  return {
    activeTab,
    setActiveTab,
    statsPage,
    setStatsPage: (page: number) => setStatsPage(page),
    pendingPage,
    setPendingPage: (page: number) => setPendingPage(page),
    sortBy,
    sortOrder,
    handleSort,
    stats: data?.stats,
    isStatsLoading: isLoading,
    reports,
    totalItems,
    pendingMilestones,
    isPendingLoading,
    pendingError,
    pendingTotalItems,
    handleExportCSV,
    handleProgramSelect,
    handleProgramClear,
    programLabels,
    selectedProgramLabels,
    isFullyCompleted,
  };
}
