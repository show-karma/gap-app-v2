import { useQuery } from "@tanstack/react-query";
import { useQueryState } from "nuqs";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-hot-toast";
import type { GrantProgram } from "@/components/Pages/ProgramRegistry/ProgramList";
import { usePendingVerificationMilestones } from "@/hooks/usePendingVerificationMilestones";
import { milestoneReportService } from "@/services/milestone-report.service";
import { downloadCommunityReport } from "@/utilities/downloadReports";
import { normalizeProgramId } from "@/utilities/normalizeProgramId";
import { QUERY_KEYS } from "@/utilities/queryKeys";
import { validateProgramIdentifiers } from "@/utilities/validators";

type TabId = "pending-verification" | "stats";
type ReviewerFilterMode = "mine" | "all";

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

export type { Report, ReportAPIResponse, ReviewerFilterMode, TabId };

export const itemsPerPage = 50;

const programIdsQueryOptions = {
  defaultValue: [] as string[],
  serialize: (value: string[] | null) => {
    const normalized = value?.map(normalizeProgramId) ?? [];
    return normalized.join(",");
  },
  parse: (value: string) => {
    if (!value) return null;
    return value.split(",").map(normalizeProgramId);
  },
};

interface UseReportPageDataOptions {
  communityId: string;
  grantPrograms: GrantProgram[];
  hasAccess: boolean;
  isAuthorized: boolean;
  reviewerPrograms: Array<{ programId: string }>;
  currentUserAddress?: string;
  isMilestoneReviewer?: boolean;
}

export function useReportPageData({
  communityId,
  grantPrograms,
  hasAccess,
  isAuthorized,
  reviewerPrograms,
  currentUserAddress,
  isMilestoneReviewer = false,
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
  const [selectedProgramIds, setSelectedProgramIds] = useQueryState(
    "programIds",
    programIdsQueryOptions
  );

  // Reviewer filter: milestone reviewers default to "mine", admins default to "all"
  const [reviewerFilter, setReviewerFilter] = useState<ReviewerFilterMode>(() =>
    isMilestoneReviewer && !hasAccess ? "mine" : "all"
  );
  const hasUserSelectedFilter = useRef(false);

  // Sync reviewerFilter when isMilestoneReviewer/hasAccess resolve after mount
  useEffect(() => {
    if (hasUserSelectedFilter.current) return;
    const computed: ReviewerFilterMode = isMilestoneReviewer && !hasAccess ? "mine" : "all";
    setReviewerFilter(computed);
  }, [isMilestoneReviewer, hasAccess]);

  // Reset user's manual filter selection when context changes
  useEffect(() => {
    hasUserSelectedFilter.current = false;
  }, [communityId, currentUserAddress]);

  const effectiveReviewerAddress = useMemo(() => {
    if (reviewerFilter === "mine" && currentUserAddress) {
      return currentUserAddress;
    }
    return undefined;
  }, [reviewerFilter, currentUserAddress]);

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

  const {
    data,
    isLoading,
    error: statsError,
  } = useQuery<ReportAPIResponse>({
    queryKey: QUERY_KEYS.COMMUNITY.REPORT_MILESTONES(
      communityId,
      statsPage,
      sortBy,
      sortOrder,
      effectiveProgramIds
    ),
    queryFn: () =>
      milestoneReportService.getReport(
        communityId,
        statsPage,
        itemsPerPage,
        sortBy,
        sortOrder,
        effectiveProgramIds
      ),
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
    reviewerAddress: effectiveReviewerAddress,
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
      selectedProgramIds:
        normalizedProgramIds.length > 0
          ? normalizedProgramIds
          : effectiveProgramIds.length > 0
            ? effectiveProgramIds
            : undefined,
    });
  }, [communityId, sortBy, normalizedProgramIds, effectiveProgramIds]);

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

  const handleReviewerFilterChange = useCallback((mode: ReviewerFilterMode) => {
    hasUserSelectedFilter.current = true;
    setReviewerFilter(mode);
    setPendingPage(1);
  }, []);

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
    setStatsPage,
    pendingPage,
    setPendingPage,
    sortBy,
    sortOrder,
    handleSort,
    stats: data?.stats,
    isStatsLoading: isLoading,
    statsError,
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
    reviewerFilter,
    handleReviewerFilterChange,
  };
}
